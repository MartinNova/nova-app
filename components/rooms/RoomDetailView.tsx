"use client";

import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  MapPin,
  MessageCircle,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FriendButton } from "@/components/friends/FriendButton";
import { useFriendships } from "@/components/friends/useFriendships";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { toISODate } from "@/lib/padel/dates";
import { formatAreas, formatAvailability, formatRent } from "@/lib/rooms/rooms";
import { roomService } from "@/lib/services/rooms.service";
import {
  ROOM_TYPES,
  type ListingPhotos,
  type NewRoomListing,
  type RoomListing,
} from "@/types/rooms";
import { NewListingForm } from "./NewListingForm";
import { PhotoGallery } from "./PhotoGallery";

type Loaded = { id: string; listing: RoomListing | null; today: string };

/** One listing with all photos, details and a way to contact the poster. */
export function RoomDetailView() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { user, users, ready } = useCurrentUser();
  const userId = user?.id;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const friendships = useFriendships(userId);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    roomService
      .getListing(id)
      .catch(() => null)
      .then((listing) => setLoaded({ id, listing, today: toISODate(new Date()) }));
  }, [id, userId]);

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  if (!user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to see this listing</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }

  const current = loaded?.id === id ? loaded : null;
  if (!current)
    return <div className="bg-border h-64 animate-pulse rounded-2xl" aria-busy="true" />;

  const listing = current.listing;
  if (!listing) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Listing not found</p>
        <p className="text-muted mt-1 text-sm">It may have been taken down.</p>
      </Card>
    );
  }

  const poster = users.find((u) => u.id === listing.createdBy);
  const isMine = listing.createdBy === user.id;

  async function handleSave(input: NewRoomListing, photos: ListingPhotos) {
    const updated = await roomService.updateListing(listing!.id, input, photos, user!.id);
    setLoaded({ id, listing: updated, today: current!.today });
    setEditing(false);
    toast("Changes saved");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (editing) {
    return (
      <NewListingForm
        kind={listing.kind}
        today={current.today}
        initial={listing}
        onSubmit={handleSave}
        onClose={() => setEditing(false)}
      />
    );
  }

  async function handleDelete() {
    setError(null);
    try {
      await roomService.deleteListing(listing!.id, user!.id);
      router.push("/campus/rooms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the listing.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {listing.photos.length > 0 ? (
        <PhotoGallery variant="detail" photos={listing.photos} title={listing.title} />
      ) : (
        listing.kind === "offer" && (
          <div className="bg-brand/10 text-brand flex aspect-[16/7] items-center justify-center rounded-2xl">
            <BedDouble className="size-10" aria-hidden />
          </div>
        )
      )}

      <Card className="grid gap-3">
        <div>
          <Badge tone="brand">
            {listing.kind === "offer" ? "Room offered" : "Looking for a room"}
          </Badge>
          <h2 className="mt-2 text-xl font-bold">{listing.title}</h2>
          <p className="text-brand mt-1 text-lg font-bold">{formatRent(listing)}</p>
        </div>
        <ul className="text-muted grid gap-1.5 text-sm">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden /> {formatAreas(listing.areas)}
          </li>
          <li className="flex items-center gap-2">
            <BedDouble className="size-4 shrink-0" aria-hidden /> {ROOM_TYPES[listing.roomType]}
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatAvailability(listing, current.today)}
          </li>
          <li className="flex items-center gap-2">
            <Receipt className="size-4 shrink-0" aria-hidden />
            {listing.billsIncluded ? "Bills included" : "Bills not included"}
          </li>
        </ul>
        {listing.description && (
          <p className="text-sm whitespace-pre-line">{listing.description}</p>
        )}
      </Card>

      {isMine ? (
        <Card className="grid gap-3">
          <p className="font-semibold">This is your listing</p>
          <Button onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden /> Edit listing
          </Button>
          {confirmDelete ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDelete} className="bg-red-600 text-white">
                Yes, delete it
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete listing (room taken)
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </Card>
      ) : (
        poster && (
          <Card className="grid gap-3">
            {/* Picture and name open their profile, like everywhere else in the app. */}
            <Link
              href={poster.username ? `/friends/profile?u=${poster.username}` : "#"}
              className="focus-visible:outline-brand -m-1 flex items-center gap-3 rounded-2xl p-1 focus-visible:outline-2 active:opacity-70"
            >
              <Avatar
                firstName={poster.firstName}
                lastName={poster.lastName}
                username={poster.username}
                url={poster.avatarUrl}
                size={48}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {[poster.firstName, poster.lastName].filter(Boolean).join(" ") ||
                    `@${poster.username}`}
                </span>
                <span className="text-muted block text-sm">
                  Posted this listing · <span className="text-brand font-medium">View profile</span>
                </span>
              </span>
              <ChevronRight className="text-muted size-5 shrink-0" aria-hidden />
            </Link>
            {poster.username && (
              <div className="grid grid-cols-2 gap-2">
                {friendships ? (
                  <FriendButton
                    me={user.id}
                    person={{
                      userId: poster.id,
                      firstName: poster.firstName,
                      username: poster.username,
                    }}
                    friendships={friendships}
                    size="full"
                  />
                ) : (
                  <span className="bg-border h-11 animate-pulse rounded-xl" aria-hidden />
                )}
                <Link
                  href={`/friends/chat?u=${poster.username}&listing=${encodeURIComponent(listing.id)}`}
                  className="border-border bg-surface text-foreground hover:bg-border/40 inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 font-semibold"
                >
                  <MessageCircle className="size-5" aria-hidden />
                  Message
                </Link>
              </div>
            )}
          </Card>
        )
      )}

      <p className="text-muted text-xs">
        Never pay a deposit before you have seen the room or met the person.
      </p>
    </div>
  );
}
