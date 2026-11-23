/**
 * Payment deadlines: data contract.
 * Dates are local Lisbon dates "YYYY-MM-DD".
 */

export type DeadlineKind = "tuition" | "fee";

export interface Deadline {
  id: string;
  title: string;
  /** Due date, "YYYY-MM-DD". */
  date: string;
  kind: DeadlineKind;
  /** Short hint shown under the title. */
  note?: string;
}
