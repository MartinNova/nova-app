/**
 * Rooms & flats: data contract.
 * Students post a free room ("offer") or that they are looking for one ("wanted").
 * Implement `RoomService` in lib/services/rooms.service.ts.
 */

export type ListingKind = "offer" | "wanted";

export const ROOM_TYPES = {
  room: "Private room",
  shared: "Shared room",
  studio: "Studio",
  flat: "Whole flat",
} as const;
export type RoomType = keyof typeof ROOM_TYPES;

/** Areas students usually live in, from campus towards Lisbon. */
export const ROOM_AREAS = [
  "Carcavelos",
  "Parede",
  "São João do Estoril",
  "Estoril",
  "Cascais",
  "Oeiras",
  "Paço de Arcos",
  "Algés",
  "Belém",
  "Lisbon – Cais do Sodré / Chiado",
  "Lisbon – Santos / Estrela",
  "Lisbon – Avenidas Novas / Saldanha",
  "Lisbon – other",
] as const;

/** Last choice in the area pickers: opens a field for an area that isn't in the list. */
export const OTHER_AREA = "Other";

/** How many areas one listing can name. */
export const MAX_LISTING_AREAS = 5;

export const MAX_ROOM_PHOTOS = 4;

export interface RoomListing {
  id: string;
  kind: ListingKind;
  title: string;
  roomType: RoomType;
  /** One or more areas: names from ROOM_AREAS, or your own (typed in under "Other"). */
  areas: string[];
  /** Monthly rent in euros (for "wanted": the maximum budget). */
  rent: number;
  billsIncluded: boolean;
  /** "YYYY-MM-DD" */
  availableFrom: string;
  /** "YYYY-MM-DD", empty = open end. */
  availableUntil: string;
  description: string;
  /** Public image URLs (max. 4). */
  photos: string[];
  createdBy: string;
  createdAt: string;
}

export type NewRoomListing = Omit<RoomListing, "id" | "photos" | "createdBy" | "createdAt">;

/** Photos when saving the form: the ones you kept (URLs, when editing) and new ones. */
export interface ListingPhotos {
  kept: string[];
  added: Blob[];
}

export interface RoomFilter {
  kind: ListingKind;
  /** Any of these areas; empty or missing = all areas. */
  areas?: string[];
  maxRent?: number;
}

export interface RoomService {
  listListings(): Promise<RoomListing[]>;
  getListing(id: string): Promise<RoomListing | null>;
  /** `photos` are already resized JPEGs (see lib/rooms/photos.ts). */
  createListing(input: NewRoomListing, photos: Blob[], userId: string): Promise<RoomListing>;
  /** Changes your own listing. Whether it's an offer or a search stays the same. */
  updateListing(
    id: string,
    input: NewRoomListing,
    photos: ListingPhotos,
    userId: string,
  ): Promise<RoomListing>;
  deleteListing(id: string, userId: string): Promise<void>;
  /** Calls `listener` when listings change on another device. Returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}
