import { normalizePhone, validateProfileUpdate } from "@/lib/profile/profile-rules";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import {
  PROFILE_COLUMNS,
  rowToProfile,
  updateToRow,
  type ProfileRow,
} from "@/lib/supabase/profiles";
import type { Profile, ProfileService, ProfileUpdate } from "@/types/profile";
import { userService } from "./user.service";

const PROFILES_KEY = "profiles";

/** Same clean-up for both modes before validating and saving (e.g. the phone number). */
function tidy(update: ProfileUpdate): ProfileUpdate {
  return { ...update, phone: normalizePhone(update.phone) };
}
const AVATAR_BUCKET = "avatars";

/** Demo mode: base data from the mock user, edits stored per user in localStorage. */
const demoProfileService: ProfileService = {
  async getProfile(userId) {
    const user = (await userService.listUsers()).find((u) => u.id === userId);
    if (!user) return null;
    const defaults: ProfileUpdate = {
      studentId: user.studentId,
      username: `${user.firstName}.${user.lastName}`.toLowerCase().replace(/[^a-z0-9_.]/g, ""),
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: "",
      bio: "",
      country: "",
      languages: [],
      instagram: "",
      linkedin: "",
      phone: "",
      program: "",
      studyStart: "",
      studyEnd: "",
      studyStatus: "",
      sports: [],
      padelLevel: null,
      availabilityDays: [],
      availabilityTimes: [],
      visibility: "everyone",
      showInSuggestions: true,
    };
    const saved = readJSON<Record<string, Partial<ProfileUpdate>>>(PROFILES_KEY, {})[userId];
    return { userId, email: user.email ?? "", ...defaults, ...saved };
  },
  async getProfileByUsername(username) {
    const all = await this.listProfiles();
    return all.find((p) => p.username === username.toLowerCase()) ?? null;
  },
  async listProfiles() {
    const users = await userService.listUsers();
    const profiles = await Promise.all(users.map((u) => this.getProfile(u.id)));
    return profiles.filter((p): p is Profile => p !== null && p.visibility === "everyone");
  },
  async updateProfile(userId, input) {
    const update = tidy(input);
    const error = validateProfileUpdate(update);
    if (error) throw new Error(error);
    const all = readJSON<Record<string, ProfileUpdate>>(PROFILES_KEY, {});
    writeJSON(PROFILES_KEY, { ...all, [userId]: update });
    return (await this.getProfile(userId)) as Profile;
  },
  async uploadAvatar(_userId, image) {
    // No file storage in demo mode: keep the (small, resized) picture as a data URL.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read the picture."));
      reader.readAsDataURL(image);
    });
  },
};

/** Your own e-mail comes from the login; other students' e-mails are not readable. */
async function emailIfMine(userId: string): Promise<string> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  return session?.user.id === userId ? (session.user.email ?? "") : "";
}

/** Accounts mode: the `profiles` table and the `avatars` bucket. RLS only allows editing your own row. */
const supabaseProfileService: ProfileService = {
  async getProfile(userId) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as unknown as ProfileRow, await emailIfMine(userId)) : null;
  },
  async getProfileByUsername(username) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as unknown as ProfileRow) : null;
  },
  async listProfiles() {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("visibility", "everyone")
      .order("first_name");
    if (error) throw error;
    return (data as unknown as ProfileRow[]).map((row) => rowToProfile(row));
  },
  async updateProfile(userId, input) {
    const update = tidy(input);
    const error = validateProfileUpdate(update);
    if (error) throw new Error(error);
    const { data, error: dbError } = await getSupabase()
      .from("profiles")
      .update(updateToRow(update))
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();
    // 23505 = unique violation, i.e. the username is taken.
    if (dbError?.code === "23505") throw new Error("This username is already taken.");
    // 23514 = check violation, e.g. a phone number the app's check let through.
    if (dbError?.code === "23514") throw new Error("Please check your profile details.");
    if (dbError) throw dbError;
    // The student number is changed through a checked function (digits only, your own row).
    const row = data as unknown as ProfileRow;
    const studentId = update.studentId.trim();
    if (studentId !== (row.student_id ?? "")) {
      const { error: idError } = await getSupabase().rpc("set_my_student_id", {
        new_student_id: studentId,
      });
      if (idError) throw new Error("Could not save your student ID. Please try again.");
    }
    return rowToProfile({ ...row, student_id: studentId }, await emailIfMine(userId));
  },
  async uploadAvatar(userId, image) {
    // New file name each time, so browsers don't show the old cached picture.
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    const bucket = getSupabase().storage.from(AVATAR_BUCKET);
    const { error } = await bucket.upload(path, image, { contentType: "image/jpeg" });
    if (error) throw new Error("Could not upload the picture. Please try a smaller image.");
    // Clean up older pictures of this user.
    const { data: files } = await bucket.list(userId);
    const old = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
    if (old.length) await bucket.remove(old);
    return bucket.getPublicUrl(path).data.publicUrl;
  },
};

export const profileService: ProfileService =
  AUTH_MODE === "accounts" ? supabaseProfileService : demoProfileService;
