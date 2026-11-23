import { describe, expect, it } from "vitest";
import type { Friendship } from "@/types/friends";
import { PRIVATE_FIELDS, type PrivateField, type Profile } from "@/types/profile";
import {
  DEFAULT_FIELD_VISIBILITY,
  canSee,
  isAcceptedFriendship,
  redactProfile,
  resolveFieldVisibility,
} from "./privacy";

const OWNER = "owner";
const FRIEND = "friend";
const STRANGER = "stranger";

const friendship = (status: Friendship["status"], a = FRIEND, b = OWNER): Friendship => ({
  id: "f1",
  requesterId: a,
  addresseeId: b,
  status,
  createdAt: "2026-11-20T10:00:00Z",
});
const accepted = friendship("accepted");

const profile: Profile = {
  userId: OWNER,
  email: "",
  studentId: "12345",
  username: "ana.silva",
  firstName: "Ana",
  lastName: "Silva",
  avatarUrl: "https://example.com/a.jpg",
  bio: "Hi!",
  country: "PT",
  languages: ["English", "Portuguese"],
  instagram: "ana",
  linkedin: "https://www.linkedin.com/in/ana",
  phone: "+351 912 345 678",
  program: "Finance",
  studyStart: "2026-09",
  studyEnd: "2028-06",
  studyStatus: "regular",
  sports: ["Padel"],
  padelLevel: 3,
  availability: [{ day: "Mon", from: "18:00", to: "22:00" }],
  visibility: "everyone",
  showInSuggestions: true,
  fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
};
const withAudience = (field: PrivateField, audience: Profile["fieldVisibility"][PrivateField]) => ({
  ...profile,
  fieldVisibility: { ...profile.fieldVisibility, [field]: audience },
});

describe("defaults", () => {
  it("shows everything to everyone except the mobile number (friends)", () => {
    for (const field of Object.keys(PRIVATE_FIELDS) as PrivateField[])
      expect(DEFAULT_FIELD_VISIBILITY[field]).toBe(field === "phone" ? "friends" : "everyone");
  });

  it("fills in missing or invalid stored settings", () => {
    expect(resolveFieldVisibility(null)).toEqual(DEFAULT_FIELD_VISIBILITY);
    expect(resolveFieldVisibility({ bio: "private", phone: "nonsense", other: "x" })).toEqual({
      ...DEFAULT_FIELD_VISIBILITY,
      bio: "private",
    });
  });
});

describe("canSee(field, viewer, owner, friendship)", () => {
  it("'everyone' is visible to strangers, friends and signed-out visitors", () => {
    const p = withAudience("bio", "everyone");
    expect(canSee("bio", STRANGER, p, null)).toBe(true);
    expect(canSee("bio", FRIEND, p, accepted)).toBe(true);
    expect(canSee("bio", null, p, null)).toBe(true);
  });

  it("'friends' needs an accepted friendship between viewer and owner", () => {
    const p = withAudience("phone", "friends");
    expect(canSee("phone", FRIEND, p, accepted)).toBe(true);
    // Either direction of the request counts.
    expect(canSee("phone", FRIEND, p, friendship("accepted", OWNER, FRIEND))).toBe(true);
    expect(canSee("phone", FRIEND, p, friendship("pending"))).toBe(false);
    expect(canSee("phone", STRANGER, p, null)).toBe(false);
    // Someone else's friendship with the owner doesn't help.
    expect(canSee("phone", STRANGER, p, accepted)).toBe(false);
    expect(canSee("phone", null, p, accepted)).toBe(false);
  });

  it("'only me' hides it from everyone else, even friends", () => {
    const p = withAudience("availability", "private");
    expect(canSee("availability", FRIEND, p, accepted)).toBe(false);
    expect(canSee("availability", STRANGER, p, null)).toBe(false);
  });

  it("you always see your own details", () => {
    const p = withAudience("photo", "private");
    expect(canSee("photo", OWNER, p, null)).toBe(true);
  });
});

describe("isAcceptedFriendship", () => {
  it("only matches the two people of an accepted request", () => {
    expect(isAcceptedFriendship(accepted, OWNER, FRIEND)).toBe(true);
    expect(isAcceptedFriendship(accepted, OWNER, STRANGER)).toBe(false);
    expect(isAcceptedFriendship(friendship("pending"), OWNER, FRIEND)).toBe(false);
    expect(isAcceptedFriendship(undefined, OWNER, FRIEND)).toBe(false);
  });
});

describe("redactProfile", () => {
  const hidden: Profile = {
    ...profile,
    fieldVisibility: {
      photo: "friends",
      bio: "private",
      country: "friends",
      program: "private",
      interests: "friends",
      availability: "friends",
      social: "private",
      phone: "friends",
    },
  };

  it("empties every hidden detail for a stranger, keeps the always-visible ones", () => {
    const seen = redactProfile(hidden, STRANGER, null);
    expect(seen).toMatchObject({
      avatarUrl: "",
      bio: "",
      country: "",
      program: "",
      sports: [],
      padelLevel: null,
      availability: [],
      instagram: "",
      linkedin: "",
      phone: "",
      // Always visible:
      firstName: "Ana",
      lastName: "Silva",
      username: "ana.silva",
      studentId: "12345",
      languages: ["English", "Portuguese"],
      studyStart: "2026-09",
      studyEnd: "2028-06",
      studyStatus: "regular",
    });
  });

  it("shows 'friends' details to a friend, but not 'only me' ones", () => {
    const seen = redactProfile(hidden, FRIEND, accepted);
    expect(seen.phone).toBe(profile.phone);
    expect(seen.avatarUrl).toBe(profile.avatarUrl);
    expect(seen.sports).toEqual(["Padel"]);
    expect(seen.availability).toEqual(profile.availability);
    expect(seen.bio).toBe("");
    expect(seen.program).toBe("");
    expect(seen.instagram).toBe("");
  });

  it("doesn't reveal the owner's settings to others", () => {
    expect(redactProfile(hidden, FRIEND, accepted).fieldVisibility).toEqual(
      DEFAULT_FIELD_VISIBILITY,
    );
  });

  it("returns your own profile untouched", () => {
    expect(redactProfile(hidden, OWNER, null)).toBe(hidden);
  });
});
