import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { combineWeek, padelWeek, runningWeek, timetableWeek, weekDates } from "./week";
import { loadWeek } from "@/lib/services/week.service";
import { timetableService } from "@/lib/services/timetable.service";
import { todoService } from "@/lib/services/todo.service";
import { writeJSON } from "@/lib/storage";
import type { PadelMatch } from "@/types/padel";
import type { Run } from "@/types/running";

const query = vi.hoisted(() => ({ select: vi.fn(), gte: vi.fn(), lte: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => ({ from: () => query }) }));
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      },
    }),
  );
  query.select.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.eq.mockResolvedValue({ data: [], error: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const from = "2026-11-23",
  to = "2026-11-29";

describe("Monday–Sunday calendar", () => {
  it("handles Sundays, week rollover and year boundaries", () => {
    expect(weekDates("2026-11-29")).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(weekDates("2026-11-30")[0]).toBe("2026-11-30");
    expect(weekDates("2027-01-01")[0]).toBe("2026-12-28");
  });
  it("expands real recurring lectures, includes exams/deadlines, and respects moved events", async () => {
    writeJSON("timetable", {
      lectures: [
        {
          id: "course",
          title: "Course",
          weekday: 1,
          termId: "2026-s1",
          start: "10:00",
          end: "11:00",
        },
      ],
      calendars: [],
      events: [],
    });
    const data = await timetableService.addEvent({
      title: "Exam",
      date: "2026-11-25",
      start: "14:00",
      end: "15:00",
      category: "exam",
    });
    let events = timetableWeek(data, from, to);
    expect(events.map((e) => [e.title, e.date, e.time])).toEqual([
      ["Course", from, "10:00"],
      ["Exam", "2026-11-25", "14:00"],
    ]);
    await timetableService.removeEvent(data.events[0].id);
    await timetableService.addEvent({
      title: "Exam",
      date: "2026-11-26",
      start: "15:00",
      category: "exam",
    });
    events = timetableWeek(await timetableService.load(), from, to);
    expect(events.find((e) => e.title === "Exam")?.date).toBe("2026-11-26");
    expect(
      timetableWeek(await timetableService.load(), "2026-11-30", "2026-12-06").find(
        (e) => e.title === "Course",
      )?.date,
    ).toBe("2026-11-30");
  });
  it("deduplicates identities, filters the week and sorts chronologically", () => {
    const event = {
      id: "x",
      title: "x",
      date: from,
      kind: "lecture" as const,
      href: "/timetable",
      time: "12:00",
    };
    expect(
      combineWeek(
        [
          event,
          event,
          { ...event, id: "y", time: "09:00" },
          { ...event, id: "outside", date: "2026-12-01" },
        ],
        from,
        to,
      ).map((e) => e.id),
    ).toEqual(["y", "x"]);
  });
});
describe("saved personal sources", () => {
  it("never seeds mock tasks/runs or public Padel into an empty calendar", async () => {
    const result = await loadWeek(from, to, "me", "demo");
    expect(result).toEqual({ events: [], errors: [] });
  });
  it("moves, completes and deletes tasks through the actual service", async () => {
    writeJSON("todo-lists-v2", []);
    writeJSON("todo-labels-v2", []);
    writeJSON("todo-todos-v2", []);
    const list = await todoService.createList("Test");
    const task = await todoService.createTodo(list.id, {
      title: "Deadline",
      dueDate: from,
      priority: "normal",
      labelIds: [],
    });
    expect((await loadWeek(from, to, null, "accounts")).events[0].date).toBe(from);
    await todoService.updateTodo(task.id, { dueDate: "2026-11-28" });
    expect((await loadWeek(from, to, null, "accounts")).events[0].date).toBe("2026-11-28");
    await todoService.updateTodo(task.id, { done: true });
    expect((await loadWeek(from, to, null, "accounts")).events).toEqual([]);
    await todoService.updateTodo(task.id, { done: false });
    await todoService.deleteTodo(task.id);
    expect((await loadWeek(from, to, null, "accounts")).events).toEqual([]);
  });
  it("includes confirmed membership only, never pending requests or mock activities", () => {
    const match = {
      id: "real",
      date: from,
      time: "17:00",
      location: "Club",
      playerIds: ["me"],
      requests: [{ userId: "other", status: "pending" }],
    } as PadelMatch;
    expect(padelWeek([match], "me")).toHaveLength(1);
    expect(padelWeek([match], "other")).toHaveLength(0);
    expect(padelWeek([{ ...match, id: "mock-1" }], "me")).toEqual([]);
    expect(padelWeek([{ ...match, playerIds: [] }], "me")).toEqual([]);
    const run = {
      id: "run",
      date: from,
      time: "09:00",
      location: "River",
      runnerIds: ["me"],
    } as Run;
    expect(runningWeek([run], "me")).toHaveLength(1);
    expect(runningWeek([run], "other")).toEqual([]);
    expect(runningWeek([{ ...run, clubId: "generated" }], "me")).toEqual([]);
  });
  it("queries the full week with a confirmed-player filter and no writes", async () => {
    query.eq.mockResolvedValue({
      data: [{ id: "match", date: from, time: "17:00", location: "Club" }],
      error: null,
    });
    expect((await loadWeek(from, to, "me", "accounts")).events[0].title).toBe("Padel");
    expect(query.gte).toHaveBeenCalledWith("date", from);
    expect(query.eq).toHaveBeenCalledWith("padel_match_players.user_id", "me");
  });
  it("reports broken sources without discarding successful ones or asserting an empty schedule", async () => {
    writeJSON("timetable", {
      lectures: [],
      calendars: [],
      events: [{ id: "event", title: "Lecture", date: from, start: "12:00", category: "lecture" }],
    });
    window.localStorage.setItem("campus-match:todo-todos-v2", "broken");
    query.eq.mockResolvedValue({ data: null, error: new Error("offline") });
    const result = await loadWeek(from, to, "me", "accounts");
    expect(result.errors).toEqual(["To-dos", "Padel"]);
    expect(result.events[0].title).toBe("Lecture");
  });
});
