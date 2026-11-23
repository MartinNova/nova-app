import type { ListingRef } from "@/types/messages";
import {
  MAX_LISTING_AREAS,
  OTHER_AREA,
  ROOM_AREAS,
  ROOM_TYPES,
  type ListingKind,
  type NewRoomListing,
  type RoomFilter,
  type RoomListing,
  type RoomSort,
} from "@/types/rooms";

const MAX_RENT = 5000;

/** Returns an error message, or null if the listing can be posted. */
export function validateNewListing(input: NewRoomListing, today: string): string | null {
  if (input.kind !== "offer" && input.kind !== "wanted")
    return "Please choose whether you offer or look for a room.";
  const title = input.title.trim();
  if (title.length < 5) return "Please give your listing a title (at least 5 characters).";
  if (title.length > 80) return "The title can have at most 80 characters.";
  if (!(input.roomType in ROOM_TYPES)) return "Please pick a room type.";
  const areas = input.areas.map((a) => a.trim()).filter(Boolean);
  if (areas.length === 0) return "Please pick at least one area.";
  if (areas.length > MAX_LISTING_AREAS) return `You can pick up to ${MAX_LISTING_AREAS} areas.`;
  if (areas.some((a) => a.length > 60)) return "An area name can have at most 60 characters.";
  if (!Number.isInteger(input.rent) || input.rent < 1 || input.rent > MAX_RENT)
    return `${input.kind === "wanted" ? "Budget" : "Rent"} must be a whole number between 1 and ${MAX_RENT} €.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.availableFrom)) return "Please pick a start date.";
  if (input.availableUntil && input.availableUntil < today)
    return "The end date is already in the past.";
  if (input.availableUntil && input.availableUntil <= input.availableFrom)
    return "The end date must be after the start date.";
  if (input.description.trim().length > 1000)
    return "The description can have at most 1000 characters.";
  return null;
}

/** Texts of the "new listing" form; the kind comes from the selected tab. */
export function listingFormCopy(kind: ListingKind) {
  return kind === "offer"
    ? {
        heading: "Offer a room",
        titlePlaceholder: "e.g. Bright room 10 min from campus",
        priceLabel: "Rent / month (€)",
        fromLabel: "Available from",
        descriptionPlaceholder: "Flatmates, furniture, distance to train/campus, house rules…",
        withPhotos: true,
      }
    : {
        heading: "Look for a room",
        titlePlaceholder: "e.g. Looking for a room for spring semester",
        priceLabel: "Max. budget (€)",
        fromLabel: "Needed from",
        descriptionPlaceholder: "Who you are, what you're looking for…",
        withPhotos: false,
      };
}

/** Listings that are still relevant and match the filter, sorted (newest first by default). */
export function filterListings(
  listings: RoomListing[],
  filter: RoomFilter,
  today: string,
  sort: RoomSort = "newest",
): RoomListing[] {
  const { areas, minRent, maxRent, roomTypes, availableBy } = filter;
  const shown = listings
    .filter((l) => l.kind === filter.kind)
    .filter((l) => !l.availableUntil || l.availableUntil >= today)
    .filter((l) => !areas?.length || l.areas.some((a) => matchesArea(a, areas)))
    .filter((l) => minRent === undefined || l.rent >= minRent)
    .filter((l) => maxRent === undefined || l.rent <= maxRent)
    .filter((l) => !roomTypes?.length || roomTypes.includes(l.roomType))
    .filter((l) => !filter.billsIncluded || l.billsIncluded)
    .filter((l) => !filter.withPhotos || l.photos.length > 0)
    .filter((l) => !availableBy || l.availableFrom <= availableBy);
  return sortListings(shown, sort);
}

/** Sorts a copy. Ties (same price or date) keep newest first. */
export function sortListings(listings: RoomListing[], sort: RoomSort): RoomListing[] {
  const newest = (a: RoomListing, b: RoomListing) => b.createdAt.localeCompare(a.createdAt);
  const by: Record<RoomSort, (a: RoomListing, b: RoomListing) => number> = {
    newest,
    "price-asc": (a, b) => a.rent - b.rent || newest(a, b),
    "price-desc": (a, b) => b.rent - a.rent || newest(a, b),
    soonest: (a, b) => a.availableFrom.localeCompare(b.availableFrom) || newest(a, b),
  };
  return [...listings].sort(by[sort]);
}

/** How many of the filters in the "Filters" sheet are on (for the badge on the button). */
export function activeFilterCount(filter: RoomFilter): number {
  return [
    filter.minRent !== undefined || filter.maxRent !== undefined,
    Boolean(filter.roomTypes?.length),
    Boolean(filter.billsIncluded),
    Boolean(filter.withPhotos),
    Boolean(filter.availableBy),
  ].filter(Boolean).length;
}

/** Upper end of the price slider: the highest rent, rounded up to the next 100 (at least 500). */
export function priceCeiling(rents: number[]): number {
  return Math.max(500, Math.ceil(Math.max(0, ...rents) / 100) * 100);
}

/** How many listings fall into each of `buckets` equal price ranges from 0 to `ceiling`. */
export function priceHistogram(rents: number[], ceiling: number, buckets = 30): number[] {
  const counts = Array<number>(buckets).fill(0);
  for (const rent of rents) {
    const i = Math.min(buckets - 1, Math.floor((rent / ceiling) * buckets));
    counts[Math.max(0, i)] += 1;
  }
  return counts;
}

const KNOWN_AREAS: readonly string[] = ROOM_AREAS;

/** Whether an area is one you typed in yourself (not from the list). */
export const isCustomArea = (area: string) => !KNOWN_AREAS.includes(area);

/** A listing's area is in the filter; "Other" in the filter catches every typed-in area. */
function matchesArea(area: string, chosen: string[]) {
  return chosen.includes(area) || (chosen.includes(OTHER_AREA) && isCustomArea(area));
}

/** The areas to save from the picker: ticked ones from the list, plus the typed-in one for "Other". */
export function areasToSave(ticked: string[], other: string): string[] {
  const own = ticked.includes(OTHER_AREA) ? other.trim() : "";
  const list = ticked.filter((a) => a !== OTHER_AREA);
  return own && !list.includes(own) ? [...list, own] : list;
}

/** The other way round, to fill in the picker when editing. */
export function areasToPicker(areas: string[]): { ticked: string[]; other: string } {
  const own = areas.filter(isCustomArea);
  const ticked = areas.filter((a) => !isCustomArea(a));
  return own.length
    ? { ticked: [...ticked, OTHER_AREA], other: own.join(", ") }
    : { ticked, other: "" };
}

/** "Carcavelos, Parede" on cards and the listing page. */
export const formatAreas = (areas: string[]) => areas.join(", ");

/** Label of the area filter: "All areas", "Cascais", "Cascais +2". */
export function areasLabel(areas: string[], none = "All areas"): string {
  if (areas.length === 0) return none;
  return areas.length === 1 ? areas[0] : `${areas[0]} +${areas.length - 1}`;
}

/** "550 €/month · bills incl." or "up to 600 €/month" for "wanted". */
export function formatRent(listing: Pick<RoomListing, "kind" | "rent" | "billsIncluded">): string {
  const base = `${listing.kind === "wanted" ? "up to " : ""}${listing.rent} €/month`;
  return listing.billsIncluded ? `${base} · bills incl.` : base;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** "From now", "From 1 Feb 2027", "1 Feb 2027 – 30 Jun 2027" */
export function formatAvailability(
  listing: Pick<RoomListing, "availableFrom" | "availableUntil">,
  today: string,
): string {
  const from = listing.availableFrom <= today ? "now" : formatDate(listing.availableFrom);
  if (!listing.availableUntil) return from === "now" ? "From now" : `From ${from}`;
  return `${from === "now" ? "Now" : from} – ${formatDate(listing.availableUntil)}`;
}

/** What a chat message shows about a listing ("Message" on the listing page). */
export function toListingRef(listing: RoomListing): ListingRef {
  return {
    id: listing.id,
    title: listing.title,
    subtitle: `${formatRent(listing)} · ${formatAreas(listing.areas)}`,
    photo: listing.photos[0] ?? null,
  };
}
