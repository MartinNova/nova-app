import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_PERSONAL_BYTES, checkPersonalSize, isMissingTable, planRead } from "./sync";

const mine = { todos: ["account"] };
const browser = { todos: ["browser"] };

describe("which personal data a signed-in user sees", () => {
  it("the account's saved data wins over the browser", () => {
    expect(planRead(mine, browser, null, "me")).toEqual({ use: mine, importLocal: false });
  });

  it("takes over the browser's data once when the account has none yet", () => {
    expect(planRead(null, browser, null, "me")).toEqual({ use: browser, importLocal: true });
  });

  it("the same account may take it over again (e.g. the first upload failed)", () => {
    expect(planRead(null, browser, "me", "me").importLocal).toBe(true);
  });

  it("a second account on the same laptop does not get someone else's tasks", () => {
    expect(planRead(null, browser, "someone-else", "me")).toEqual({
      use: null,
      importLocal: false,
    });
  });

  it("nothing saved anywhere: the service shows its empty or example data", () => {
    expect(planRead(null, null, null, "me")).toEqual({ use: null, importLocal: false });
  });
});

describe("missing table (migration not run yet)", () => {
  it("is recognised, so the app keeps using the browser", () => {
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ code: "42P01" })).toBe(true);
  });

  it("other errors are not mistaken for it", () => {
    expect(isMissingTable(null)).toBe(false);
    expect(isMissingTable({ code: "42501" })).toBe(false);
  });
});

describe("size limit", () => {
  it("accepts a normal timetable", () => {
    expect(checkPersonalSize({ lectures: Array(50).fill({ title: "Finance" }) })).toBeNull();
  });

  it("rejects data over the limit with a clear message", () => {
    expect(checkPersonalSize({ text: "x".repeat(MAX_PERSONAL_BYTES + 1) })).toMatch(/too much/);
  });
});

describe("database rules for personal_data", () => {
  const sql = readFileSync("supabase/migrations/20261125000000_personal_data.sql", "utf8");

  it("every policy only allows the user's own rows", () => {
    const policies = sql.match(/create policy[\s\S]*?;/gi) ?? [];
    expect(policies).toHaveLength(4);
    for (const policy of policies) expect(policy).toMatch(/auth\.uid\(\)\) = user_id/);
  });

  it("accepts only the two kinds and objects under 1 MB", () => {
    expect(sql).toMatch(/kind in \('todos', 'timetable'\)/);
    expect(sql).toMatch(/pg_column_size\(data\) < 1000000/);
  });

  it("later also accepts the imported payment plan, and nothing else", () => {
    const payments = readFileSync(
      "supabase/migrations/20261202000000_personal_payments.sql",
      "utf8",
    );
    expect(payments).toMatch(/kind in \('todos', 'timetable', 'payments'\)/);
  });
});
