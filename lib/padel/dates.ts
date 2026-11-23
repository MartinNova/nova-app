/** Local calendar date as "YYYY-MM-DD" (not UTC, so late evenings stay on the right day). */
export function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The next `count` days starting today, as ISO dates (used for the calendar strip). */
export function upcomingDates(today: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });
}

/** Parses "YYYY-MM-DD" as a local date (new Date("2026-11-20") would be UTC midnight). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The day the calendar opens on: the first of `days` that has a match, so courts posted for
 * later in the week are seen right away. Falls back to today when no day has one.
 */
export function firstDayWithMatch(days: string[], matchDates: string[]): string {
  return days.find((day) => matchDates.includes(day)) ?? days[0];
}
