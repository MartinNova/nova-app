import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLUBS, CONTACTS, ESSENTIAL_LINKS, STUDENT_UNION, TIPS } from "./new-at-nova";

/** The "New at Nova" page is only useful if every link and contact on it works. */
describe("New at Nova data", () => {
  it("links only go to https pages", () => {
    for (const link of ESSENTIAL_LINKS) expect(link.href, link.title).toMatch(/^https:\/\//);
  });

  it("every contact can be reached by e-mail or phone", () => {
    for (const contact of CONTACTS)
      expect(contact.email ?? contact.phone, contact.name).toBeTruthy();
  });

  it("e-mails and phone numbers are well formed", () => {
    for (const { email, phone, name } of CONTACTS) {
      if (email) expect(email, name).toMatch(/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/);
      // Portuguese numbers: +351 and 9 digits, so "tel:" links dial correctly.
      if (phone) expect(phone.replace(/\s/g, ""), name).toMatch(/^\+351\d{9}$/);
    }
  });

  it("every club links to its Instagram profile", () => {
    for (const club of [...CLUBS, STUDENT_UNION])
      expect(club.instagram, club.name).toMatch(/^https:\/\/www\.instagram\.com\/[\w.]+\/$/);
  });

  it("every club has a logo file and a short description", () => {
    for (const club of CLUBS) {
      expect(existsSync(`public${club.logo}`), club.name).toBe(true);
      expect(club.about.length, club.name).toBeGreaterThan(10);
      expect(club.about.length, club.name).toBeLessThanOrEqual(60);
    }
  });

  it("lists every Student Union club once", () => {
    expect(CLUBS).toHaveLength(39);
    expect(new Set(CLUBS.map((c) => c.name)).size).toBe(CLUBS.length);
    expect(new Set(CLUBS.map((c) => c.instagram)).size).toBe(CLUBS.length);
  });

  it("has a few short tips, not a wall of text", () => {
    expect(TIPS.length).toBeGreaterThan(0);
    for (const tip of TIPS) expect(tip.text.length, tip.title).toBeLessThan(220);
  });
});
