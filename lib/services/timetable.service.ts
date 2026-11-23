import { readJSON, writeJSON } from "@/lib/storage";
import { parseIcs } from "@/lib/timetable/ics";
import { validateEvent, validateLecture } from "@/lib/timetable/validation";
import type { TimetableData, TimetableService } from "@/types/timetable";
import { loadPersonal, savePersonal } from "./personal-data";

/**
 * The timetable is personal: saved in the user's account (Supabase, see personal-data.ts),
 * so it is the same on every device; in demo mode or signed out it stays in this browser.
 */
const KEY = "timetable";

async function load(): Promise<TimetableData> {
  const data = await loadPersonal<Partial<TimetableData>>("timetable", () => readJSON(KEY, null));
  // `?? []` keeps older saved data (from before a field existed) working.
  return {
    lectures: data?.lectures ?? [],
    calendars: data?.calendars ?? [],
    events: data?.events ?? [],
  };
}

async function save(data: TimetableData): Promise<TimetableData> {
  await savePersonal("timetable", data, (value) => writeJSON(KEY, value), KEY);
  return data;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const timetableService: TimetableService = {
  async load() {
    return load();
  },

  async addLecture(input) {
    const problem = validateLecture(input);
    if (problem) throw new Error(problem);
    const data = await load();
    return save({ ...data, lectures: [...data.lectures, { ...input, id: newId() }] });
  },

  async removeLecture(id) {
    const data = await load();
    return save({ ...data, lectures: data.lectures.filter((l) => l.id !== id) });
  },

  async updateLecture(id, patch) {
    const data = await load();
    return save({
      ...data,
      lectures: data.lectures.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  },

  async importCalendar(name, category, icsText) {
    const id = newId();
    const events = parseIcs(icsText, category, id);
    if (events.length === 0) throw new Error("No events found in this file.");
    const data = await load();
    // Re-uploading a file with the same name replaces the old version.
    const others = data.calendars.filter((c) => c.name !== name);
    return save({
      ...data,
      calendars: [...others, { id, name, category, importedAt: new Date().toISOString(), events }],
    });
  },

  async removeCalendar(id) {
    const data = await load();
    return save({ ...data, calendars: data.calendars.filter((c) => c.id !== id) });
  },

  async addEvent(input) {
    const problem = validateEvent(input);
    if (problem) throw new Error(problem);
    const data = await load();
    return save({ ...data, events: [...data.events, { ...input, id: `event:${newId()}` }] });
  },

  async removeEvent(id) {
    const data = await load();
    return save({ ...data, events: data.events.filter((e) => e.id !== id) });
  },
};
