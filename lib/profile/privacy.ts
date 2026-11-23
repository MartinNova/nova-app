import type { Friendship } from "@/types/friends";
import {
  AUDIENCES,
  PRIVATE_FIELDS,
  type Audience,
  type FieldVisibility,
  type PrivateField,
  type Profile,
} from "@/types/profile";

/**
 * Per-detail privacy ("Everyone" / "Friends" / "Only me").
 * The same rules run in the database (view `profile_cards`, see supabase/migrations), so hidden
 * details never leave Supabase; demo mode applies them here before handing out a profile.
 */

/**
 * Everything is visible by default, like before this setting existed, so profiles stay useful for
 * finding padel partners or flatmates. The mobile number is the exception: it is the one detail
 * that lets a stranger contact you outside the app, so only friends see it unless you open it up.
 * Keep in sync with public.field_visible() in the migration.
 */
export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  photo: "everyone",
  bio: "everyone",
  country: "everyone",
  program: "everyone",
  interests: "everyone",
  availability: "everyone",
  social: "everyone",
  phone: "friends",
};

const isAudience = (value: unknown): value is Audience =>
  typeof value === "string" && value in AUDIENCES;

/** Stored settings (possibly partial or from an older app version) -> one audience per field. */
export function resolveFieldVisibility(raw: unknown): FieldVisibility {
  const stored = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = { ...DEFAULT_FIELD_VISIBILITY };
  for (const field of Object.keys(PRIVATE_FIELDS) as PrivateField[]) {
    const value = stored[field];
    if (isAudience(value)) result[field] = value;
  }
  return result;
}

/** True if the two students are friends: a request between them that was accepted. */
export function isAcceptedFriendship(
  friendship: Friendship | null | undefined,
  a: string,
  b: string,
): boolean {
  if (!friendship || friendship.status !== "accepted") return false;
  return (
    (friendship.requesterId === a && friendship.addresseeId === b) ||
    (friendship.requesterId === b && friendship.addresseeId === a)
  );
}

/**
 * May `viewerId` see `field` on `owner`'s profile?
 * You always see your own details; "friends" needs an accepted request between the two of you
 * (a pending one doesn't count); nobody signed out (viewerId null) sees more than "everyone".
 */
export function canSee(
  field: PrivateField,
  viewerId: string | null,
  owner: Pick<Profile, "userId" | "fieldVisibility">,
  friendship: Friendship | null | undefined,
): boolean {
  if (viewerId !== null && viewerId === owner.userId) return true;
  const audience = owner.fieldVisibility[field] ?? DEFAULT_FIELD_VISIBILITY[field];
  if (audience === "everyone") return true;
  if (audience === "friends")
    return viewerId !== null && isAcceptedFriendship(friendship, viewerId, owner.userId);
  return false;
}

/** The profile as `viewerId` may see it: hidden details are emptied, settings aren't shared. */
export function redactProfile(
  profile: Profile,
  viewerId: string | null,
  friendship: Friendship | null | undefined,
): Profile {
  if (viewerId !== null && viewerId === profile.userId) return profile;
  const show = (field: PrivateField) => canSee(field, viewerId, profile, friendship);
  const interests = show("interests");
  const availability = show("availability");
  const social = show("social");
  return {
    ...profile,
    avatarUrl: show("photo") ? profile.avatarUrl : "",
    bio: show("bio") ? profile.bio : "",
    country: show("country") ? profile.country : "",
    program: show("program") ? profile.program : "",
    sports: interests ? profile.sports : [],
    padelLevel: interests ? profile.padelLevel : null,
    availabilityDays: availability ? profile.availabilityDays : [],
    availabilityTimes: availability ? profile.availabilityTimes : [],
    instagram: social ? profile.instagram : "",
    linkedin: social ? profile.linkedin : "",
    phone: show("phone") ? profile.phone : "",
    // Others don't learn what you hide from whom.
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
  };
}
