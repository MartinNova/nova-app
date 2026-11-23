import { describe, expect, it } from "vitest";
import type { Lecture } from "@/types/timetable";
import { addDays, addMonths, startOfMonth, startOfWeek, weekday } from "./dates";
import { easterSunday, portugueseHolidays } from "./holidays";
import { AUTO_COURSE_COLORS, courseColorMap } from "./colors";
import { parseIcs, parseIcsDate } from "./ics";
import { eventsBetween, expandLecture, filterByCategory, layoutTimedEvents } from "./schedule";
import { normalizeUrl } from "./links";
import { suggestTerm } from "./terms";

describe("dates", () => {
  it("knows weekdays and week starts", () => {
    expect(weekday("2026-11-16")).toBe(1); // Monday
    expect(weekday("2026-11-22")).toBe(7); // Sunday
    expect(startOfWeek("2026-11-19")).toBe("2026-11-16");
    expect(addDays("2026-10-24", 7)).toBe("2026-10-31"); // across the DST change
  });
});

describe("holidays", () => {
  it("calculates Easter", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("includes moving and fixed Portuguese holidays", () => {
    const dates = portugueseHolidays(2027).map((h) => h.date);
    expect(dates).toContain("2027-03-26"); // Good Friday
    expect(dates).toContain("2027-05-27"); // Corpus Christi
    expect(dates).toContain("2027-04-25");
    expect(dates).toContain("2027-06-13"); // Santo António (Lisbon)
  });
});

describe("terms", () => {
  it("suggests the running trimester", () => {
    expect(suggestTerm("2026-11-17").id).toBe("2026-t2");
    expect(suggestTerm("2027-01-10").id).toBe("2027-s2"); // break -> next term
  });
});

describe("expandLecture", () => {
  const lecture: Lecture = {
    id: "l1",
    title: "Corporate Finance",
    weekday: 2, // Tuesday
    start: "09:30",
    end: "11:00",
    termId: "2026-t2", // 22 Oct - 4 Dec 2026
  };

  it("repeats weekly within the term", () => {
    const events = expandLecture(lecture, new Set());
    expect(events[0].date).toBe("2026-10-27");
    expect(events.at(-1)?.date).toBe("2026-12-01");
    expect(events).toHaveLength(6);
  });

  it("skips holidays", () => {
    const events = expandLecture(lecture, new Set(["2026-12-01"]));
    expect(events.map((e) => e.date)).not.toContain("2026-12-01");
    expect(events).toHaveLength(5);
  });

  it("is cancelled on holidays in the full timetable", () => {
    const events = eventsBetween(
      { lectures: [lecture], calendars: [], events: [] },
      "2026-11-30",
      "2026-12-06",
    );
    // Tuesday 1 Dec is a holiday: only the holiday shows up, the lecture is cancelled.
    expect(events.map((e) => [e.date, e.category])).toEqual([["2026-12-01", "holiday"]]);
  });
});

describe("ics", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:exam-1",
    "SUMMARY:Exam: Corporate\\, Finance",
    "LOCATION:Room A",
    "DTSTART:20261210T090000Z",
    "DTEND:20261210T110000Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:due-1",
    "SUMMARY:Assignment 2 is due with a very long title that is folded",
    "  onto a second line",
    "DTSTART:20260715T225900Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:allday",
    "SUMMARY:Exam week",
    "DTSTART;VALUE=DATE:20261214",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  it("converts UTC to Lisbon time (winter and summer)", () => {
    expect(parseIcsDate("20261210T090000Z", "")).toEqual({ date: "2026-12-10", time: "09:00" });
    expect(parseIcsDate("20260715T225900Z", "")).toEqual({ date: "2026-07-15", time: "23:59" });
  });

  it("parses events, escapes and folded lines", () => {
    const events = parseIcs(ics, "exam", "cal");
    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      title: "Exam: Corporate, Finance",
      date: "2026-12-10",
      start: "09:00",
      end: "11:00",
      location: "Room A",
      category: "exam",
    });
    expect(events[0].title).toBe(
      "Assignment 2 is due with a very long title that is folded onto a second line",
    );
    expect(events[2]).toMatchObject({ date: "2026-12-14", start: undefined });
  });

  it("returns nothing for files without events", () => {
    expect(parseIcs("BEGIN:VCALENDAR\nEND:VCALENDAR", "exam", "x")).toEqual([]);
  });
});

