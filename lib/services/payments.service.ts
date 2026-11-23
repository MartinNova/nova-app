import { readJSON, writeJSON } from "@/lib/storage";
import type { PaymentPlan } from "@/types/deadlines";
import { loadPersonal, savePersonal } from "./personal-data";

/**
 * Your payment plan, imported from netPA. Personal like the timetable: saved in your account
 * (personal_data, only you can read it), in demo mode or signed out in this browser.
 */
const KEY = "payment-plan";

/** Stored as an object so "removed" can be saved too. */
interface Stored {
  plan: PaymentPlan | null;
}

export const paymentService = {
  async load(): Promise<PaymentPlan | null> {
    const stored = await loadPersonal<Stored>("payments", () => readJSON<Stored | null>(KEY, null));
    return stored?.plan ?? null;
  },
  async save(plan: PaymentPlan | null): Promise<PaymentPlan | null> {
    await savePersonal<Stored>("payments", { plan }, (value) => writeJSON(KEY, value), KEY);
    return plan;
  },
};
