import {
  combineWeek,
  padelWeek,
  runningWeek,
  timetableWeek,
  todoWeek,
  type WeekEvent,
} from "@/lib/home/week";
import { checkDashboardStorage, withTimeout } from "@/lib/home/refresh";
import { getSupabase } from "@/lib/supabase/client";
import type { PadelMatch } from "@/types/padel";
import type { Run } from "@/types/running";
import { timetableService } from "./timetable.service";
import { todoService } from "./todo.service";

export interface WeekResult {
  events: WeekEvent[];
  errors: string[];
}
function saved<T>(key: string): T | null {
  checkDashboardStorage([key]);
  const value = window.localStorage.getItem(`campus-match:${key}`);
  return value === null ? null : (JSON.parse(value) as T);
}
/** Read-only adapter: no migration, generated tasks, public-match-as-booking, or writes. */
export async function loadWeek(
  from: string,
  to: string,
  userId: string | null,
  mode: "accounts" | "demo",
  signal?: AbortSignal,
): Promise<WeekResult> {
  const sources: [string, () => Promise<WeekEvent[]>][] = [
    [
      "Timetable",
      async () => {
        checkDashboardStorage(["timetable"]);
        return timetableWeek(await timetableService.load(), from, to);
      },
    ],
    [
      "To-dos",
      async () => {
        checkDashboardStorage(["todo-todos-v2", "todo-lists-v2", "todo-labels-v2"]);
        // Signed in, your tasks are saved in your account (Supabase), not in this browser, so
        // an empty browser must not hide them (new device, cleared data, new account).
        // Without an account, nothing saved yet means no tasks: never show the example ones.
        const signedIn = mode === "accounts" && userId !== null;
        if (!signedIn && saved<unknown[]>("todo-todos-v2") === null) return [];
        return todoWeek(await todoService.listTodos());
      },
    ],
  ];
  if (userId) {
    sources.push([
      "Padel",
      async () => {
        if (mode === "demo") return padelWeek(saved<PadelMatch[]>("padel-matches") ?? [], userId);
        // The standard listMatches deliberately omits past days. This read-only week query
        // includes earlier days of this week and filters through confirmed player rows.
        const { data, error } = await getSupabase()
          .from("padel_matches")
          .select("id,date,time,location,padel_match_players!inner(user_id)")
          .gte("date", from)
          .lte("date", to)
          .eq("padel_match_players.user_id", userId);
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: `padel:${row.id}`,
          title: "Padel",
          date: row.date,
          time: row.time,
          kind: "sport" as const,
          detail: row.location,
          href: "/sport/padel",
        }));
      },
    ]);
    sources.push(["Running", async () => runningWeek(saved<Run[]>("running-runs") ?? [], userId)]);
  }
  const results = await Promise.allSettled(
    sources.map(([, read]) => withTimeout(Promise.resolve().then(read), 10000, signal)),
  );
  return {
    events: combineWeek(
      results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
      from,
      to,
    ),
    errors: results.flatMap((r, i) => (r.status === "rejected" ? [sources[i][0]] : [])),
  };
}
