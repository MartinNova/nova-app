/** JavaScript weekdays start on Sunday; this sequence repeats every week. */
export const DAILY_MESSAGES = [
  "A little rest goes a long way.",
  "Make today count!",
  "Small steps, big progress.",
  "You've got this!",
  "Believe in yourself.",
  "Be proud of how far you've come.",
  "Take time to enjoy the little things.",
] as const;

export function dailyMessage(now = new Date()): string {
  return DAILY_MESSAGES[now.getDay()];
}

export function millisecondsUntilMidnight(now = new Date()): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** Reschedule at local midnight, and catch up when a suspended tab becomes active. */
export function subscribeToLocalDay(notify: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  function update() {
    clearTimeout(timer);
    notify();
    timer = setTimeout(update, millisecondsUntilMidnight());
  }
  update();
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", update);
    document.removeEventListener("visibilitychange", update);
  };
}
