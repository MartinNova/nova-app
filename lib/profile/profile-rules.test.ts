import { describe, expect, it } from "vitest";
import type { ProfileUpdate } from "@/types/profile";
import {
  countryName,
  flagEmoji,
  formatMonth,
  initials,
  normalizePhone,
  normalizeUsername,
  phoneHref,
  studyProgress,
  validatePassword,
  validatePhone,
  validateProfileUpdate,
  validateStudentId,
  validateUsername,
} from "./profile-rules";

const update = (overrides: Partial<ProfileUpdate> = {}): ProfileUpdate => ({
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
  ...overrides,
});

describe("usernames", () => {
  it("normalizes and validates", () => {
    expect(normalizeUsername(" @Till.F ")).toBe("till.f");
    expect(validateUsername("till.f")).toBeNull();
    expect(validateUsername("ti")).toMatch(/3/);
    expect(validateUsername("till fassbender")).toMatch(/letters/);
  });
});

describe("validatePassword", () => {
  it("needs 8 characters", () => {
    expect(validatePassword("short")).toMatch(/8/);
    expect(validatePassword("long enough")).toBeNull();
  });
});

describe("validateProfileUpdate", () => {
  it("accepts a normal profile", () => {
    expect(validateProfileUpdate(update())).toBeNull();
  });
  it("rejects bad dates and links", () => {
    expect(validateProfileUpdate(update({ studyStart: "2026-09", studyEnd: "2026-01" }))).toMatch(
      /end before/,
    );
    expect(validateProfileUpdate(update({ linkedin: "linkedin.com/in/x" }))).toMatch(/LinkedIn/);
    expect(validateProfileUpdate(update({ instagram: "@till" }))).toMatch(/Instagram/);
  });
});

describe("study progress", () => {
  it("formats months", () => {
    expect(formatMonth("2026-09")).toBe("Sep 2026");
    expect(formatMonth("")).toBe("");
  });
  it("works out the year", () => {
    expect(studyProgress("2026-09", "2028-06", "2026-08")).toBe("Starts Sep 2026");
    expect(studyProgress("2026-09", "2028-06", "2026-11")).toBe("1st year");
    expect(studyProgress("2025-09", "2028-06", "2026-11")).toBe("2nd year");
    expect(studyProgress("2025-09", "2027-06", "2026-11")).toBe("Final year");
    expect(studyProgress("2024-09", "2026-06", "2026-11")).toBe("Graduated");
    expect(studyProgress("", "", "2026-11")).toBe("");
  });
});

describe("countries and initials", () => {
  it("builds flags and names", () => {
    expect(flagEmoji("PT")).toBe("🇵🇹");
    expect(flagEmoji("")).toBe("");
    expect(countryName("DE")).toBe("Germany");
  });
  it("falls back to the username", () => {
    expect(initials("Till", "Fassbender")).toBe("TF");
    expect(initials("", "", "till.f")).toBe("TI");
  });
});

describe("validateStudentId", () => {
  it("accepts a Nova student number or nothing", () => {
    expect(validateStudentId("")).toBeNull();
    expect(validateStudentId("79109")).toBeNull();
  });

  it("rejects letters, too short and too long numbers", () => {
    expect(validateStudentId("79a09")).toMatch(/numbers only/);
    expect(validateStudentId("123")).toMatch(/numbers only/);
    expect(validateStudentId("12345678901")).toMatch(/numbers only/);
    expect(validateProfileUpdate(update({ studentId: "abc" }))).toMatch(/Student ID/);
  });
});

describe("phone number", () => {
  it("tidies what people type", () => {
    expect(normalizePhone("  +351 912-345-678 ")).toBe("+351 912 345 678");
    expect(normalizePhone("0049 (151) 234/567")).toBe("+49 151 234 567");
    expect(normalizePhone("+ 351 912345678")).toBe("+351 912345678");
    expect(normalizePhone("912.345.678")).toBe("912 345 678");
    expect(normalizePhone("   ")).toBe("");
  });

  it("is optional, so empty is fine", () => {
    expect(validatePhone("")).toBeNull();
    expect(validateProfileUpdate(update({ phone: "" }))).toBeNull();
  });

  it("accepts local and international numbers", () => {
    expect(validatePhone("+351 912 345 678")).toBeNull();
    expect(validatePhone("912345678")).toBeNull();
    expect(validatePhone("+49 151 23456789")).toBeNull();
  });

  it("rejects letters, misplaced + and wrong lengths", () => {
    expect(validatePhone("call me")).toMatch(/digits only/);
    expect(validatePhone("+351 91a 345")).toMatch(/digits only/);
    expect(validatePhone("351+912")).toMatch(/digits only/);
    expect(validatePhone("+12 34")).toMatch(/too short/);
    expect(validatePhone("+1234567890123456")).toMatch(/too long/);
    expect(validateProfileUpdate(update({ phone: "abc" }))).toMatch(/Mobile number/);
  });

  it("builds a tel: link without spaces", () => {
    expect(phoneHref("+351 912 345 678")).toBe("tel:+351912345678");
  });
});
