import { normalizeSlots, slotsFromLegacy } from "@/lib/profile/availability";
import { resolveFieldVisibility } from "@/lib/profile/privacy";
import type { Profile, ProfileUpdate, StudyStatus, Visibility } from "@/types/profile";
import type { User } from "@/types/user";

/** One row of the `profiles` table (see supabase/migrations). */
export interface ProfileRow {
  id: string;
  /** Not in USER_COLUMNS (lists don't need it), so it can be missing. */
  student_id?: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
  country: string;
  languages: string[];
  instagram: string;
  linkedin: string;
  phone: string;
  program: string;
  study_start: string;
  study_end: string;
  study_status: string;
  sports: string[];
  padel_level: number | null;
  /** Old free-time chips, replaced by availability_slots (kept for older app versions). */
  availability_days: string[];
  availability_times: string[];
  /** [{ day: "Mon", from: "09:00", to: "12:00" }, ...] */
  availability_slots?: unknown;
  visibility: string;
  show_in_suggestions: boolean;
  /** Only filled for your own row; null for other students (see profile_cards). */
  field_visibility?: Record<string, string> | null;
}

/**
 * Where the app reads profiles from: a view over `profiles` that empties every detail the
 * signed-in student may not see (Settings -> Privacy), so hidden values never reach the browser.
 * The table itself no longer hands out those columns (see supabase/migrations).
 */
export const PROFILES_VIEW = "profile_cards";

/** Everything except e-mail: other students can't read it (see migrations). */
export const PROFILE_COLUMNS =
  "id, student_id, username, first_name, last_name, avatar_url, bio, country, languages, " +
  "instagram, linkedin, phone, program, study_start, study_end, study_status, sports, padel_level, " +
  "availability_days, availability_times, availability_slots, visibility, show_in_suggestions, " +
  "field_visibility";

/** Enough for names and avatars in lists (padel players, running clubs, ...). */
export const USER_COLUMNS = "id, username, first_name, last_name, avatar_url";

/** `email` is only known for your own profile (from the login). */
export function rowToProfile(row: ProfileRow, email = ""): Profile {
  return {
    userId: row.id,
    email,
    studentId: row.student_id ?? "",
    username: row.username ?? "",
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    country: row.country,
    languages: row.languages ?? [],
    instagram: row.instagram,
    linkedin: row.linkedin,
    phone: row.phone ?? "",
    program: row.program,
    studyStart: row.study_start,
    studyEnd: row.study_end,
    studyStatus: row.study_status as StudyStatus,
    sports: row.sports ?? [],
    // Postgres numeric can arrive as a string.
    padelLevel: row.padel_level === null ? null : Number(row.padel_level),
    // Before the migration ran, only the old chips exist.
    availability:
      row.availability_slots === undefined
        ? slotsFromLegacy(row.availability_days ?? [], row.availability_times ?? [])
        : normalizeSlots(row.availability_slots),
    visibility: row.visibility as Visibility,
    showInSuggestions: row.show_in_suggestions,
    fieldVisibility: resolveFieldVisibility(row.field_visibility),
  };
}

export function rowToUser(
  row: Pick<
    ProfileRow,
    "id" | "student_id" | "username" | "first_name" | "last_name" | "avatar_url"
  >,
  email?: string,
): User {
  return {
    id: row.id,
    // Accounts without a name yet are shown with their username.
    firstName: row.first_name || row.username || "Student",
    lastName: row.last_name,
    studentId: row.student_id ?? "",
    role: "student",
    email,
    username: row.username ?? undefined,
    avatarUrl: row.avatar_url,
  };
}

/** Only the columns a student may change (the database enforces the same). */
export function updateToRow(update: ProfileUpdate) {
  return {
    username: update.username,
    first_name: update.firstName.trim(),
    last_name: update.lastName.trim(),
    avatar_url: update.avatarUrl,
    bio: update.bio.trim(),
    country: update.country,
    languages: update.languages,
    instagram: update.instagram.trim(),
    linkedin: update.linkedin.trim(),
    phone: update.phone,
    program: update.program,
    study_start: update.studyStart,
    study_end: update.studyEnd,
    study_status: update.studyStatus,
    sports: update.sports,
    padel_level: update.padelLevel,
    availability_slots: normalizeSlots(update.availability),
    visibility: update.visibility,
    show_in_suggestions: update.showInSuggestions,
    field_visibility: update.fieldVisibility,
  };
}
