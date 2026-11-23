/**
 * Payment deadlines: data contract.
 * Everyone imports their own netPA statement (payment plans differ per student).
 * Dates are local Lisbon dates "YYYY-MM-DD".
 */

export type DeadlineKind = "tuition" | "fee";

/** Something you have to pay by a date (a "D" line in netPA's current account). */
export interface Deadline {
  id: string;
  title: string;
  /** Due date, "YYYY-MM-DD". */
  date: string;
  kind: DeadlineKind;
  /** The original text from netPA, shown under the title. */
  note?: string;
  /** Amount due in euro. */
  amountEur?: number;
  /** How much of it your payments cover (oldest charges are covered first). */
  paidEur?: number;
  /** When it was fully covered: the date of the payment that completed it. */
  paidOn?: string;
}

/** Money you paid in (a "C" line in netPA's current account). */
export interface PaymentRecord {
  date: string;
  description: string;
  amountEur: number;
}

/** Your imported statement. Saved with your account, only you can see it. */
export interface PaymentPlan {
  fileName: string;
  /** ISO timestamp. */
  importedAt: string;
  deadlines: Deadline[];
  payments: PaymentRecord[];
}
