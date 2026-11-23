/**
 * Rules for personal data (to-dos, timetable) that is saved per account in Supabase.
 * Pure functions, so they are tested without a database (sync.test.ts).
 */

export type PersonalKind = "todos" | "timetable";

export interface ReadPlan<T> {
  /** What the app shows. null = nothing saved yet (the service uses its empty or example data). */
  use: T | null;
  /** Copy the browser's data into the account once (it was saved before accounts kept it). */
  importLocal: boolean;
}

/**
 * Which data to show for a signed-in user.
 * - The account's saved data always wins.
 * - Without it, data that is still in this browser from before is taken over once, but only by
 *   the first account that signs in here (`claimedBy`), so a second account on the same laptop
 *   doesn't get someone else's tasks.
 */
export function planRead<T>(
  remote: T | null,
  local: T | null,
  claimedBy: string | null,
  userId: string,
): ReadPlan<T> {
  if (remote !== null) return { use: remote, importLocal: false };
  if (local !== null && (claimedBy === null || claimedBy === userId))
    return { use: local, importLocal: true };
  return { use: null, importLocal: false };
}

/**
 * True when Supabase says the table isn't there yet (migration not run).
 * The app then keeps using the browser, as before, instead of failing.
 */
export function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

/** Same limit as the database check (just under 1 MB per kind), with a clear message. */
export const MAX_PERSONAL_BYTES = 900_000;

export function checkPersonalSize(data: unknown): string | null {
  const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
  return bytes > MAX_PERSONAL_BYTES
    ? "That's too much to save. Remove an imported calendar or some old tasks first."
    : null;
}
