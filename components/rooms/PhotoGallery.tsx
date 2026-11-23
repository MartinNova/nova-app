"use client";

import Link from "next/link";
import { useState } from "react";
import { GalleryControls } from "./GalleryControls";
import { PhotoLightbox } from "./PhotoLightbox";
import { useSnapCarousel } from "./useSnapCarousel";

const SCROLLER =
  "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type PhotoGalleryProps =
  | {
      /** In the list of listings: every photo opens the listing, controls appear on hover. */
      variant: "card";
      photos: string[];
      href: string;
      title: string;
    }
  | {
      /** On the listing page: controls always visible, tapping a photo opens the lightbox. */
      variant: "detail";
      photos: string[];
      title: string;
    };

/** Swipeable listing photos with arrows, a counter and page dots. */
export function PhotoGallery(props: PhotoGalleryProps) {
  const { photos, title, variant } = props;
  const { scroller, scrollerProps, index, goTo } = useSnapCarousel(photos.length);
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const count = photos.length;

  function closeLightbox(at: number) {
    setLightboxAt(null);
    goTo(at, false);
    const slide = scroller.current?.children[at] as HTMLElement | undefined;
    slide?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label={`Photos of ${title}`}
      aria-roledescription="carousel"
      className={`group relative overflow-hidden ${variant === "detail" ? "rounded-2xl" : ""}`}
    >
      <div {...scrollerProps} className={SCROLLER}>
        {photos.map((src, i) => {
          const label = `Photo ${i + 1} of ${count}`;
          const img = (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads from Supabase Storage
            <img
              src={src}
              alt={variant === "detail" ? label : ""}
              draggable={false}
              loading={i === 0 ? undefined : "lazy"}
              className={`w-full object-cover ${variant === "card" ? "aspect-[16/9]" : "aspect-[4/3]"}`}
            />
          );
          const slide = "block w-full shrink-0 snap-center snap-always";
          return props.variant === "card" ? (
            // The text part of the card is the focusable link; the photos are a mouse/touch shortcut.
            <Link key={i} href={props.href} tabIndex={-1} aria-hidden className={slide}>
              {img}
            </Link>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxAt(i)}
              aria-label={`${label}, open full screen`}
              aria-roledescription="slide"
              className={`${slide} cursor-zoom-in`}
            >
              {img}
            </button>
          );
        })}
      </div>

      <GalleryControls index={index} count={count} onGo={goTo} variant={variant} />

      {lightboxAt !== null && (
        <PhotoLightbox
          photos={photos}
          startIndex={lightboxAt}
          title={title}
          onClose={closeLightbox}
        />
      )}
    </section>
  );
}
