/**
 * "Usually free": time windows per weekday, e.g. Mon 9:00–12:00 and 16:00–18:00.
 * Pure helpers to tidy, check and show them.
 */
import {
  DAY_TIMES,
  MAX_SLOTS_PER_DAY,
  WEEKDAYS,
  type AvailabilitySlot,
  type Weekday,
} from "@/types/profile";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What the old chips meant. Same mapping as the migration that converted them. */
export const LEGACY_TIME_RANGES: Record<(typeof DAY_TIMES)[number], [string, string]> = {
  Morning: ["08:00", "12:00"],
  Afternoon: ["12:00", "18:00"],
  Evening: ["18:00", "22:00"],
};

/** Suggested window when you switch a day on or add another one. */
export const DEFAULT_SLOT = { from: "09:00", to: "17:00" } as const;

/** Suggested next window for a day: the hour after its last one, or DEFAULT_SLOT. */
export function nextSlot(daySlots: AvailabilitySlot[]): { from: string; to: string } {
  const last = daySlots.at(-1);
  if (!last || !TIME.test(last.to) || last.to > "22:00") return { ...DEFAULT_SLOT };
  const [hour, minute] = last.to.split(":");
  return { from: last.to, to: `${String(Number(hour) + 1).padStart(2, "0")}:${minute}` };
}

const isWeekday = (day: unknown): day is Weekday =>
  typeof day === "string" && (WEEKDAYS as readonly string[]).includes(day);

/** Old profiles: chosen days x chosen times of day (no time chosen = the whole day). */
export function slotsFromLegacy(days: string[], times: string[]): AvailabilitySlot[] {
  const chosen = DAY_TIMES.filter((t) => times.includes(t));
  const ranges = (chosen.length ? chosen : DAY_TIMES).map((t) => LEGACY_TIME_RANGES[t]);
  return normalizeSlots(
    days.filter(isWeekday).flatMap((day) => ranges.map(([from, to]) => ({ day, from, to }))),
  );
}

/**
 * Drops broken entries, sorts by weekday and time, and merges windows of the same day that
 * overlap or touch (9–12 + 12–14 -> 9–14). Accepts anything, e.g. JSON from the database.
 */
export function normalizeSlots(raw: unknown): AvailabilitySlot[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw
    .filter(
      (s): s is AvailabilitySlot =>
        !!s &&
        typeof s === "object" &&
        isWeekday(s.day) &&
        TIME.test(s.from) &&
        TIME.test(s.to) &&
        s.from < s.to,
    )
    .map(({ day, from, to }) => ({ day, from, to }))
    .sort(
      (a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.from.localeCompare(b.from),
    );

  const merged: AvailabilitySlot[] = [];
  for (const slot of valid) {
    const last = merged[merged.length - 1];
    if (last && last.day === slot.day && slot.from <= last.to) {
      if (slot.to > last.to) last.to = slot.to;
    } else merged.push({ ...slot });
  }
  return merged;
}

/** Problem with the windows as entered in Settings (before tidying), or null. */
export function validateAvailability(slots: AvailabilitySlot[]): string | null {
  for (const slot of slots) {
    if (!isWeekday(slot.day) || !TIME.test(slot.from) || !TIME.test(slot.to))
      return "Please enter times like 09:30.";
    if (slot.from >= slot.to) return `${slot.day}: the end time must be after the start time.`;
  }
  const tidy = normalizeSlots(slots);
  for (const day of WEEKDAYS)
    if (tidy.filter((s) => s.day === day).length > MAX_SLOTS_PER_DAY)
      return `${day}: at most ${MAX_SLOTS_PER_DAY} time windows per day.`;
  return null;
}

/** "09:00" -> "9:00". */
export function formatTime(time: string): string {
  return time.replace(/^0(\d)/, "$1");
}

/** The windows of one day: "9:00–12:00, 16:00–18:00". */
export function formatSlots(slots: AvailabilitySlot[]): string {
  return slots.map((s) => `${formatTime(s.from)}–${formatTime(s.to)}`).join(", ");
}

/**
 * ["Fri", "Mon", "Tue", "Wed"] -> "Mon–Wed, Fri".
 * Runs of three or more days become a range; common sets get a name.
 */
export function formatAvailabilityDays(days: string[]): string {
  const sorted = WEEKDAYS.filter((d) => days.includes(d));
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "Mon,Tue,Wed,Thu,Fri") return "Weekdays";
  if (sorted.join() === "Sat,Sun") return "Weekends";

  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const consecutive =
      i < sorted.length && WEEKDAYS.indexOf(sorted[i]) === WEEKDAYS.indexOf(sorted[i - 1]) + 1;
    if (consecutive) continue;
    const run = sorted.slice(start, i);
    parts.push(run.length >= 3 ? `${run[0]}–${run[run.length - 1]}` : run.join(", "));
    start = i;
  }
  return parts.join(", ");
}

/**
 * Rows for the profile: days in a row with the same windows share one row, e.g.
 * Mon–Fri 9:00–12:00 + Sat 10:00–14:00 -> "Weekdays" / "9:00–12:00" and "Sat" / "10:00–14:00".
 */
export function availabilityRows(slots: AvailabilitySlot[]): { days: string; times: string }[] {
  const tidy = normalizeSlots(slots);
  const perDay = WEEKDAYS.map((day) => ({
    day,
    times: formatSlots(tidy.filter((s) => s.day === day)),
  })).filter((d) => d.times);

  const rows: { days: Weekday[]; times: string }[] = [];
  for (const { day, times } of perDay) {
    const last = rows[rows.length - 1];
    const follows =
      last && WEEKDAYS.indexOf(last.days[last.days.length - 1]) === WEEKDAYS.indexOf(day) - 1;
    if (last && follows && last.times === times) last.days.push(day);
    else rows.push({ days: [day], times });
  }
  return rows.map((r) => ({ days: formatAvailabilityDays(r.days), times: r.times }));
}
