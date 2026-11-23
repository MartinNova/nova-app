/**
 * Small, safe wrapper around localStorage.
 * - Works during server rendering (returns the fallback).
 * - Never throws (private mode, quota, corrupted JSON).
 * All keys are prefixed so modules don't overwrite each other.
 * Will be replaced by Supabase in the services, not in components.
 */
export const STORAGE_CHANGED = "campus-match:storage-changed";
const PREFIX = "campus-match:";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGED, { detail: PREFIX + key }));
  } catch {
    // Storage unavailable: the app still works, the value just isn't persisted.
  }
}
