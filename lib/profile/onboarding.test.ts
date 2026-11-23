import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD_VISIBILITY } from "@/lib/profile/privacy";
import type { Profile } from "@/types/profile";
import {
  applyOnboarding,
  checkOnboardingStep,
  profileCompleteness,
  type OnboardingAnswers,
} from "./onboarding";

const profile: Profile = {
  userId: "u1",
  email: "till@example.com",
  studentId: "",
  username: "till_nova",
  firstName: "",
  lastName: "",
  avatarUrl: "",
  bio: "Hi",
  country: "DE",
  languages: ["German"],
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
} as Profile;

const answers: OnboardingAnswers = {
  firstName: " Till ",
  lastName: "Fassbender",
  avatarUrl: "https://example.com/a.jpg",
  program: "Management",
  sports: ["Padel", "Surf"],
  padelLevel: 2.5,
};

describe("onboarding", () => {
  it("needs a first name on the first step only", () => {
    expect(checkOnboardingStep(0, { ...answers, firstName: "  " })).toMatch(/first name/);
    expect(checkOnboardingStep(0, answers)).toBeNull();
    expect(checkOnboardingStep(1, { ...answers, program: "" })).toBeNull();
  });

  it("fills in the answers and keeps the rest of the profile", () => {
    const update = applyOnboarding(profile, answers);
    expect(update).toMatchObject({
      firstName: "Till",
      program: "Management",
      sports: ["Padel", "Surf"],
      padelLevel: 2.5,
      bio: "Hi",
      country: "DE",
      username: "till_nova",
    });
    expect(update).not.toHaveProperty("userId");
    expect(update).not.toHaveProperty("email");
  });

  it("only sets a padel level when padel was picked", () => {
    expect(applyOnboarding(profile, { ...answers, sports: ["Surf"] }).padelLevel).toBeNull();
  });

  it("measures how complete a profile is", () => {
    expect(profileCompleteness(profile)).toBe(0);
    expect(profileCompleteness({ ...profile, firstName: "Till", program: "Management" })).toBe(50);
    expect(
      profileCompleteness({
        ...profile,
        firstName: "T",
        program: "M",
        avatarUrl: "x",
        sports: ["Gym"],
      }),
    ).toBe(100);
  });
});
