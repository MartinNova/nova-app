import { todayInLisbon } from "@/lib/timetable/dates";
import { nowInLisbon } from "@/lib/home/today";
import type { SurfForecastDay } from "@/types/surf";

/** One clock per dashboard consumer. Midnight is scheduled by checking Lisbon's date,
 * not by assuming a 24-hour day (DST). Focus + visibility are coalesced. */
export function watchDashboard(refresh: () => void, tick: () => void, intervalMs = 300000) {
  let date = todayInLisbon();
  let lastRefresh = Date.now();
  let pending: ReturnType<typeof setTimeout> | undefined;
  function request() {
    clearTimeout(pending);
    pending = setTimeout(() => {
      date = todayInLisbon();
      lastRefresh = Date.now();
      refresh();
    }, 50);
  }
  function visible() {
    if (document.visibilityState !== "hidden") request();
  }
  const clock = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    tick();
    if (todayInLisbon() !== date || Date.now() - lastRefresh >= intervalMs) request();
  }, 1000);
  window.addEventListener("focus", visible);
  document.addEventListener("visibilitychange", visible);
  return {
    request,
    stop() {
      clearTimeout(pending);
      clearInterval(clock);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    },
  };
}

/** A timeout prevents a stalled source from leaving its card loading forever. */
export function withTimeout<T>(request: Promise<T>, ms = 12000, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    function abort() {
      cleanup();
      reject(new Error("Dashboard request cancelled"));
    }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Dashboard request timed out"));
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    request.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

/** Ignore late responses after a newer request, user change, or unmount. */
export function latestRequest<T>(publish: (value: T) => void, fail: () => void) {
  let generation = 0;
  let controller: AbortController | undefined;
  return {
    async run(request: () => Promise<T>) {
      const id = ++generation;
      controller?.abort();
      controller = new AbortController();
      try {
        const value = await withTimeout(Promise.resolve().then(request), 12000, controller.signal);
        if (id === generation) publish(value);
      } catch {
        if (id === generation) fail();
      }
    },
    cancel() {
      ++generation;
      controller?.abort();
    },
  };
}

/** The legacy services intentionally hide storage read errors. Check only the dashboard's
 * keys first so a corrupt/blocked store isn't misreported as an empty day. Never writes. */
export function checkDashboardStorage(keys: readonly string[]): void {
  for (const key of keys) {
    const raw = window.localStorage.getItem(`campus-match:${key}`);
    if (raw !== null) JSON.parse(raw);
  }
}

export function forecastForToday(days: SurfForecastDay[], now = new Date()): SurfForecastDay {
  const day = days.find((value) => value.date === todayInLisbon(now));
  if (!day) throw new Error("No forecast for today");
  return day;
}

/** A day's overall best hour may already have passed; never call it upcoming. */
export function upcomingSurfTime(day: SurfForecastDay, now = new Date()): string | null {
  return day.date === todayInLisbon(now) && day.bestTime >= nowInLisbon(now) ? day.bestTime : null;
}
