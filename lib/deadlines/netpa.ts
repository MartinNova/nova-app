/**
 * Turns netPA's "Current account" export (Excel or CSV) into payment deadlines.
 * Columns: Due Date | Description | Credit | Debit | Current Account No. | Type
 * - Type "D" (or a debit amount): something to pay by the due date
 * - Type "C" (or a credit amount): a payment you made
 * Payments cover the oldest charges first, like netPA's own balance.
 */
import type { Deadline, DeadlineKind, PaymentPlan, PaymentRecord } from "@/types/deadlines";

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/ /g, " ").trim().toLowerCase();

/** "29/12/2025" or "2025-12-29" (or an Excel day number) -> "2025-12-29"; null if not a date. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Excel stores dates as days since 1899-12-30 when the cell is formatted as a date.
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** "1,250.00 EUR", "-4,000.00 EUR", "1.250,00 €", "51" -> 1250, 4000, 1250, 51 (always positive). */
export function parseAmount(text: string): number {
  let t = text.replace(/[^\d.,-]/g, "");
  if (!t || t === "-") return 0;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  // The last separator with 1–2 digits after it is the decimal one.
  if (lastComma > lastDot && t.length - lastComma <= 3) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Math.abs(Number(t));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

const ORDINAL: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd" };

/** A short English title for a netPA line, e.g. "3rd tuition instalment". */
export function titleFor(description: string): { title: string; kind: DeadlineKind } {
  const d = norm(description);
  const instalment = /(\d+)\s*(?:st|nd|rd|th)?\s*install?ment|(\d+)\s*[ao.ª]*\s*prestac/.exec(d);
  if (instalment) {
    const n = instalment[1] ?? instalment[2];
    return { title: `${ORDINAL[n] ?? `${n}th`} tuition instalment`, kind: "tuition" };
  }
  if (/tuition|propina/.test(d)) return { title: "Tuition", kind: "tuition" };
  if (/insurance|seguro/.test(d))
    return {
      title: /update|actualiza|atualiza/.test(d) ? "School insurance update" : "School insurance",
      kind: "fee",
    };
  if (/administrative|administrativ/.test(d)) return { title: "Administrative costs", kind: "fee" };
  if (/candidatura|application/.test(d)) return { title: "Application fee", kind: "fee" };
  // Anything else: the netPA text itself, first part only.
  const short = description.split(/[(/]/)[0].replace(/ /g, " ").trim() || description.trim();
  return { title: short.slice(0, 60), kind: "fee" };
}

interface Columns {
  date: number;
  description: number;
  credit: number;
  debit: number;
  type: number;
}

function findHeader(rows: string[][]): { at: number; cols: Columns } | null {
  for (let at = 0; at < Math.min(rows.length, 20); at++) {
    const cells = rows[at].map(norm);
    const col = (...names: string[]) => cells.findIndex((c) => names.some((n) => c.includes(n)));
    const date = col("due date", "data", "date");
    const description = col("description", "descri");
    const credit = col("credit", "credito");
    const debit = col("debit", "debito");
    if (date >= 0 && description >= 0 && (credit >= 0 || debit >= 0)) {
      return { at, cols: { date, description, credit, debit, type: col("type", "tipo") } };
    }
  }
  return null;
}

/** Charges and payments from the sheet's rows. Throws if the columns aren't there. */
export function parseStatement(rows: string[][]): {
  charges: Omit<Deadline, "id">[];
  payments: PaymentRecord[];
} {
  const header = findHeader(rows);
  if (!header) {
    throw new Error(
      'This doesn\'t look like the netPA export. It needs the columns "Due Date", "Description", "Credit" and "Debit".',
    );
  }
  const { cols } = header;
  const charges: Omit<Deadline, "id">[] = [];
  const payments: PaymentRecord[] = [];
  for (const row of rows.slice(header.at + 1)) {
    const cell = (i: number) => (i >= 0 ? (row[i] ?? "") : "");
    const date = parseDate(cell(cols.date));
    const description = cell(cols.description).replace(/ /g, " ").trim();
    if (!date || !description) continue;
    const credit = parseAmount(cell(cols.credit));
    const debit = parseAmount(cell(cols.debit));
    const type = norm(cell(cols.type));
    if (type === "c" || (type !== "d" && credit > 0 && debit === 0)) {
      if (credit > 0) payments.push({ date, description, amountEur: credit });
    } else if (debit > 0) {
      const { title, kind } = titleFor(description);
      charges.push({ title, kind, date, note: description, amountEur: debit });
    }
  }
  if (charges.length === 0) throw new Error("No due dates found in this file.");
  return { charges, payments };
}

const cents = (eur: number) => Math.round(eur * 100);

/**
 * Covers the charges with the payments, oldest charge first (like a running balance).
 * Fills in `paidEur` for every charge and `paidOn` once it is fully covered.
 */
export function applyPayments(
  charges: Omit<Deadline, "id">[],
  payments: PaymentRecord[],
): Omit<Deadline, "id">[] {
  const byDate = charges
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.date.localeCompare(b.c.date) || a.i - b.i);
  const paid = [...payments].sort((a, b) => a.date.localeCompare(b.date));
  let p = 0;
  let left = paid.length ? cents(paid[0].amountEur) : 0;
  const out = new Map<number, Omit<Deadline, "id">>();
  for (const { c, i } of byDate) {
    let due = cents(c.amountEur ?? 0);
    let covered = 0;
    let paidOn: string | undefined;
    while (due > 0 && p < paid.length) {
      const take = Math.min(due, left);
      due -= take;
      covered += take;
      left -= take;
      if (due === 0) paidOn = paid[p].date;
      if (left === 0) {
        p++;
        left = p < paid.length ? cents(paid[p].amountEur) : 0;
      }
    }
    out.set(i, { ...c, paidEur: covered / 100, ...(paidOn ? { paidOn } : {}) });
  }
  return charges.map((_, i) => out.get(i)!);
}

/** The whole import: rows of the sheet -> your payment plan. */
export function planFromRows(rows: string[][], fileName: string, now: Date): PaymentPlan {
  const { charges, payments } = parseStatement(rows);
  const deadlines = applyPayments(charges, payments)
    .map((d, i) => ({ ...d, id: `${d.date}-${i}` }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { fileName, importedAt: now.toISOString(), deadlines, payments };
}

/** Fully paid (nothing left to pay). */
export const isPaid = (d: Deadline) =>
  d.amountEur !== undefined && cents(d.paidEur ?? 0) >= cents(d.amountEur);

/** Total of all payments, for "Paid so far". */
export const totalPaid = (payments: PaymentRecord[]) =>
  payments.reduce((sum, p) => sum + cents(p.amountEur), 0) / 100;
