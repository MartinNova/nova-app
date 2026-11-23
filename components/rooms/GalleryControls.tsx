import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";
import { galleryArrows, photoCounter } from "@/lib/rooms/gallery";

interface GalleryControlsProps {
  index: number;
  count: number;
  onGo: (index: number) => void;
  /** card: arrows + counter only on hover/keyboard focus; detail/lightbox: always. */
  variant: "card" | "detail" | "lightbox";
}

// Shown on hover or keyboard focus of the card; on touch screens they stay hidden and can't be tapped.
const HOVER_ONLY =
  "pointer-events-none opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100";

/** Round prev/next arrows, a "2 / 5" badge and page dots laid over a photo carousel. */
export function GalleryControls({ index, count, onGo, variant }: GalleryControlsProps) {
  if (count < 2) return null;
  const arrows = galleryArrows(index, count);
  const hoverOnly = variant === "card" ? HOVER_ONLY : "";
  const big = variant === "lightbox";

  // The card around the photos is a link: an arrow click must not open the listing.
  const go = (to: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onGo(to);
  };

  const arrowClass = `absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-white backdrop-blur-sm transition-[opacity,background-color] active:scale-95 ${
    big ? "size-12 bg-white/15 hover:bg-white/25" : "size-9 bg-black/45 hover:bg-black/60"
  }`;

  return (
    <>
      {arrows.prev && (
        <button
          type="button"
          onClick={go(index - 1)}
          aria-label="Previous photo"
          className={`${arrowClass} ${big ? "left-3" : "left-2"} ${hoverOnly}`}
        >
          <ChevronLeft aria-hidden className={big ? "size-6" : "size-5"} strokeWidth={2.5} />
        </button>
      )}
      {arrows.next && (
        <button
          type="button"
          onClick={go(index + 1)}
          aria-label="Next photo"
          className={`${arrowClass} ${big ? "right-3" : "right-2"} ${hoverOnly}`}
        >
          <ChevronRight aria-hidden className={big ? "size-6" : "size-5"} strokeWidth={2.5} />
        </button>
      )}

      {!big && (
        <span
          aria-live={variant === "detail" ? "polite" : undefined}
          className={`pointer-events-none absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white tabular-nums backdrop-blur-sm ${
            variant === "card"
              ? "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              : ""
          }`}
        >
          <span className="sr-only">Photo </span>
          {photoCounter(index, count)}
        </span>
      )}

      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-1.5 ${big ? "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]" : "bottom-2.5"}`}
      >
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`block h-1.5 rounded-full shadow-sm transition-all duration-300 ease-out ${
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/55"
            }`}
          />
        ))}
      </span>
    </>
  );
}
