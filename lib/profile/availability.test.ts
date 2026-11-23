import { describe, expect, it } from "vitest";
import { formatAvailabilityDays, formatAvailabilityTimes } from "./availability";

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

describe("formatAvailabilityTimes", () => {
  it("sorts times of day", () => {
    expect(formatAvailabilityTimes(["Evening", "Morning"])).toBe("Morning, Evening");
  });

  it("says all day when every time is set", () => {
    expect(formatAvailabilityTimes(["Afternoon", "Evening", "Morning"])).toBe("All day");
  });

  it("is empty when nothing is set", () => {
    expect(formatAvailabilityTimes([])).toBe("");
  });
});
