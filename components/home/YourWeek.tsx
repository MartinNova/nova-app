"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { latestRequest, watchDashboard } from "@/lib/home/refresh";
import { weekDates, type WeekEvent } from "@/lib/home/week";
import { padelService } from "@/lib/services/padel.service";
import { loadWeek, type WeekResult } from "@/lib/services/week.service";
import { STORAGE_CHANGED } from "@/lib/storage";
import { formatDay, todayInLisbon, WEEKDAYS } from "@/lib/timetable/dates";

function subscribeDay(notify: () => void) {
  const clock = watchDashboard(notify, notify);
  return clock.stop;
}
const COLORS: Record<WeekEvent["kind"], string> = {
  lecture: "bg-brand",
  deadline: "bg-[#8a5d00]",
  sport: "bg-[#2e7d32]",
};

export function YourWeek() {
  const today = useSyncExternalStore(subscribeDay, todayInLisbon, () => "");
  const { user, mode, ready } = useCurrentUser();
  const owner = `${mode}:${user?.id ?? "guest"}`;
  const [snapshot, setSnapshot] = useState<{ key: string; result: WeekResult } | null>(null);
  const [selection, setSelection] = useState<{ week: string; date: string } | null>(null);
  const dates = today ? weekDates(today) : [];
  const monday = dates[0] ?? "";
  const sunday = dates[6] ?? "";
  const key = `${owner}:${today}`;
  const selected = selection?.week === monday ? selection.date : today;
  const result = snapshot?.key === key ? snapshot.result : null;

  useEffect(() => {
    if (!ready || !today) return;
    const request = latestRequest<WeekResult>(
      (result) => setSnapshot({ key, result }),
      () => setSnapshot({ key, result: { events: [], errors: ["Calendar"] } }),
    );
    let controller: AbortController | undefined;
    const reload = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void request.run(() => loadWeek(monday, sunday, user?.id ?? null, mode, signal));
    };
    const watcher = watchDashboard(reload, () => {});
    function changed(event: Event) {
      const storageKey =
        event instanceof StorageEvent ? event.key : (event as CustomEvent<string>).detail;
      if (
        storageKey === null ||
        storageKey === "campus-match:timetable" ||
        storageKey?.startsWith("campus-match:todo-") ||
        storageKey === "campus-match:padel-matches" ||
        storageKey === "campus-match:running-runs"
      )
        watcher.request();
    }
    window.addEventListener("storage", changed);
    window.addEventListener(STORAGE_CHANGED, changed);
    let unsubscribe = () => {};
    if (user?.id) {
      try {
        unsubscribe = padelService.onChange(watcher.request);
      } catch {
        /* Focus and five-minute retries remain. */
      }
    }
    reload();
    return () => {
      request.cancel();
      controller?.abort();
      watcher.stop();
      unsubscribe();
      window.removeEventListener("storage", changed);
      window.removeEventListener(STORAGE_CHANGED, changed);
    };
  }, [key, monday, sunday, today, ready, mode, user?.id]);

  const events = result?.events.filter((event) => event.date === selected) ?? [];
  return (
    <section aria-labelledby="your-week-title" className="flex flex-col gap-2">
      <h2 id="your-week-title" className="mx-1 text-[22px] leading-7 font-bold">
        Your Week
      </h2>
      <div className="bg-surface overflow-hidden rounded-3xl p-3">
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Select a day this week">
          {dates.map((date, i) => {
            const kinds = [
              ...new Set(result?.events.filter((e) => e.date === date).map((e) => e.kind) ?? []),
            ];
            return (
              <button
                key={date}
                type="button"
                aria-pressed={selected === date}
                aria-current={date === today ? "date" : undefined}
                aria-label={`${formatDay(date, { weekday: "long", day: "numeric", month: "long" })}${date === today ? ", today" : ""}${kinds.length ? ", scheduled events" : ""}`}
                onClick={() => setSelection({ week: monday, date })}
                className={`focus-visible:outline-brand flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-2 text-sm focus-visible:outline-2 ${selected === date ? "bg-brand text-brand-foreground" : date === today ? "bg-brand/10 text-brand" : "text-muted"}`}
              >
                <span className="text-[11px]">{WEEKDAYS[i]}</span>
                <span
                  className={`font-semibold ${date === today ? "underline underline-offset-2" : ""}`}
                >
                  {date.slice(8).replace(/^0/, "")}
                </span>
                <span className="flex h-1.5 gap-1" aria-hidden>
                  {kinds.map((kind) => (
                    <span
                      key={kind}
                      className={`size-1.5 rounded-full ${COLORS[kind]} ${selected === date ? "ring-1 ring-white/60" : ""}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="border-border mt-3 border-t pt-3">
          <h3 className="mb-2 text-sm font-semibold">
            {selected
              ? formatDay(selected, { weekday: "long", day: "numeric", month: "long" })
              : "This week"}
          </h3>
          {!ready || !result ? (
            <p className="text-muted py-2 text-sm" role="status">
              Loading schedule…
            </p>
          ) : (
            <>
              {result.errors.length > 0 && (
                <p className="text-muted mb-2 text-xs" role="status">
                  Could not load: {result.errors.join(", ")}. Schedule may be incomplete; retries
                  automatically.
                </p>
              )}
              {events.length === 0 && (
                <p className="text-muted py-2 text-sm">
                  {result.errors.length
                    ? "No events available from loaded sources"
                    : "Nothing scheduled"}
                </p>
              )}
              <ul className="divide-border divide-y">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={event.href}
                      className="focus-visible:outline-brand flex min-h-11 items-start gap-3 rounded-lg py-3 focus-visible:outline-2"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${COLORS[event.kind]}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{event.title}</span>
                        <span className="text-muted block text-xs">{event.detail}</span>
                      </span>
                      <span className="text-muted shrink-0 text-xs">{event.time ?? "All day"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
