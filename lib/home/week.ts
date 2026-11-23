import { addDays, startOfWeek } from "@/lib/timetable/dates";
import { eventsBetween } from "@/lib/timetable/schedule";
import type { TimetableData } from "@/types/timetable";
import type { Todo } from "@/types/todo";
import type { PadelMatch } from "@/types/padel";
import type { Run } from "@/types/running";

export interface WeekEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  detail?: string;
  kind: "lecture" | "deadline" | "sport";
  href: string;
}
export function weekDates(today: string): string[] {
  const monday = startOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function timetableWeek(data: TimetableData, from: string, to: string): WeekEvent[] {
  return eventsBetween(data, from, to)
    .filter((e) => e.category !== "holiday")
    .map((e) => ({
      id: `timetable:${e.id}`,
      title: e.title,
      date: e.date,
      time: e.start,
      detail: [
        e.category === "exam" ? "Exam" : e.category === "deadline" ? "Deadline" : "Lecture",
        e.end ? `until ${e.end}` : "",
        e.location,
      ]
        .filter(Boolean)
        .join(" · "),
      kind: e.category === "deadline" ? "deadline" : "lecture",
      href: "/timetable",
    }));
}
export function todoWeek(todos: Todo[]): WeekEvent[] {
  // Seed tasks must never appear as personal appointments, even after another edit saved them.
  return todos
    .filter((t) => !t.done && t.dueDate && !t.id.startsWith("mock-"))
    .map((t) => ({
      id: `todo:${t.id}`,
      title: t.title,
      date: t.dueDate!,
      kind: "deadline",
      detail: "To-do due",
      href: "/study/todos",
    }));
}
export function padelWeek(matches: PadelMatch[], userId: string): WeekEvent[] {
  return matches
    .filter((m) => !m.id.startsWith("mock-") && m.playerIds.includes(userId))
    .map((m) => ({
      id: `padel:${m.id}`,
      title: "Padel",
      date: m.date,
      time: m.time,
      kind: "sport",
      detail: m.location,
      href: "/sport/padel",
    }));
}
export function runningWeek(runs: Run[], userId: string): WeekEvent[] {
  // Only saved student runs: no generated club schedules or synthetic starter runs.
  return runs
    .filter((r) => !r.clubId && !r.id.startsWith("mock-") && r.runnerIds.includes(userId))
    .map((r) => ({
      id: `running:${r.id}`,
      title: "Running",
      date: r.date,
      time: r.time,
      kind: "sport",
      detail: r.location,
      href: "/sport/running",
    }));
}
export function combineWeek(events: WeekEvent[], from: string, to: string): WeekEvent[] {
  return [
    ...new Map(events.filter((e) => e.date >= from && e.date <= to).map((e) => [e.id, e])).values(),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "").localeCompare(b.time ?? "") ||
      a.title.localeCompare(b.title),
  );
}
