import { afterEach, describe, expect, it, vi } from "vitest";
import { dailyMessage, millisecondsUntilMidnight, subscribeToLocalDay } from "./daily-message";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("daily homepage message", () => {
  it.each([
    [23, "Make today count!"],
    [24, "Small steps, big progress."],
    [25, "You've got this!"],
    [26, "Believe in yourself."],
    [27, "Be proud of how far you've come."],
    [28, "Take time to enjoy the little things."],
    [29, "A little rest goes a long way."],
  ])("uses the exact local message for November %i", (day, expected) => {
    expect(dailyMessage(new Date(2026, 10, day, 0))).toBe(expected);
    expect(dailyMessage(new Date(2026, 10, day, 23, 59, 59))).toBe(expected);
    expect(dailyMessage(new Date(2026, 10, day + 7, 12))).toBe(expected);
  });
  it("schedules the next local midnight across month/year boundaries", () => {
    expect(millisecondsUntilMidnight(new Date(2026, 11, 31, 23, 59, 59))).toBe(1000);
    expect(millisecondsUntilMidnight(new Date(2026, 10, 30, 23, 59))).toBe(60000);
  });
  it("updates at midnight, catches up on focus and cleans up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 28, 23, 59, 59));
    const win = new EventTarget();
    const doc = new EventTarget();
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const observed: string[] = [];
    const cleanup = subscribeToLocalDay(() => observed.push(dailyMessage()));
    vi.advanceTimersByTime(1000);
    expect(observed.at(-1)).toBe("A little rest goes a long way.");
    vi.setSystemTime(new Date(2026, 10, 30, 10));
    win.dispatchEvent(new Event("focus"));
    expect(observed.at(-1)).toBe("Make today count!");
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    const count = observed.length;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(observed).toHaveLength(count);
  });
});
