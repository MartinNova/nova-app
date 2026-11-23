import { describe, expect, it } from "vitest";
import type { AvailabilitySlot } from "@/types/profile";
import {
  availabilityRows,
  formatAvailabilityDays,
  formatSlots,
  formatTime,
  nextSlot,
  normalizeSlots,
  slotsFromLegacy,
  validateAvailability,
} from "./availability";

const slot = (day: AvailabilitySlot["day"], from: string, to: string): AvailabilitySlot => ({
  day,
  from,
  to,
});

describe("formatAvailabilityDays", () => {
  it("is empty when nothing is set", () => {
    expect(formatAvailabilityDays([])).toBe("");
  });

  it("sorts days in week order", () => {
    expect(formatAvailabilityDays(["Fri", "Mon"])).toBe("Mon, Fri");
  });

  it("turns three or more days in a row into a range", () => {
    expect(formatAvailabilityDays(["Fri", "Tue", "Mon", "Wed"])).toBe("Mon–Wed, Fri");
    expect(formatAvailabilityDays(["Thu", "Fri", "Sat", "Sun"])).toBe("Thu–Sun");
  });

  it("keeps two days in a row as a list", () => {
    expect(formatAvailabilityDays(["Tue", "Wed"])).toBe("Tue, Wed");
  });

  it("names common sets", () => {
    expect(formatAvailabilityDays(["Mon", "Tue", "Wed", "Thu", "Fri"])).toBe("Weekdays");
    expect(formatAvailabilityDays(["Sun", "Sat"])).toBe("Weekends");
    expect(formatAvailabilityDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).toBe(
      "Every day",
    );
  });

  it("ignores unknown values and duplicates", () => {
    expect(formatAvailabilityDays(["Mon", "Mon", "Funday"])).toBe("Mon");
  });
});

describe("normalizeSlots", () => {
  it("sorts by weekday and time", () => {
    expect(
      normalizeSlots([
        slot("Wed", "16:00", "18:00"),
        slot("Mon", "14:00", "15:00"),
        slot("Mon", "09:00", "10:00"),
      ]),
    ).toEqual([
      slot("Mon", "09:00", "10:00"),
      slot("Mon", "14:00", "15:00"),
      slot("Wed", "16:00", "18:00"),
    ]);
  });

  it("merges windows of the same day that overlap or touch", () => {
    expect(
      normalizeSlots([
        slot("Mon", "09:00", "12:00"),
        slot("Mon", "12:00", "14:00"),
        slot("Mon", "11:00", "13:00"),
      ]),
    ).toEqual([slot("Mon", "09:00", "14:00")]);
    // Other days stay apart.
    expect(
      normalizeSlots([slot("Mon", "09:00", "12:00"), slot("Tue", "10:00", "11:00")]),
    ).toHaveLength(2);
  });

  it("drops broken entries (wrong day, bad time, end before start)", () => {
    expect(
      normalizeSlots([
        slot("Mon", "09:00", "08:00"),
        { day: "Funday", from: "09:00", to: "10:00" },
        slot("Tue", "9:00", "10:00"),
        slot("Wed", "25:00", "26:00"),
        null,
        "x",
      ]),
    ).toEqual([]);
    expect(normalizeSlots("not a list")).toEqual([]);
  });
});

describe("slotsFromLegacy (old Morning/Afternoon/Evening chips)", () => {
  it("turns days x times of day into windows, merging neighbours", () => {
    expect(slotsFromLegacy(["Thu", "Fri"], ["Morning", "Afternoon"])).toEqual([
      slot("Thu", "08:00", "18:00"),
      slot("Fri", "08:00", "18:00"),
    ]);
    expect(slotsFromLegacy(["Mon"], ["Evening", "Morning"])).toEqual([
      slot("Mon", "08:00", "12:00"),
      slot("Mon", "18:00", "22:00"),
    ]);
  });

  it("treats a day without a time of day as the whole day, and no days as nothing", () => {
    expect(slotsFromLegacy(["Sat"], [])).toEqual([slot("Sat", "08:00", "22:00")]);
    expect(slotsFromLegacy([], ["Morning"])).toEqual([]);
  });
});

describe("validateAvailability", () => {
  it("accepts valid windows", () => {
    expect(
      validateAvailability([slot("Mon", "09:00", "12:00"), slot("Mon", "16:00", "18:30")]),
    ).toBeNull();
    expect(validateAvailability([])).toBeNull();
  });

  it("rejects an end before the start", () => {
    expect(validateAvailability([slot("Tue", "18:00", "09:00")])).toMatch(/Tue: the end time/);
    expect(validateAvailability([slot("Tue", "09:00", "09:00")])).toMatch(/end time/);
  });

  it("rejects badly written times", () => {
    expect(validateAvailability([slot("Tue", "", "09:00")])).toMatch(/09:30/);
  });

  it("allows at most three separate windows per day", () => {
    const four = ["08", "10", "12", "14"].map((h) => slot("Fri", `${h}:00`, `${h}:30`));
    expect(validateAvailability(four)).toMatch(/Fri: at most 3/);
    // Overlapping ones count once they're merged.
    expect(validateAvailability([...four.slice(0, 3), slot("Fri", "08:15", "09:00")])).toBeNull();
  });
});

describe("formatting", () => {
  it("drops the leading zero of the hour", () => {
    expect(formatTime("09:30")).toBe("9:30");
    expect(formatTime("18:00")).toBe("18:00");
    expect(formatSlots([slot("Mon", "09:00", "12:00"), slot("Mon", "16:00", "18:00")])).toBe(
      "9:00–12:00, 16:00–18:00",
    );
  });

  it("gives one row per day, sharing a row for days in a row with the same times", () => {
    const weekdays = (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((d) =>
      slot(d, "09:00", "12:00"),
    );
    expect(availabilityRows([...weekdays, slot("Sat", "10:00", "14:00")])).toEqual([
      { days: "Weekdays", times: "9:00–12:00" },
      { days: "Sat", times: "10:00–14:00" },
    ]);
    expect(
      availabilityRows([
        slot("Mon", "09:00", "12:00"),
        slot("Wed", "09:00", "12:00"),
        slot("Thu", "09:00", "12:00"),
        slot("Thu", "16:00", "18:00"),
      ]),
    ).toEqual([
      { days: "Mon", times: "9:00–12:00" },
      { days: "Wed", times: "9:00–12:00" },
      { days: "Thu", times: "9:00–12:00, 16:00–18:00" },
    ]);
    expect(availabilityRows([])).toEqual([]);
  });
});

describe("nextSlot", () => {
  it("suggests the hour after the day's last window", () => {
    expect(nextSlot([slot("Mon", "09:00", "12:30")])).toEqual({ from: "12:30", to: "13:30" });
  });

  it("falls back to 9–17 for an empty day or a late last window", () => {
    expect(nextSlot([])).toEqual({ from: "09:00", to: "17:00" });
    expect(nextSlot([slot("Mon", "20:00", "23:00")])).toEqual({ from: "09:00", to: "17:00" });
  });
});
