import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendService } from "@/types/friends";
import type { Profile, ProfileService, ProfileUpdate } from "@/types/profile";
import type { UserService } from "@/types/user";

/** Mobile number through the real profile service (demo mode, so no network). */

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

let profiles: ProfileService;
let users: UserService;
let friends: FriendService;
const ME = "demo-1";
const FRIEND = "demo-2";
const STRANGER = "demo-3";

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubGlobal("window", { localStorage: memoryStorage() });
  ({ profileService: profiles } = await import("./profile.service"));
  ({ userService: users } = await import("./user.service"));
  ({ friendService: friends } = await import("./friend.service"));
  await users.setCurrentUser(ME);
});

async function savePhone(phone: string) {
  const current: Partial<Profile> = { ...(await profiles.getProfile(ME)) };
  delete current.userId;
  delete current.email;
  return profiles.updateProfile(ME, { ...(current as ProfileUpdate), phone });
}

describe("mobile number on the profile", () => {
  it("starts empty", async () => {
    expect((await profiles.getProfile(ME))?.phone).toBe("");
  });

  it("can be added (tidied up), changed and removed again", async () => {
    expect((await savePhone(" 00351 912-345-678 ")).phone).toBe("+351 912 345 678");
    expect((await profiles.getProfile(ME))?.phone).toBe("+351 912 345 678");

    await savePhone("+49 151 2345678");
    expect((await profiles.getProfile(ME))?.phone).toBe("+49 151 2345678");

    await savePhone("");
    expect((await profiles.getProfile(ME))?.phone).toBe("");
  });

  it("rejects an invalid number and keeps the old one", async () => {
    await savePhone("+351 912 345 678");
    await expect(savePhone("not a number")).rejects.toThrow(/Mobile number/);
    expect((await profiles.getProfile(ME))?.phone).toBe("+351 912 345 678");
  });

  it("is only visible to friends by default", async () => {
    await savePhone("+351 912 345 678");
    const request = await friends.sendRequest(ME, FRIEND);
    await friends.accept(request.id, FRIEND);

    await users.setCurrentUser(FRIEND);
    expect((await profiles.getProfile(ME))?.phone).toBe("+351 912 345 678");

    await users.setCurrentUser(STRANGER);
    expect((await profiles.getProfile(ME))?.phone).toBe("");
    const listed = (await profiles.listProfiles()).find((p) => p.userId === ME);
    expect(listed?.phone).toBe("");
    expect(listed?.firstName).toBe("Sofia");
  });
});

describe("who can see what (demo mode)", () => {
  async function saveVisibility(fieldVisibility: Partial<Profile["fieldVisibility"]>) {
    const current = (await profiles.getProfile(ME)) as Profile;
    const update: Partial<Profile> = { ...current, bio: "Hi!", program: "Finance" };
    delete update.userId;
    delete update.email;
    update.fieldVisibility = { ...current.fieldVisibility, ...fieldVisibility };
    return profiles.updateProfile(ME, update as ProfileUpdate);
  }

  it("keeps the settings for yourself and shows you everything", async () => {
    await saveVisibility({ bio: "private", program: "friends" });
    const mine = await profiles.getProfile(ME);
    expect(mine?.fieldVisibility.bio).toBe("private");
    expect(mine?.bio).toBe("Hi!");
    expect(mine?.program).toBe("Finance");
  });

  it("hides 'only me' details from friends and 'friends' details from strangers", async () => {
    await saveVisibility({ bio: "private", program: "friends", phone: "everyone" });
    const request = await friends.sendRequest(FRIEND, ME);

    await users.setCurrentUser(FRIEND);
    // Pending isn't enough.
    expect((await profiles.getProfile(ME))?.program).toBe("");
    await users.setCurrentUser(ME);
    await friends.accept(request.id, ME);

    await users.setCurrentUser(FRIEND);
    const asFriend = await profiles.getProfile(ME);
    expect(asFriend?.program).toBe("Finance");
    expect(asFriend?.bio).toBe("");
    // Others never get your settings.
    expect(asFriend?.fieldVisibility.bio).toBe("everyone");

    await users.setCurrentUser(STRANGER);
    const asStranger = await profiles.getProfileByUsername("sofia.almeida");
    expect(asStranger?.program).toBe("");
    expect(asStranger?.bio).toBe("");
    expect(asStranger?.studentId).toBe("90001");
  });
});

describe("usually free (demo mode)", () => {
  it("turns old day/time-of-day chips into time windows", async () => {
    window.localStorage.setItem(
      "campus-match:profiles",
      JSON.stringify({
        [ME]: { availabilityDays: ["Thu", "Fri"], availabilityTimes: ["Morning"] },
      }),
    );
    expect((await profiles.getProfile(ME))?.availability).toEqual([
      { day: "Thu", from: "08:00", to: "12:00" },
      { day: "Fri", from: "08:00", to: "12:00" },
    ]);
  });

  it("saves windows per day, merged, and rejects an end before the start", async () => {
    const current: Partial<Profile> = { ...(await profiles.getProfile(ME)) };
    delete current.userId;
    delete current.email;
    const base = current as ProfileUpdate;
    const saved = await profiles.updateProfile(ME, {
      ...base,
      availability: [
        { day: "Tue", from: "16:00", to: "18:00" },
        { day: "Mon", from: "09:00", to: "11:00" },
        { day: "Mon", from: "10:30", to: "12:00" },
      ],
    });
    expect(saved.availability).toEqual([
      { day: "Mon", from: "09:00", to: "12:00" },
      { day: "Tue", from: "16:00", to: "18:00" },
    ]);
    await expect(
      profiles.updateProfile(ME, {
        ...base,
        availability: [{ day: "Wed", from: "18:00", to: "09:00" }],
      }),
    ).rejects.toThrow(/end time/);
  });
});
