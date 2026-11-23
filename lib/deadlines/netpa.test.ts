import { describe, expect, it } from "vitest";
import {
  applyPayments,
  isPaid,
  parseAmount,
  parseDate,
  planFromRows,
  titleFor,
  totalPaid,
} from "./netpa";

// Made-up statement in the shape of netPA's "Current account" export.
const rows = [
  [" ", "Due Date", "Description", "Credit", "Debit", "Current Account No.", "Type"],
  ["", "10/01/2026", "PayPal (Manual)(ABC)", "1,000.00 EUR", "0.00 EUR", "11111", "C"],
  ["", "10/01/2026", "2026/27 1st Installment 1ª Prestação", "", "-1,000.00 EUR", "11111", "D"],
  ["", "01/03/2026", "Administrative Costs Custos administrativos", "", "-35.00 EUR", "11111", "D"],
  [
    "",
    "01/03/2026",
    "2026/27 2nd Installment 2ª Prestação (Março)",
    "",
    "-2,000.00 EUR",
    "11111",
    "D",
  ],
  ["", "02/03/2026", "PayPal(PP:XYZ)", "2,035.00 EUR", "0.00 EUR", "11111", "C"],
  ["", "30/09/2026", "School Insurance Seguro Escolar - Update", "", "-1.10 EUR", "11111", "D"],
  [
    "",
    "05/12/2026",
    "2026/27 3rd Installment 3ª Prestação (Dezembro)",
    "",
    "-3,000.00 EUR",
    "11111",
    "D",
  ],
];

describe("reading netPA values", () => {
  it("reads dates and amounts in the export's formats", () => {
    expect(parseDate("05/12/2026")).toBe("2026-12-05");
    expect(parseDate("2026-12-05")).toBe("2026-12-05");
    expect(parseDate("46361")).toBe("2026-12-05");
    expect(parseDate("Due Date")).toBeNull();
    expect(parseAmount("-4,000.00 EUR")).toBe(4000);
    expect(parseAmount("1.250,50 €")).toBe(1250.5);
    expect(parseAmount("0.00 EUR")).toBe(0);
    expect(parseAmount("")).toBe(0);
  });

  it("gives netPA lines short English titles", () => {
    expect(titleFor("2026/27 3rd Installment 3ª Prestação (Dezembro)")).toEqual({
      title: "3rd tuition instalment",
      kind: "tuition",
    });
    expect(titleFor("4ª Prestação (Maio)").title).toBe("4th tuition instalment");
    expect(titleFor("School Insurance Seguro Escolar - Update").title).toBe(
      "School insurance update",
    );
    expect(titleFor("Administrative Costs Custos administrativos").title).toBe(
      "Administrative costs",
    );
    expect(titleFor("Candidatura-Pós-Graduação/Applic.").title).toBe("Application fee");
  });
});

describe("planFromRows", () => {
  const plan = planFromRows(rows, "statement.xlsx", new Date("2026-11-20T10:00:00Z"));

  it("turns debits into due dates and credits into payments", () => {
    expect(plan.deadlines.map((d) => d.title)).toEqual([
      "1st tuition instalment",
      "Administrative costs",
      "2nd tuition instalment",
      "School insurance update",
      "3rd tuition instalment",
    ]);
    expect(plan.payments).toHaveLength(2);
    expect(totalPaid(plan.payments)).toBe(3035);
  });

  it("covers the oldest charges first and remembers when each was paid", () => {
    const [first, admin, second, insurance, third] = plan.deadlines;
    expect(first).toMatchObject({ paidEur: 1000, paidOn: "2026-01-10" });
    expect(admin).toMatchObject({ paidEur: 35, paidOn: "2026-03-02" });
    expect(second).toMatchObject({ paidEur: 2000, paidOn: "2026-03-02" });
    expect(isPaid(second)).toBe(true);
    expect(insurance.paidEur).toBe(0);
    expect(isPaid(third)).toBe(false);
  });

  it("says clearly when the file isn't the netPA export", () => {
    expect(() => planFromRows([["Name", "Age"]], "x.xlsx", new Date())).toThrow(/netPA/);
  });
});

describe("applyPayments", () => {
  it("pays part of a charge when the money runs out", () => {
    const [charge] = applyPayments(
      [{ title: "x", kind: "fee", date: "2026-01-01", amountEur: 100 }],
      [{ date: "2026-01-02", description: "p", amountEur: 40 }],
    );
    expect(charge.paidEur).toBe(40);
    expect(charge.paidOn).toBeUndefined();
  });
});
