import { toDate } from "@/lib/timetable/dates";
import type { Deadline } from "@/types/deadlines";

export type Urgency = "past" | "urgent" | "soon" | "later";

/** Whole days from `today` until `date` (negative = already past). */
export function daysUntil(date: string, today: string): number {
  return Math.round((toDate(date).getTime() - toDate(today).getTime()) / 86_400_000);
}

/** urgent = within a week, soon = within a month. */
export function urgency(date: string, today: string): Urgency {
  const days = daysUntil(date, today);
  if (days < 0) return "past";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "later";
}

/** "today", "tomorrow", "in 18 days", "3 days ago" */
export function relativeDay(date: string, today: string): string {
  const days = daysUntil(date, today);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Nothing left to pay (only known when the statement has amounts). */
const settled = (d: Deadline) =>
  d.amountEur !== undefined && Math.round((d.paidEur ?? 0) * 100) >= Math.round(d.amountEur * 100);

/**
 * Splits deadlines into upcoming (soonest first) and past (latest first).
 * A past date that isn't fully paid stays in upcoming (overdue) until it is.
 */
export function splitDeadlines(
  deadlines: Deadline[],
  today: string,
): { upcoming: Deadline[]; past: Deadline[] } {
  const sorted = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
  const isPast = (d: Deadline) => d.date < today && (d.amountEur === undefined || settled(d));
  return {
    upcoming: sorted.filter((d) => !isPast(d)),
    past: sorted.filter(isPast).reverse(),
  };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");
}

const compact = (iso: string) => iso.replaceAll("-", "");

/**
 * Builds an .ics file with one all-day event per deadline and two reminders:
 * 9:00 a week before and 9:00 the day before. Phones add these to their calendar.
 * `stamp` is the creation time as "YYYYMMDDTHHMMSSZ" (required by the format).
 */
export function deadlinesToIcs(deadlines: Deadline[], stamp: string, url: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nova App//Deadlines//EN"];
  for (const d of deadlines) {
    const end = new Date(toDate(d.date).getTime() + 86_400_000).toISOString().slice(0, 10);
    const title = escapeText(`${d.title} (Nova SBE)`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@nova-app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(d.date)}`,
      `DTEND;VALUE=DATE:${compact(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${escapeText(`${d.note ? `${d.note}\n` : ""}Check and pay in netPA: ${url}`)}`,
      `URL:${url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${title}`,
      "TRIGGER:-P6DT15H",
      "END:VALARM",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${title}`,
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
