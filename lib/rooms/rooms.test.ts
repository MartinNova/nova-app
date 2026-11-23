import { describe, expect, it } from "vitest";
import { createMockListings } from "@/data/rooms.mock";
import type { ListingKind, NewRoomListing, RoomListing } from "@/types/rooms";
import {
  filterListings,
  formatAvailability,
  formatRent,
  listingFormCopy,
  validateNewListing,
} from "./rooms";

const TODAY = "2026-11-17";

const input: NewRoomListing = {
  kind: "offer",
  title: "Sunny room near the beach",
  roomType: "room",
  area: "Carcavelos",
  rent: 550,
  billsIncluded: true,
  availableFrom: "2027-01-01",
  availableUntil: "",
  description: "",
};

const listing = (id: string, changes: Partial<RoomListing> = {}): RoomListing => ({
  ...input,
  id,
  photos: [],
  createdBy: "u1",
  createdAt: `2026-11-1${id}T10:00:00Z`,
  ...changes,
});

describe("validateNewListing", () => {
  it("accepts a valid listing", () => {
    expect(validateNewListing(input, TODAY)).toBeNull();
  });

  it("rejects short titles, odd rents and wrong dates", () => {
    expect(validateNewListing({ ...input, title: " Hi " }, TODAY)).toMatch(/title/);
    expect(validateNewListing({ ...input, rent: 0 }, TODAY)).toMatch(/Rent/);
    expect(validateNewListing({ ...input, rent: 99.5 }, TODAY)).toMatch(/Rent/);
    expect(validateNewListing({ ...input, availableUntil: "2026-12-01" }, TODAY)).toMatch(
      /after the start/,
    );
    expect(validateNewListing({ ...input, availableUntil: "2026-01-01" }, TODAY)).toMatch(/past/);
  });

  it("needs a known kind and names the price after it", () => {
    expect(validateNewListing({ ...input, kind: "wanted" }, TODAY)).toBeNull();
    expect(validateNewListing({ ...input, kind: "swap" as unknown as ListingKind }, TODAY)).toMatch(
      /offer or look/,
    );
    expect(validateNewListing({ ...input, kind: "wanted", rent: 0 }, TODAY)).toMatch(/^Budget/);
  });
});

describe("listingFormCopy", () => {
  it("follows the selected tab", () => {
    expect(listingFormCopy("offer")).toMatchObject({
      heading: "Offer a room",
      priceLabel: "Rent / month (€)",
      withPhotos: true,
    });
    expect(listingFormCopy("wanted")).toMatchObject({
      heading: "Look for a room",
      priceLabel: "Max. budget (€)",
      fromLabel: "Needed from",
      withPhotos: false,
    });
  });
});

describe("filterListings", () => {
  const all = [
    listing("1", { area: "Cascais", rent: 700 }),
    listing("2"),
    listing("3", { kind: "wanted" }),
    listing("4", { availableUntil: "2026-10-31" }),
  ];

  it("shows the chosen kind, newest first, without expired listings", () => {
    expect(filterListings(all, { kind: "offer" }, TODAY).map((l) => l.id)).toEqual(["2", "1"]);
    expect(filterListings(all, { kind: "wanted" }, TODAY).map((l) => l.id)).toEqual(["3"]);
  });

  it("filters by area and budget", () => {
    expect(filterListings(all, { kind: "offer", area: "Cascais" }, TODAY)).toHaveLength(1);
    expect(filterListings(all, { kind: "offer", maxRent: 600 }, TODAY).map((l) => l.id)).toEqual([
      "2",
    ]);
  });
});

describe("formatting", () => {
  it("formats rent", () => {
    expect(formatRent({ kind: "offer", rent: 550, billsIncluded: true })).toBe(
      "550 €/month · bills incl.",
    );
    expect(formatRent({ kind: "wanted", rent: 600, billsIncluded: false })).toBe(
      "up to 600 €/month",
    );
  });

  it("formats availability", () => {
    expect(formatAvailability({ availableFrom: "2026-11-01", availableUntil: "" }, TODAY)).toBe(
      "From now",
    );
    expect(
      formatAvailability({ availableFrom: "2027-02-01", availableUntil: "2027-06-30" }, TODAY),
    ).toBe("1 Feb 2027 – 30 Jun 2027");
  });
});

describe("demo listings", () => {
  it("are valid", () => {
    for (const l of createMockListings(new Date("2026-11-17T12:00:00Z")))
      expect(validateNewListing(l, TODAY)).toBeNull();
  });
});
