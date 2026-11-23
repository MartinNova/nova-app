import { describe, expect, it } from "vitest";
import { validateMessage } from "@/lib/messages/messages";
import { checkCanRequest } from "@/lib/padel/matches";
import {
  validatePassword,
  validateProfileUpdate,
  validateUsername,
} from "@/lib/profile/profile-rules";
import { validateNewListing } from "@/lib/rooms/rooms";
import { BIO_MAX_LENGTH, type ProfileUpdate } from "@/types/profile";
import type { NewRoomListing } from "@/types/rooms";

/**
 * Boundary values: exactly at a limit is accepted, one step past it is rejected.
 * These are the same limits the database checks (see supabase/migrations).
 */

const TODAY = "2026-11-19";

describe("accounts", () => {
  it("usernames: 3 to 20 lowercase characters", () => {
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("a".repeat(20))).toBeNull();
    expect(validateUsername("a".repeat(21))).not.toBeNull();
    expect(validateUsername("Till")).not.toBeNull();
    expect(validateUsername("till-f")).not.toBeNull();
    expect(validateUsername("")).not.toBeNull();
  });

  it("passwords: at least 8 characters", () => {
    expect(validatePassword("1234567")).not.toBeNull();
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("")).not.toBeNull();
  });

  const profile = (changes: Partial<ProfileUpdate> = {}): ProfileUpdate => ({
    studentId: "",
    username: "till.f",
    firstName: "Till",
    lastName: "",
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
    ...changes,
  });

  it("profile: first name required, bio limit, links", () => {
    expect(validateProfileUpdate(profile({ firstName: "   " }))).toMatch(/first name/);
    expect(validateProfileUpdate(profile({ bio: "x".repeat(BIO_MAX_LENGTH) }))).toBeNull();
    expect(validateProfileUpdate(profile({ bio: "x".repeat(BIO_MAX_LENGTH + 1) }))).toMatch(
      /intro/,
    );
    expect(validateProfileUpdate(profile({ instagram: "a".repeat(30) }))).toBeNull();
    expect(validateProfileUpdate(profile({ instagram: "a".repeat(31) }))).toMatch(/Instagram/);
    expect(
      validateProfileUpdate(profile({ linkedin: "https://www.linkedin.com/in/till" })),
    ).toBeNull();
    expect(validateProfileUpdate(profile({ linkedin: "https://evil.com/linkedin.com/" }))).toMatch(
      /LinkedIn/,
    );
  });
});

describe("rooms", () => {
  const listing = (changes: Partial<NewRoomListing> = {}): NewRoomListing => ({
    kind: "offer",
    title: "Room near campus",
    roomType: "room",
    area: "Carcavelos",
    rent: 550,
    billsIncluded: false,
    availableFrom: "2026-12-01",
    availableUntil: "",
    description: "",
    ...changes,
  });

  it("rent: whole euros from 1 to 5000", () => {
    expect(validateNewListing(listing({ rent: 1 }), TODAY)).toBeNull();
    expect(validateNewListing(listing({ rent: 5000 }), TODAY)).toBeNull();
    expect(validateNewListing(listing({ rent: 5001 }), TODAY)).toMatch(/Rent/);
    expect(validateNewListing(listing({ rent: -10 }), TODAY)).toMatch(/Rent/);
    expect(validateNewListing(listing({ rent: Number.NaN }), TODAY)).toMatch(/Rent/);
  });

  it("title: 5 to 80 characters, spaces don't count", () => {
    expect(validateNewListing(listing({ title: "a".repeat(80) }), TODAY)).toBeNull();
    expect(validateNewListing(listing({ title: "a".repeat(81) }), TODAY)).toMatch(/80/);
    expect(validateNewListing(listing({ title: "  abcd   " }), TODAY)).toMatch(/title/);
  });

  it("dates and description", () => {
    expect(validateNewListing(listing({ availableFrom: "" }), TODAY)).toMatch(/start date/);
    expect(
      validateNewListing(listing({ availableUntil: "2026-12-01" }), TODAY), // same day as start
    ).toMatch(/after the start/);
    expect(validateNewListing(listing({ description: "x".repeat(1000) }), TODAY)).toBeNull();
    expect(validateNewListing(listing({ description: "x".repeat(1001) }), TODAY)).toMatch(/1000/);
    expect(validateNewListing(listing({ roomType: "castle" as never }), TODAY)).toMatch(/type/);
  });
});

describe("messages", () => {
  it("1 to 1000 characters after trimming", () => {
    expect(validateMessage("a")).toBeNull();
    expect(validateMessage(` ${"x".repeat(1000)} `)).toBeNull();
    expect(validateMessage("x".repeat(1001))).not.toBeNull();
    expect(validateMessage("\n\t ")).not.toBeNull();
  });
});

describe("padel requests", () => {
  const match = {
    id: "m",
    date: "2026-11-20",
    time: "18:00",
    durationMinutes: 90,
    location: "Padel CIF",
    level: 2.5,
    maxPlayers: 4,
    playerIds: ["a"],
    guestCount: 0,
    description: "",
    createdBy: "a",
    createdAt: "2026-11-19T10:00:00Z",
  };

  it("note: up to 200 characters", () => {
    expect(() => checkCanRequest(match, "b", "x".repeat(200))).not.toThrow();
    expect(() => checkCanRequest(match, "b", "x".repeat(201))).toThrow(/200/);
  });
});
