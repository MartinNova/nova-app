import { BedDouble, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatAreas, formatAvailability, formatRent } from "@/lib/rooms/rooms";
import { ROOM_TYPES, type RoomListing } from "@/types/rooms";
import type { User } from "@/types/user";
import { PhotoGallery } from "./PhotoGallery";

interface RoomCardProps {
  listing: RoomListing;
  poster: User | undefined;
  today: string;
}

/** One listing in the list; the whole card opens the details, the photo arrows only browse. */
export function RoomCard({ listing, poster, today }: RoomCardProps) {
  const href = `/campus/rooms/listing?id=${listing.id}`;
  return (
    // Full height of the grid row, so cards next to each other end at the same line.
    <article className="group border-border bg-surface hover:border-brand flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-colors">
      {listing.photos.length > 0 ? (
        <PhotoGallery variant="card" photos={listing.photos} href={href} title={listing.title} />
      ) : (
        listing.kind === "offer" && (
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden
            className="bg-brand/10 text-brand flex aspect-[16/6] items-center justify-center"
          >
            <BedDouble className="size-8" aria-hidden />
          </Link>
        )
      )}
      <Link href={href} className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-semibold">{listing.title}</p>
        <p className="text-brand text-lg font-bold">{formatRent(listing)}</p>
        <div className="text-muted grid gap-1 text-sm">
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {formatAreas(listing.areas)} · {ROOM_TYPES[listing.roomType]}
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatAvailability(listing, today)}
          </p>
        </div>
        {/* Always at the bottom of the card, however long the title or area is. */}
        {poster && (
          <p className="text-muted mt-auto flex items-center gap-2 pt-1 text-sm">
            <Avatar
              firstName={poster.firstName}
              lastName={poster.lastName}
              username={poster.username}
              url={poster.avatarUrl}
              size={24}
            />
            {poster.firstName || `@${poster.username}`}
          </p>
        )}
      </Link>
    </article>
  );
}
