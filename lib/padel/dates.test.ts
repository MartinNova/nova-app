import { describe, expect, it } from "vitest";
import { firstDayWithMatch, upcomingDates } from "./dates";

describe("firstDayWithMatch", () => {
  const days = upcomingDates(new Date(2026, 10, 23), 14);

  it("opens on today when today has a match", () => {
    expect(firstDayWithMatch(days, ["2026-11-23", "2026-11-25"])).toBe("2026-11-23");
  });

  it("opens on the next day with a match when today has none", () => {
    expect(firstDayWithMatch(days, ["2026-11-27", "2026-11-25"])).toBe("2026-11-25");
  });

  it("falls back to today when there are no matches", () => {
    expect(firstDayWithMatch(days, [])).toBe("2026-11-23");
  });

  it("ignores matches outside the calendar strip", () => {
    expect(firstDayWithMatch(days, ["2026-12-20"])).toBe("2026-11-23");
  });
});
