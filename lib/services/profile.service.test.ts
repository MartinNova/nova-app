import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, ProfileService, ProfileUpdate } from "@/types/profile";

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
const ME = "demo-1";

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubGlobal("window", { localStorage: memoryStorage() });
  ({ profileService: profiles } = await import("./profile.service"));
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

  it("is visible to other students on a public profile", async () => {
    await savePhone("+351 912 345 678");
    const others = await profiles.listProfiles();
    expect(others.find((p) => p.userId === ME)?.phone).toBe("+351 912 345 678");
  });
});
