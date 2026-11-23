import Image from "next/image";
import { LargeTitle } from "./LargeTitle";

interface HubHeroProps {
  /** The page's large title, written onto the photo (replaces <PageHeader>). */
  title: string;
  /** One short line under the title. */
  tagline: string;
  image: { src: string; alt: string };
  /** Which part of the photo to keep in view, e.g. "object-left" or "object-[50%_30%]". */
  focus?: string;
  /** Zoom in from the bottom edge, so the top of the photo is cut off rather than the bottom. */
  cropTop?: boolean;
  /** Sub-pages: shows "‹ Sport" in the top bar. */
  backHref?: string;
}

/**
 * Photo header for the overview pages (Sport, Study, Campus) and the sport pages, like Apple's TV, Fitness and
 * Music apps: the photo runs edge to edge up under the see-through top bar, drifts a little
 * slower than the page while scrolling, and fades into the background, where the large
 * title sits. No frame, no separate text block: the picture becomes part of the page.
 */
export function HubHero({
  title,
  tagline,
  image,
  focus = "object-center",
  cropTop = false,
  backHref,
}: HubHeroProps) {
  return (
    <section className="relative mb-6">
      {/* Up under the top bar (48px + the 8px page padding) and out to the screen edges. */}
      <div className="hub-hero-photo relative -mx-4 -mt-[calc(3.5rem+env(safe-area-inset-top))] h-[min(32vh,250px)] overflow-hidden sm:h-[240px]">
        {/* Soft shade behind the white logo of the top bar (overview pages only). */}
        {!backHref && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(6rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/40 to-transparent"
          />
        )}
        <div className={`absolute inset-0 ${cropTop ? "origin-bottom scale-[1.35]" : ""}`}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 704px"
            preload
            className={`hub-hero-parallax object-cover ${focus}`}
          />
        </div>
      </div>
      {/* The title sits where the photo has faded into the page, so it reads in light and dark. */}
      <LargeTitle title={title} backHref={backHref} immersive className="relative -mt-16">
        <p className="text-muted mt-1 text-[17px] leading-snug">{tagline}</p>
      </LargeTitle>
    </section>
  );
}
