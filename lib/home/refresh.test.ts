import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDashboardStorage,
  forecastForToday,
  latestRequest,
  upcomingSurfTime,
  watchDashboard,
} from "./refresh";
import { STORAGE_CHANGED, writeJSON } from "@/lib/storage";
import { timetableService } from "@/lib/services/timetable.service";
import { todoService } from "@/lib/services/todo.service";
import { dueTodos, nextLecture } from "./today";
import { eventsBetween } from "@/lib/timetable/schedule";

let win: EventTarget & {
  localStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
};
let doc: EventTarget & { visibilityState: string };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  const values = new Map<string, string>();
  win = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
  });
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("dashboard refresh lifecycle", () => {
  it("coalesces focus and visibility, polls at the chosen interval, and cleans up", () => {
    const refresh = vi.fn();
    const tick = vi.fn();
    const watcher = watchDashboard(refresh, tick, 15000);
    win.dispatchEvent(new Event("focus"));
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(50);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(16000);
    expect(refresh).toHaveBeenCalledTimes(2);
    watcher.stop();
    expect(vi.getTimerCount()).toBe(0);
    win.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(20000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it.each(["2026-11-23T23:59:59Z", "2026-07-01T22:59:59Z"])(
    "refreshes at Lisbon midnight from %s",
    (stamp) => {
      vi.setSystemTime(new Date(stamp));
      const refresh = vi.fn();
      const watcher = watchDashboard(refresh, () => {});
      vi.advanceTimersByTime(1050);
      expect(refresh).toHaveBeenCalledTimes(1);
      watcher.stop();
    },
  );
  it("suspends polling while hidden and catches up on return", () => {
    const refresh = vi.fn();
    const watcher = watchDashboard(refresh, () => {}, 10000);
    doc.visibilityState = "hidden";
    vi.advanceTimersByTime(30000);
    expect(refresh).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(50);
    expect(refresh).toHaveBeenCalledTimes(1);
    watcher.stop();
  });
  it("does not let late requests overwrite newer results or a disposed user's data", async () => {
    let resolve!: (value: string) => void;
    const publish = vi.fn();
    const fail = vi.fn();
    const loader = latestRequest<string>(publish, fail);
    const old = loader.run(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    await Promise.resolve();
    await loader.run(async () => "new");
    resolve("old");
    await old;
    expect(publish.mock.calls).toEqual([["new"]]);
    expect(fail).not.toHaveBeenCalled();
    const pending = loader.run(() => new Promise<string>(() => {}));
    loader.cancel();
    await pending;
    expect(vi.getTimerCount()).toBe(0);
    expect(publish).toHaveBeenCalledTimes(1);
  });
  it("reports errors and timeouts without publishing a false empty result", async () => {
    const publish = vi.fn();
    const fail = vi.fn();
    const loader = latestRequest(publish, fail);
    await loader.run(async () => {
      throw new Error("offline");
    });
    const request = loader.run(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(12000);
    await request;
    expect(fail).toHaveBeenCalledTimes(2);
    expect(publish).not.toHaveBeenCalled();
  });
});

describe("actual local services and change notifications (isolated in-memory storage)", () => {
  it("emits a notification after a successful save and detects corrupt storage", () => {
    const listener = vi.fn();
    win.addEventListener(STORAGE_CHANGED, listener);
    writeJSON("timetable", { lectures: [], calendars: [], events: [] });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => checkDashboardStorage(["timetable"])).not.toThrow();
    win.localStorage.setItem("campus-match:timetable", "broken");
    expect(() => checkDashboardStorage(["timetable"])).toThrow();
  });
  it("reads edited/deleted timetable events and advances to the next lecture", async () => {
    writeJSON("timetable", { lectures: [], calendars: [], events: [] });
    const first = await timetableService.addEvent({
      title: "Audit A",
      category: "lecture",
      date: "2026-11-23",
      start: "13:00",
      end: "14:00",
    });
    const events = eventsBetween(await timetableService.load(), "2026-11-23", "2026-11-23");
    expect(nextLecture(events, "12:00")?.title).toBe("Audit A");
    expect(nextLecture(events, "14:00")).toBeNull();
    await timetableService.removeEvent(first.events[0].id);
    expect(
      nextLecture(
        eventsBetween(await timetableService.load(), "2026-11-23", "2026-11-23"),
        "12:00",
      ),
    ).toBeNull();
  });
  it("reads created, rescheduled, completed and deleted tasks through the real service", async () => {
    writeJSON("todo-lists-v2", []);
    writeJSON("todo-labels-v2", []);
    writeJSON("todo-todos-v2", []);
    const list = await todoService.createList("Audit");
    const task = await todoService.createTodo(list.id, {
      title: "Audit task",
      priority: "normal",
      dueDate: "2026-11-23",
      labelIds: [],
      columnId: list.columns[0].id,
    });
    expect(dueTodos(await todoService.listTodos(), "2026-11-23")).toHaveLength(1);
    await todoService.updateTodo(task.id, { dueDate: "2026-11-24" });
    expect(dueTodos(await todoService.listTodos(), "2026-11-23")).toHaveLength(0);
    await todoService.updateTodo(task.id, { dueDate: "2026-11-22", done: true });
    expect(dueTodos(await todoService.listTodos(), "2026-11-23")).toHaveLength(0);
    await todoService.deleteTodo(task.id);
    expect(await todoService.listTodos()).toHaveLength(0);
  });
});

describe("dated surf forecast", () => {
  const day = { date: "2026-11-23", bestTime: "14:00" } as import("@/types/surf").SurfForecastDay;
  it("rejects a previous or future day's forecast", () => {
    expect(forecastForToday([day], new Date("2026-11-23T12:00:00Z"))).toBe(day);
    expect(() => forecastForToday([day], new Date("2026-11-24T12:00:00Z"))).toThrow();
    expect(() => forecastForToday([], new Date("2026-11-23T12:00:00Z"))).toThrow();
  });
  it("never offers a past hour or another day's best hour", () => {
    expect(upcomingSurfTime(day, new Date("2026-11-23T13:59:00Z"))).toBe("14:00");
    expect(upcomingSurfTime(day, new Date("2026-11-23T14:01:00Z"))).toBeNull();
    expect(upcomingSurfTime(day, new Date("2026-11-24T10:00:00Z"))).toBeNull();
  });
});
