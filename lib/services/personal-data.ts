import {
  checkPersonalSize,
  isMissingTable,
  planRead,
  type PersonalKind,
} from "@/lib/personal/sync";
import { notifyChanged, readJSON, writeJSON } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";

/**
 * Where personal data (to-dos, timetable) is kept:
 * - signed in with a real account: the user's own row in Supabase (table personal_data, RLS),
 *   so it is the same on every device;
 * - demo mode, signed out, or before the migration has run: this browser (localStorage), as before.
 * The services keep working on one plain object; only loading and saving go through here.
 */

/** Which account took over this browser's old data (see planRead). */
const claimKey = (kind: PersonalKind) => `personal-claimed:${kind}`;

/** Remembered once the table is known to be missing, so later calls don't ask again. */
let tableMissing = false;

async function signedInUserId(): Promise<string | null> {
  if (AUTH_MODE !== "accounts" || tableMissing) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Loads the saved object; `local` reads the browser's copy (the service's own storage keys).
 * Returns null when nothing is saved yet.
 */
export async function loadPersonal<T>(
  kind: PersonalKind,
  local: () => T | null,
): Promise<T | null> {
  const userId = await signedInUserId();
  if (!userId) return local();

  const { data, error } = await getSupabase()
    .from("personal_data")
    .select("data")
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();
  if (isMissingTable(error)) {
    tableMissing = true;
    return local();
  }
  if (error) throw new Error("Could not load your data. Check your connection and try again.");

  const plan = planRead<T>(
    (data?.data as T | undefined) ?? null,
    local(),
    readJSON<string | null>(claimKey(kind), null),
    userId,
  );
  if (plan.importLocal && plan.use !== null) {
    await upsert(userId, kind, plan.use);
    writeJSON(claimKey(kind), userId);
  }
  return plan.use;
}

/**
 * Saves the whole object: in the account when signed in, otherwise with `saveLocal`.
 * `notifyKey` is the storage key the home dashboard listens to.
 */
export async function savePersonal<T>(
  kind: PersonalKind,
  value: T,
  saveLocal: (value: T) => void,
  notifyKey: string,
): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return saveLocal(value);
  const tooBig = checkPersonalSize(value);
  if (tooBig) throw new Error(tooBig);
  if (!(await upsert(userId, kind, value))) return saveLocal(value);
  notifyChanged(notifyKey);
}

/** False when the table is missing (the caller then saves in the browser). */
async function upsert(userId: string, kind: PersonalKind, value: unknown): Promise<boolean> {
  const { error } = await getSupabase()
    .from("personal_data")
    .upsert({ user_id: userId, kind, data: value, updated_at: new Date().toISOString() });
  if (isMissingTable(error)) {
    tableMissing = true;
    return false;
  }
  if (error) throw new Error("Could not save. Check your connection and try again.");
  return true;
}
