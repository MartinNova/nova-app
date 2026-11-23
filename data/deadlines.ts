import type { Deadline } from "@/types/deadlines";

/** netPA → Online Bursary → Financial Situation, where students check and pay. */
export const NETPA_FINANCE_URL = "https://netpa.novasbe.pt/netpa/page?stage=difhomestage";

/**
 * Tuition instalments of the 2026/27 Masters, taken from netPA (Financial Situation).
 * Due dates are the same for everyone in the programme. Amounts are only given for the
 * instalments still to come and may differ per student: check against "Payment Plans"
 * before each year.
 */
export const PAYMENT_DEADLINES: Deadline[] = [
  {
    id: "2026-27-installment-1",
    title: "1st tuition instalment",
    date: "2026-01-22",
    kind: "tuition",
    note: "2026/27 · 1ª Prestação",
  },
  {
    id: "2026-27-installment-2",
    title: "2nd tuition instalment",
    date: "2026-03-02",
    kind: "tuition",
    note: "2026/27 · 2ª Prestação (Março)",
  },
  {
    id: "2026-27-admin-costs",
    title: "Administrative costs",
    date: "2026-03-06",
    kind: "fee",
    note: "Custos administrativos",
  },
  {
    id: "2026-27-insurance-update",
    title: "School insurance update",
    date: "2026-09-30",
    kind: "fee",
    note: "Seguro Escolar",
  },
  {
    id: "2026-27-installment-3",
    title: "3rd tuition instalment",
    date: "2026-12-05",
    kind: "tuition",
    note: "2026/27 · 3ª Prestação (Dezembro)",
    amountEur: 3650,
  },
  {
    id: "2026-27-installment-4",
    title: "4th tuition instalment",
    date: "2027-05-31",
    kind: "tuition",
    note: "4ª Prestação (Maio)",
    amountEur: 3000,
  },
];
