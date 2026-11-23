import {
  ROOM_TYPES,
  type ListingKind,
  type NewRoomListing,
  type RoomFilter,
  type RoomListing,
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
  if (!input.area.trim()) return "Please pick an area.";
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

/** Listings that are still relevant, matching the filter, newest first. */
export function filterListings(
  listings: RoomListing[],
  filter: RoomFilter,
  today: string,
): RoomListing[] {
  return listings
    .filter((l) => l.kind === filter.kind)
    .filter((l) => !l.availableUntil || l.availableUntil >= today)
    .filter((l) => !filter.areas?.length || filter.areas.includes(l.area))
    .filter((l) => filter.maxRent === undefined || l.rent <= filter.maxRent)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Label of the area filter: "All areas", "Cascais", "Cascais +2". */
export function areasLabel(areas: string[]): string {
  if (areas.length === 0) return "All areas";
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