describe("filterByCategory", () => {
  it("keeps only selected categories", () => {
    const events = eventsBetween(
      { lectures: [], calendars: [], events: [] },
      "2026-12-01",
      "2026-12-31",
    );
    expect(filterByCategory(events, ["exam"])).toEqual([]);
    expect(filterByCategory(events, ["holiday"]).length).toBe(3); // 1, 8, 25 Dec
  });
});

describe("calendar helpers", () => {
  it("adds months and clamps the day", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-11-17", -1)).toBe("2026-10-17");
    expect(startOfMonth("2026-11-17")).toBe("2026-11-01");
  });

  it("puts overlapping events side by side", () => {
    const ev = (id: string, start: string, end?: string) => ({
      id,
      title: id,
      date: "2026-11-17",
      start,
      end,
      category: "lecture" as const,
    });
    const placed = layoutTimedEvents([
      ev("a", "09:00", "10:30"),
      ev("b", "10:00", "11:00"),
      ev("c", "11:00", "12:00"),
      ev("d", "23:59"), // deadline without end
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect([byId.a.lane, byId.b.lane, byId.a.laneCount]).toEqual([0, 1, 2]);
    expect([byId.c.lane, byId.c.laneCount]).toEqual([0, 1]);
    expect(byId.d.endMin - byId.d.startMin).toBe(30);
  });
});

describe("one-time events", () => {
  it("show up on their date", () => {
    const events = eventsBetween(
      {
        lectures: [],
        calendars: [],
        events: [
          {
            id: "event:1",
            title: "Group meeting",
            date: "2026-11-18",
            start: "18:00",
            category: "lecture",
          },
        ],
      },
      "2026-11-16",
      "2026-11-22",
    );
    expect(events.map((e) => e.title)).toEqual(["Group meeting"]);
  });
});

describe("normalizeUrl", () => {
  it("adds https and keeps valid links", () => {
    expect(normalizeUrl("moodle.novasbe.pt/course/view.php?id=12")).toBe(
      "https://moodle.novasbe.pt/course/view.php?id=12",
    );
    expect(normalizeUrl("https://moodle.novasbe.pt/")).toBe("https://moodle.novasbe.pt/");
  });

  it("rejects empty and unsafe links", () => {
    expect(normalizeUrl("  ")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("course colours", () => {
  const lecture = (id: string, color?: Lecture["color"]): Lecture => ({
    id,
    title: id,
    weekday: 1,
    start: "09:00",
    end: "10:30",
    termId: "t",
    color,
  });

  it("gives every course without an own colour a different automatic colour", () => {
    const colors = courseColorMap([lecture("a"), lecture("b"), lecture("c")]);
    expect(new Set(colors.values()).size).toBe(3);
  });

  it("keeps a picked colour and does not hand it out again", () => {
    const colors = courseColorMap([lecture("a"), lecture("b", "blue"), lecture("c")]);
    expect(colors.get("b")).toBe("blue");
    expect(colors.get("a")).not.toBe("blue");
    expect(colors.get("c")).not.toBe("blue");
    expect(colors.get("a")).not.toBe(colors.get("c"));
  });

  it("starts repeating colours only when there are more courses than colours", () => {
    const many = Array.from({ length: 12 }, (_, i) => lecture(`l${i}`));
    const colors = courseColorMap(many);
    expect(colors.size).toBe(12);
    expect(new Set(colors.values()).size).toBe(AUTO_COURSE_COLORS.length);
  });
});
