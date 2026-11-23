import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The signed-in path of personal-data.ts against a small fake Supabase:
 * one row per (user, kind), like the personal_data table.
 */

const rows = new Map<string, unknown>();
let session: { user: { id: string } } | null = null;
let tableExists = true;

function query() {
  const filters: Record<string, string> = {};
  const missing = { data: null, error: { code: "PGRST205" } };
  const builder = {
    select: () => builder,
    eq(column: string, value: string) {
      filters[column] = value;
      return builder;
    },
    async maybeSingle() {
      if (!tableExists) return missing;
      const data = rows.get(`${filters.user_id}/${filters.kind}`);
      return { data: data === undefined ? null : { data }, error: null };
    },
    async upsert(row: { user_id: string; kind: string; data: unknown }) {
      if (!tableExists) return missing;
      // Like RLS: only your own row.
      if (row.user_id !== session?.user.id) return { error: { code: "42501" } };
      rows.set(`${row.user_id}/${row.kind}`, row.data);
      return { error: null };
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/config", () => ({ AUTH_MODE: "accounts" }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session } }) },
    from: () => query(),
  }),
}));

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const local = () => JSON.parse(localStorage.getItem("campus-match:timetable") ?? "null");
const saveLocal = (value: unknown) =>
  localStorage.setItem("campus-match:timetable", JSON.stringify(value));

async function freshModule() {
  vi.resetModules();
  return import("./personal-data");
}

beforeEach(() => {
  rows.clear();
  session = { user: { id: "till" } };
  tableExists = true;
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("window", { localStorage, dispatchEvent: () => true });
});

describe("personal data with a real account", () => {
  it("saves in the account and loads it again (e.g. on another device)", async () => {
    const { loadPersonal, savePersonal } = await freshModule();
    await savePersonal("timetable", { lectures: ["Finance"] }, saveLocal, "timetable");
    expect(rows.get("till/timetable")).toEqual({ lectures: ["Finance"] });
    expect(local()).toBeNull(); // not left in this browser
    expect(await loadPersonal("timetable", local)).toEqual({ lectures: ["Finance"] });
  });

  it("takes over the browser's old timetable once, then the account wins", async () => {
    saveLocal({ lectures: ["Old"] });
    const { loadPersonal } = await freshModule();
    expect(await loadPersonal("timetable", local)).toEqual({ lectures: ["Old"] });
    expect(rows.get("till/timetable")).toEqual({ lectures: ["Old"] });

    rows.set("till/timetable", { lectures: ["Newer, from the phone"] });
    expect(await loadPersonal("timetable", local)).toEqual({ lectures: ["Newer, from the phone"] });
  });

  it("a second account on the same browser does not get the first one's data", async () => {
    saveLocal({ lectures: ["Till's"] });
    const { loadPersonal } = await freshModule();
    await loadPersonal("timetable", local); // Till signs in first and takes it over
    session = { user: { id: "lea" } };
    expect(await loadPersonal("timetable", local)).toBeNull();
    expect(rows.has("lea/timetable")).toBe(false);
  });

  it("keeps the two kinds apart", async () => {
    const { loadPersonal, savePersonal } = await freshModule();
    await savePersonal("todos", { todos: ["Essay"] }, () => {}, "todo-todos-v2");
    expect(await loadPersonal("timetable", () => null)).toBeNull();
  });

  it("before the migration has run, everything stays in the browser", async () => {
    tableExists = false;
    const { loadPersonal, savePersonal } = await freshModule();
    expect(await loadPersonal("timetable", local)).toBeNull();
    await savePersonal("timetable", { lectures: ["Finance"] }, saveLocal, "timetable");
    expect(local()).toEqual({ lectures: ["Finance"] });
  });

  it("signed out: the browser, no database", async () => {
    session = null;
    const { savePersonal } = await freshModule();
    await savePersonal("timetable", { lectures: ["Guest"] }, saveLocal, "timetable");
    expect(local()).toEqual({ lectures: ["Guest"] });
    expect(rows.size).toBe(0);
  });

  it("rejects data that is too big, with a clear message", async () => {
    const { savePersonal } = await freshModule();
    await expect(
      savePersonal("timetable", { text: "x".repeat(1_000_000) }, saveLocal, "timetable"),
    ).rejects.toThrow(/too much/);
    expect(rows.size).toBe(0);
  });
});
