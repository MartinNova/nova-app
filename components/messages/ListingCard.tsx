import { BedDouble, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listingHref } from "@/lib/messages/messages";
import type { ListingRef } from "@/types/messages";

interface ListingCardProps {
  listing: ListingRef;
  /** In your own (navy) bubble the card is light on dark. */
  mine?: boolean;
  /** Copies of a bubble (e.g. behind the long-press menu) aren't tappable. */
  interactive?: boolean;
}

/** The room listing a chat message is about: picture, title, price; tap opens the listing. */
export function ListingCard({ listing, mine = false, interactive = true }: ListingCardProps) {
  return (
    <Link
      href={listingHref(listing)}
      tabIndex={interactive ? undefined : -1}
      onClick={(e) => !interactive && e.preventDefault()}
      // Holding the card should open the message menu, not drag a link.
      draggable={false}
      className={`mb-1 flex min-w-0 items-center gap-2.5 rounded-xl border-l-4 py-1.5 pr-2 pl-1.5 text-left ${
        mine ? "border-white/70 bg-white/15" : "border-brand bg-background"
      }`}
    >
      <ListingThumb listing={listing} mine={mine} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[13px] leading-[18px] font-semibold">
          {listing.title}
        </span>
        <span className={`block truncate text-[13px] ${mine ? "opacity-85" : "text-muted"}`}>
          {listing.subtitle}
        </span>
      </span>
      <ChevronRight
        className={`size-4 shrink-0 ${mine ? "opacity-70" : "text-muted"}`}
        aria-hidden
      />
      <span className="sr-only">Open listing</span>
    </Link>
  );
}

/** First photo of the listing, or a bed icon when it has none. */
export function ListingThumb({ listing, mine = false }: { listing: ListingRef; mine?: boolean }) {
  if (listing.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- storage/data URL, small thumbnail
      <img
        src={listing.photo}
        alt=""
        draggable={false}
        className="size-11 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <span
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
        mine ? "bg-white/20" : "bg-brand/10 text-brand"
      }`}
    >
      <BedDouble className="size-5" aria-hidden />
    </span>
  );
}
