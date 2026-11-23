import { describe, expect, it } from "vitest";
import { createMockListings } from "@/data/rooms.mock";
import {
  OTHER_AREA,
  type ListingKind,
  type NewRoomListing,
  type RoomFilter,
  type RoomListing,
  type RoomSort,
} from "@/types/rooms";
import {
  activeFilterCount,
  areasLabel,
  areasToPicker,
  areasToSave,
  formatAreas,
  filterListings,
  formatAvailability,
  formatRent,
  listingFormCopy,
  priceCeiling,
  priceHistogram,
  sortListings,
  validateNewListing,
} from "./rooms";

const TODAY = "2026-11-17";

const input: NewRoomListing = {
  kind: "offer",
  title: "Sunny room near the beach",
  roomType: "room",
  areas: ["Carcavelos"],
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
    listing("1", { areas: ["Cascais"], rent: 700 }),
    listing("2"),
    listing("3", { kind: "wanted" }),
    listing("4", { availableUntil: "2026-10-31" }),
  ];

  it("shows the chosen kind, newest first, without expired listings", () => {
    expect(filterListings(all, { kind: "offer" }, TODAY).map((l) => l.id)).toEqual(["2", "1"]);
    expect(filterListings(all, { kind: "wanted" }, TODAY).map((l) => l.id)).toEqual(["3"]);
  });

  it("filters by area and budget", () => {
    expect(filterListings(all, { kind: "offer", areas: ["Cascais"] }, TODAY)).toHaveLength(1);
    expect(filterListings(all, { kind: "offer", areas: [] }, TODAY)).toHaveLength(2);
    expect(filterListings(all, { kind: "offer", maxRent: 600 }, TODAY).map((l) => l.id)).toEqual([
      "2",
    ]);
  });

  it("shows listings in any of several areas", () => {
    const more = [
      ...all,
      listing("5", { areas: ["Oeiras"] }),
      listing("6", { areas: ["Estoril"] }),
    ];
    const ids = filterListings(more, { kind: "offer", areas: ["Cascais", "Oeiras"] }, TODAY).map(
      (l) => l.id,
    );
    expect(ids.sort()).toEqual(["1", "5"]);
  });

  it("a listing in several areas shows up for each of them", () => {
    const both = [listing("7", { areas: ["Parede", "Oeiras"] })];
    expect(filterListings(both, { kind: "offer", areas: ["Oeiras"] }, TODAY)).toHaveLength(1);
    expect(filterListings(both, { kind: "offer", areas: ["Parede"] }, TODAY)).toHaveLength(1);
    expect(filterListings(both, { kind: "offer", areas: ["Belém"] }, TODAY)).toHaveLength(0);
  });

  it('"Other" in the filter finds typed-in areas', () => {
    const own = [listing("8", { areas: ["Sintra"] }), listing("9", { areas: ["Parede"] })];
    expect(
      filterListings(own, { kind: "offer", areas: [OTHER_AREA] }, TODAY).map((l) => l.id),
    ).toEqual(["8"]);
  });

  it("labels the area filter", () => {
    expect(areasLabel([])).toBe("All areas");
    expect(areasLabel(["Cascais"])).toBe("Cascais");
    expect(areasLabel(["Cascais", "Oeiras", "Estoril"])).toBe("Cascais +2");
    expect(areasLabel([], "Pick areas")).toBe("Pick areas");
  });
});

describe("areas in the form", () => {
  it("saves the ticked areas plus the typed-in one for Other", () => {
    expect(areasToSave(["Carcavelos", OTHER_AREA], " Sintra ")).toEqual(["Carcavelos", "Sintra"]);
    expect(areasToSave(["Carcavelos"], "Sintra")).toEqual(["Carcavelos"]);
    expect(areasToSave([OTHER_AREA], "")).toEqual([]);
  });

  it("fills the picker back in when editing", () => {
    expect(areasToPicker(["Parede", "Sintra"])).toEqual({
      ticked: ["Parede", OTHER_AREA],
      other: "Sintra",
    });
    expect(areasToPicker(["Parede"])).toEqual({ ticked: ["Parede"], other: "" });
  });

  it("needs one to five areas", () => {
    expect(validateNewListing({ ...input, areas: [] }, TODAY)).toMatch(/at least one area/);
    expect(validateNewListing({ ...input, areas: ["  "] }, TODAY)).toMatch(/at least one area/);
    expect(validateNewListing({ ...input, areas: ["a", "b", "c", "d", "e", "f"] }, TODAY)).toMatch(
      /up to 5/,
    );
    expect(validateNewListing({ ...input, areas: ["Parede", "Oeiras"] }, TODAY)).toBeNull();
  });
});

describe("formatAreas", () => {
  it("lists all areas", () => {
    expect(formatAreas(["Carcavelos", "Parede"])).toBe("Carcavelos, Parede");
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

describe("more filters", () => {
  const all = [
    listing("1", { rent: 450, roomType: "shared", billsIncluded: false }),
    listing("2", { rent: 700, roomType: "studio", photos: ["a.jpg"] }),
    listing("3", { rent: 900, roomType: "flat", availableFrom: "2027-03-01" }),
  ];
  const ids = (filter: Partial<RoomFilter>) =>
    filterListings(all, { kind: "offer", ...filter }, TODAY)
      .map((l) => l.id)
      .sort();

  it("price range: from and up to", () => {
    expect(ids({ minRent: 500 })).toEqual(["2", "3"]);
    expect(ids({ minRent: 500, maxRent: 800 })).toEqual(["2"]);
  });

  it("room types, bills, photos and move-in date", () => {
    expect(ids({ roomTypes: ["studio", "flat"] })).toEqual(["2", "3"]);
    expect(ids({ billsIncluded: true })).toEqual(["2", "3"]);
    expect(ids({ withPhotos: true })).toEqual(["2"]);
    expect(ids({ availableBy: "2027-02-01" })).toEqual(["1", "2"]);
  });

  it("counts the filters that are on", () => {
    expect(activeFilterCount({ kind: "offer" })).toBe(0);
    expect(
      activeFilterCount({ kind: "offer", minRent: 300, maxRent: 600, billsIncluded: true }),
    ).toBe(2);
  });
});

describe("sorting", () => {
  const all = [
    listing("1", { rent: 700, availableFrom: "2027-02-01" }),
    listing("2", { rent: 450, availableFrom: "2027-03-01" }),
    listing("3", { rent: 900, availableFrom: "2027-01-15" }),
  ];
  const order = (sort: RoomSort) => sortListings(all, sort).map((l) => l.id);

  it("newest, cheapest, most expensive, soonest", () => {
    expect(order("newest")).toEqual(["3", "2", "1"]);
    expect(order("price-asc")).toEqual(["2", "1", "3"]);
    expect(order("price-desc")).toEqual(["3", "1", "2"]);
    expect(order("soonest")).toEqual(["3", "1", "2"]);
  });

  it("does not change the list it was given", () => {
    sortListings(all, "price-asc");
    expect(all.map((l) => l.id)).toEqual(["1", "2", "3"]);
  });
});

describe("price slider", () => {
  it("ends at the highest rent, rounded up to 100", () => {
    expect(priceCeiling([450, 1230])).toBe(1300);
    expect(priceCeiling([])).toBe(500);
  });

  it("counts listings per price range", () => {
    expect(priceHistogram([0, 120, 199, 950, 1000], 1000, 5)).toEqual([3, 0, 0, 0, 2]);
  });
});
