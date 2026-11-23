import { describe, expect, it } from "vitest";
import { parseIcs } from "@/lib/timetable/ics";
import type { Deadline } from "@/types/deadlines";
import { daysUntil, deadlinesToIcs, relativeDay, splitDeadlines, urgency } from "./deadlines";

const deadline = (id: string, date: string): Deadline => ({
  id,
  title: `Payment ${id}`,
  date,
  kind: "tuition",
});

describe("daysUntil / urgency", () => {
  it("counts whole days across months and DST", () => {
    expect(daysUntil("2026-12-05", "2026-11-17")).toBe(18);
    expect(daysUntil("2026-03-30", "2026-03-28")).toBe(2);
    expect(daysUntil("2026-11-16", "2026-11-17")).toBe(-1);
  });

  it("rates how close a deadline is", () => {
    expect(urgency("2026-11-16", "2026-11-17")).toBe("past");
    expect(urgency("2026-11-17", "2026-11-17")).toBe("urgent");
    expect(urgency("2026-11-24", "2026-11-17")).toBe("urgent");
    expect(urgency("2026-12-05", "2026-11-17")).toBe("soon");
    expect(urgency("2027-05-31", "2026-11-17")).toBe("later");
  });

  it("describes the distance in words", () => {
    expect(relativeDay("2026-11-17", "2026-11-17")).toBe("today");
    expect(relativeDay("2026-11-18", "2026-11-17")).toBe("tomorrow");
    expect(relativeDay("2026-12-05", "2026-11-17")).toBe("in 18 days");
    expect(relativeDay("2026-11-14", "2026-11-17")).toBe("3 days ago");
  });
});

describe("splitDeadlines", () => {
  it("sorts upcoming soonest first and past latest first, today counts as upcoming", () => {
    const { upcoming, past } = splitDeadlines(
      [
        deadline("c", "2027-01-01"),
        deadline("a", "2026-01-01"),
        deadline("t", "2026-11-17"),
        deadline("b", "2026-06-01"),
      ],
      "2026-11-17",
    );
    expect(upcoming.map((d) => d.id)).toEqual(["t", "c"]);
    expect(past.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("deadlinesToIcs", () => {
  const ics = deadlinesToIcs(
    [{ ...deadline("x", "2026-12-05"), note: "3ª Prestação; Dezembro" }],
    "20261117T120000Z",
    "https://netpa.example/pay",
  );

  it("creates all-day events with two reminders", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261205");
    expect(ics).toContain("DTEND;VALUE=DATE:20261206");
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-PT15H");
    expect(ics).toContain("\\;");
    expect(ics.split("\r\n").at(-2)).toBe("END:VCALENDAR");
  });

  it("can be read back by our own ics parser", () => {
    const [event] = parseIcs(ics, "deadline", "t");
    expect(event).toMatchObject({ date: "2026-12-05", title: "Payment x (Nova SBE)" });
  });
});

describe("splitDeadlines with payments", () => {
  it("keeps a past date that isn't fully paid in upcoming (overdue)", () => {
    const { upcoming, past } = splitDeadlines(
      [
        { ...deadline("paid", "2026-03-01"), amountEur: 100, paidEur: 100 },
        { ...deadline("open", "2026-10-01"), amountEur: 100, paidEur: 40 },
        { ...deadline("next", "2026-12-05"), amountEur: 3650, paidEur: 0 },
      ],
      "2026-11-17",
    );
    expect(upcoming.map((d) => d.id)).toEqual(["open", "next"]);
    expect(past.map((d) => d.id)).toEqual(["paid"]);
  });
});
