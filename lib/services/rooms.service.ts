import { createMockListings } from "@/data/rooms.mock";
import { toISODate } from "@/lib/padel/dates";
import { validateNewListing } from "@/lib/rooms/rooms";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase, liveChannel } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import { MAX_ROOM_PHOTOS, type RoomListing, type RoomService, type RoomType } from "@/types/rooms";
import { hasSession } from "./user.service";

const LISTINGS_KEY = "room-listings";
const PHOTO_BUCKET = "room-photos";

/** Listings saved in this browser before several areas existed have just `area`. */
type StoredListing = RoomListing & { area?: string };

function load(): RoomListing[] {
  const stored = readJSON<StoredListing[] | null>(LISTINGS_KEY, null);
  if (!stored) return createMockListings(new Date());
  return stored.map(({ area, ...listing }) => ({
    ...listing,
    areas: listing.areas?.length ? listing.areas : area ? [area] : [],
  }));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.readAsDataURL(blob);
  });
}

/** Demo mode: listings live in this browser (localStorage), photos as data URLs. */
const localRoomService: RoomService = {
  async listListings() {
    return load();
  },
  async getListing(id) {
    return load().find((l) => l.id === id) ?? null;
  },
  async createListing(input, photos, userId) {
    const error = validateNewListing(input, toISODate(new Date()));
    if (error) throw new Error(error);
    const listing: RoomListing = {
      ...input,
      title: input.title.trim(),
      areas: cleanAreas(input.areas),
      description: input.description.trim(),
      id: crypto.randomUUID(),
      photos: await Promise.all(photos.slice(0, MAX_ROOM_PHOTOS).map(toDataUrl)),
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    writeJSON(LISTINGS_KEY, [listing, ...load()]);
    return listing;
  },
  async updateListing(id, input, photos, userId) {
    const listings = load();
    const old = listings.find((l) => l.id === id);
    if (!old) throw new Error("Listing not found.");
    if (old.createdBy !== userId) throw new Error("Only the person who posted it can edit it.");
    const error = validateNewListing({ ...input, kind: old.kind }, toISODate(new Date()));
    if (error) throw new Error(error);
    const added = await Promise.all(photos.added.map(toDataUrl));
    const updated: RoomListing = {
      ...old,
      ...input,
      kind: old.kind,
      title: input.title.trim(),
      areas: cleanAreas(input.areas),
      description: input.description.trim(),
      photos: [...photos.kept, ...added].slice(0, MAX_ROOM_PHOTOS),
    };
    writeJSON(
      LISTINGS_KEY,
      listings.map((l) => (l.id === id ? updated : l)),
    );
    return updated;
  },
  async deleteListing(id, userId) {
    const listings = load();
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;
    if (listing.createdBy !== userId) throw new Error("Only the person who posted it can delete.");
    writeJSON(
      LISTINGS_KEY,
      listings.filter((l) => l.id !== id),
    );
  },
  onChange() {
    return () => {};
  },
};

/** One row of `room_listings` (see supabase/migrations). */
interface ListingRow {
  id: string;
  kind: RoomListing["kind"];
  title: string;
  room_type: RoomType;
  /** First area, kept for older app versions. */
  area: string;
  areas: string[] | null;
  rent: number;
  bills_included: boolean;
  available_from: string;
  available_until: string | null;
  description: string;
  photos: string[];
  created_by: string;
  created_at: string;
}

function rowToListing(row: ListingRow): RoomListing {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    roomType: row.room_type,
    areas: row.areas?.length ? row.areas : [row.area],
    rent: row.rent,
    billsIncluded: row.bills_included,
    availableFrom: row.available_from,
    availableUntil: row.available_until ?? "",
    description: row.description,
    photos: row.photos,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const cleanAreas = (areas: string[]) => areas.map((a) => a.trim()).filter(Boolean);

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

/** Accounts mode: shared listings in Supabase, photos in the `room-photos` bucket. */
const supabaseRoomService: RoomService = {
  async listListings() {
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase()
      .from("room_listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return (data as ListingRow[]).map(rowToListing);
  },
  async getListing(id) {
    const { data, error } = await getSupabase()
      .from("room_listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error);
    return data ? rowToListing(data as ListingRow) : null;
  },
  async createListing(input, photos, userId) {
    const problem = validateNewListing(input, toISODate(new Date()));
    if (problem) throw new Error(problem);

    // Photos first: <user id>/<listing id>/<n>.jpg, so deleting the listing can remove the folder.
    const id = crypto.randomUUID();
    const bucket = getSupabase().storage.from(PHOTO_BUCKET);
    const urls: string[] = [];
    for (const [i, photo] of photos.slice(0, MAX_ROOM_PHOTOS).entries()) {
      const path = `${userId}/${id}/${i + 1}.jpg`;
      const { error } = await bucket.upload(path, photo, { contentType: "image/jpeg" });
      if (error) throw new Error("Could not upload a photo. Please try smaller images.");
      urls.push(bucket.getPublicUrl(path).data.publicUrl);
    }

    const { data, error } = await getSupabase()
      .from("room_listings")
      .insert({
        id,
        kind: input.kind,
        title: input.title.trim(),
        room_type: input.roomType,
        area: cleanAreas(input.areas)[0],
        areas: cleanAreas(input.areas),
        rent: input.rent,
        bills_included: input.billsIncluded,
        available_from: input.availableFrom,
        available_until: input.availableUntil || null,
        description: input.description.trim(),
        photos: urls,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) {
      await bucket.remove(urls.map((_, i) => `${userId}/${id}/${i + 1}.jpg`));
      fail(error);
    }
    return rowToListing(data as ListingRow);
  },
  async updateListing(id, input, photos, userId) {
    const old = await this.getListing(id);
    if (!old) throw new Error("Listing not found.");
    if (old.createdBy !== userId) throw new Error("Only the person who posted it can edit it.");
    const problem = validateNewListing({ ...input, kind: old.kind }, toISODate(new Date()));
    if (problem) throw new Error(problem);

    // New photos get their own names, so they never overwrite one that is still in use.
    const bucket = getSupabase().storage.from(PHOTO_BUCKET);
    const room = MAX_ROOM_PHOTOS - photos.kept.length;
    const uploaded: string[] = [];
    for (const photo of photos.added.slice(0, Math.max(0, room))) {
      const path = `${userId}/${id}/${crypto.randomUUID()}.jpg`;
      const { error } = await bucket.upload(path, photo, { contentType: "image/jpeg" });
      if (error) {
        if (uploaded.length) await bucket.remove(uploaded);
        throw new Error("Could not upload a photo. Please try smaller images.");
      }
      uploaded.push(path);
    }
    const urls = [...photos.kept, ...uploaded.map((p) => bucket.getPublicUrl(p).data.publicUrl)];

    const { data, error } = await getSupabase()
      .from("room_listings")
      .update({
        title: input.title.trim(),
        room_type: input.roomType,
        area: cleanAreas(input.areas)[0],
        areas: cleanAreas(input.areas),
        rent: input.rent,
        bills_included: input.billsIncluded,
        available_from: input.availableFrom,
        available_until: input.availableUntil || null,
        description: input.description.trim(),
        photos: urls,
      })
      .eq("id", id)
      .eq("created_by", userId)
      .select("*")
      .single();
    if (error) {
      if (uploaded.length) await bucket.remove(uploaded);
      fail(error);
    }

    // Photos you removed: delete their files too (only wasted space if this fails).
    const { data: files } = await bucket.list(`${userId}/${id}`);
    const unused = (files ?? [])
      .map((file) => `${userId}/${id}/${file.name}`)
      .filter((path) => !urls.includes(bucket.getPublicUrl(path).data.publicUrl));
    if (unused.length) await bucket.remove(unused);
    return rowToListing(data as ListingRow);
  },
  async deleteListing(id, userId) {
    const { error } = await getSupabase()
      .from("room_listings")
      .delete()
      .eq("id", id)
      .eq("created_by", userId);
    if (error) fail(error);
    const bucket = getSupabase().storage.from(PHOTO_BUCKET);
    const { data: files } = await bucket.list(`${userId}/${id}`);
    if (files?.length) await bucket.remove(files.map((f) => `${userId}/${id}/${f.name}`));
  },
  onChange(listener) {
    const channel = liveChannel("rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "room_listings" }, listener)
      .subscribe();
    return () => void getSupabase().removeChannel(channel);
  },
};

export const roomService: RoomService =
  AUTH_MODE === "accounts" ? supabaseRoomService : localRoomService;
