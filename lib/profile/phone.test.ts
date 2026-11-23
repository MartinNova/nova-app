import { describe, expect, it } from "vitest";
import { DIAL_CODES, joinPhone, splitPhone } from "./phone";
import { COUNTRY_CODES, validatePhone } from "./profile-rules";

describe("calling codes", () => {
  it("has a code for every country in the country picker", () => {
    const missing = COUNTRY_CODES.filter((c) => !/^\d{1,3}$/.test(DIAL_CODES[c] ?? ""));
    expect(missing).toEqual([]);
  });
});

describe("joinPhone", () => {
  it("puts the calling code in front", () => {
    expect(joinPhone("PT", "912 345 678")).toBe("+351 912 345 678");
    expect(joinPhone("PT", " 912-345-678 ")).toBe("+351 912 345 678");
  });

  it("drops the national 0, except where it belongs to the number", () => {
    expect(joinPhone("DE", "0151 2345678")).toBe("+49 151 2345678");
    expect(joinPhone("GB", "07700 900123")).toBe("+44 7700 900123");
    expect(joinPhone("IT", "06 1234 5678")).toBe("+39 06 1234 5678");
  });

  it("keeps a number that already has its own calling code", () => {
    expect(joinPhone("PT", "+49 151 2345678")).toBe("+49 151 2345678");
    expect(joinPhone("PT", "0049 151 2345678")).toBe("+49 151 2345678");
  });

  it("is empty without a number, so the phone is removed", () => {
    expect(joinPhone("PT", "")).toBe("");
    expect(joinPhone("DE", "  ")).toBe("");
    expect(joinPhone("DE", "0")).toBe("");
  });

  it("gives numbers the profile check accepts", () => {
    expect(validatePhone(joinPhone("DE", "0151 2345678"))).toBeNull();
    expect(validatePhone(joinPhone("PT", "91a"))).not.toBeNull();
  });
});

describe("splitPhone", () => {
  it("finds the calling code", () => {
    expect(splitPhone("+351 912 345 678")).toEqual({ country: "PT", local: "912 345 678" });
    expect(splitPhone("+49 151 2345678")).toEqual({ country: "DE", local: "151 2345678" });
    expect(splitPhone("+352 621 123 456")).toEqual({ country: "LU", local: "621 123 456" });
    expect(splitPhone("+4915123456")).toEqual({ country: "DE", local: "15123456" });
  });

  it("uses the home country for shared codes", () => {
    expect(splitPhone("+1 415 555 0100")).toEqual({ country: "US", local: "415 555 0100" });
    expect(splitPhone("+1 415 555 0100", "CA").country).toBe("CA");
    expect(splitPhone("+7 912 345 6789", "KZ").country).toBe("KZ");
  });

  it("starts with the home country, or Portugal, when there is no number", () => {
    expect(splitPhone("", "DE")).toEqual({ country: "DE", local: "" });
    expect(splitPhone("")).toEqual({ country: "PT", local: "" });
    expect(splitPhone("", "XX").country).toBe("PT");
  });

  it("round-trips with joinPhone", () => {
    for (const phone of ["+351 912 345 678", "+44 7700 900123", "+39 06 1234 5678"]) {
      const { country, local } = splitPhone(phone);
      expect(joinPhone(country, local)).toBe(phone);
    }
  });
});
