/**
 * Pure helpers that turn the free-time chips from Settings into short, readable text.
 */
import { DAY_TIMES, WEEKDAYS } from "@/types/profile";

type Weekday = (typeof WEEKDAYS)[number];

/** Keeps only known days, in week order, without duplicates. */
function sortDays(days: string[]): Weekday[] {
  return WEEKDAYS.filter((d) => days.includes(d));
}

/**
 * ["Fri", "Mon", "Tue", "Wed"] -> "Mon–Wed, Fri".
 * Runs of three or more days become a range; common sets get a name.
 */
export function formatAvailabilityDays(days: string[]): string {
  const sorted = sortDays(days);
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

/** ["Evening", "Morning"] -> "Morning, Evening"; all three -> "All day". */
export function formatAvailabilityTimes(times: string[]): string {
  const sorted = DAY_TIMES.filter((t) => times.includes(t));
  if (sorted.length === DAY_TIMES.length) return "All day";
  return sorted.join(", ");
}
