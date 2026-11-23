import {
  DEFAULT_FIELD_VISIBILITY,
  redactProfile,
  resolveFieldVisibility,
} from "@/lib/profile/privacy";
import { normalizePhone, validateProfileUpdate } from "@/lib/profile/profile-rules";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import {
  PROFILES_VIEW,
  PROFILE_COLUMNS,
  rowToProfile,
  updateToRow,
  type ProfileRow,
} from "@/lib/supabase/profiles";
import type { Profile, ProfileService, ProfileUpdate } from "@/types/profile";
import { friendService } from "./friend.service";
import { userService } from "./user.service";

const PROFILES_KEY = "profiles";

/** Same clean-up for both modes before validating and saving (e.g. the phone number). */
function tidy(update: ProfileUpdate): ProfileUpdate {
  return {
    ...update,
    phone: normalizePhone(update.phone),
    fieldVisibility: resolveFieldVisibility(update.fieldVisibility),
  };
}
const AVATAR_BUCKET = "avatars";

/** Demo mode: a profile with everything, as its owner saved it. */
async function loadDemoProfile(userId: string): Promise<Profile | null> {
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
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  };
  const saved = readJSON<Record<string, Partial<ProfileUpdate>>>(PROFILES_KEY, {})[userId];
  return {
    userId,
    email: user.email ?? "",
    ...defaults,
    ...saved,
    // Profiles saved before this setting existed get the defaults.
    fieldVisibility: resolveFieldVisibility(saved?.fieldVisibility),
  };
}

/**
 * Demo mode applies the same privacy rules as the database view: the signed-in demo account
 * only gets the details it may see (friends = accepted requests in this browser).
 */
async function asSeenByViewer(profiles: Profile[]): Promise<Profile[]> {
  const viewer = await userService.getCurrentUser();
  const viewerId = viewer?.id ?? null;
  const friendships = viewerId ? await friendService.listMine(viewerId) : [];
  return profiles.map((p) =>
    redactProfile(
      p,
      viewerId,
      friendships.find((f) => f.requesterId === p.userId || f.addresseeId === p.userId),
    ),
  );
}

/** Demo mode: base data from the mock user, edits stored per user in localStorage. */
const demoProfileService: ProfileService = {
  async getProfile(userId) {
    const profile = await loadDemoProfile(userId);
    return profile ? ((await asSeenByViewer([profile]))[0] ?? null) : null;
  },
  async getProfileByUsername(username) {
    const all = await this.listProfiles();
    return all.find((p) => p.username === username.toLowerCase()) ?? null;
  },
  async listProfiles() {
    const users = await userService.listUsers();
    const profiles = await Promise.all(users.map((u) => loadDemoProfile(u.id)));
    return asSeenByViewer(
      profiles.filter((p): p is Profile => p !== null && p.visibility === "everyone"),
    );
  },
  async updateProfile(userId, input) {
    const update = tidy(input);
    const error = validateProfileUpdate(update);
    if (error) throw new Error(error);
    const all = readJSON<Record<string, ProfileUpdate>>(PROFILES_KEY, {});
    writeJSON(PROFILES_KEY, { ...all, [userId]: update });
    return (await loadDemoProfile(userId)) as Profile;
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

/**
 * Accounts mode: reads go through the `profile_cards` view (hidden details arrive empty),
 * writes go to the `profiles` table. RLS only allows editing your own row.
 */
const supabaseProfileService: ProfileService = {
  async getProfile(userId) {
    const { data, error } = await getSupabase()
      .from(PROFILES_VIEW)
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as unknown as ProfileRow, await emailIfMine(userId)) : null;
  },
  async getProfileByUsername(username) {
    const { data, error } = await getSupabase()
      .from(PROFILES_VIEW)
      .select(PROFILE_COLUMNS)
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data as unknown as ProfileRow) : null;
  },
  async listProfiles() {
    const { data, error } = await getSupabase()
      .from(PROFILES_VIEW)
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
    // No .select() here: the table doesn't hand out the private columns, the view does.
    const { error: dbError } = await getSupabase()
      .from("profiles")
      .update(updateToRow(update))
      .eq("id", userId);
    // 23505 = unique violation, i.e. the username is taken.
    if (dbError?.code === "23505") throw new Error("This username is already taken.");
    // 23514 = check violation, e.g. a phone number the app's check let through.
    if (dbError?.code === "23514") throw new Error("Please check your profile details.");
    if (dbError) throw dbError;
    const saved = await this.getProfile(userId);
    if (!saved) throw new Error("Could not load your profile. Please try again.");
    // The student number is changed through a checked function (digits only, your own row).
    const studentId = update.studentId.trim();
    if (studentId !== saved.studentId) {
      const { error: idError } = await getSupabase().rpc("set_my_student_id", {
        new_student_id: studentId,
      });
      if (idError) throw new Error("Could not save your student ID. Please try again.");
    }
    return { ...saved, studentId };
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
