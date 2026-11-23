"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { photoCounter } from "@/lib/rooms/gallery";
import { GalleryControls } from "./GalleryControls";
import { useSnapCarousel } from "./useSnapCarousel";

interface PhotoLightboxProps {
  photos: string[];
  startIndex: number;
  title: string;
  /** Gets the photo that was open, so the page gallery can stay on it. */
  onClose: (index: number) => void;
}

/** How far (px) a downward swipe has to go to close the viewer. */
const CLOSE_DISTANCE = 100;

/**
 * Full-screen photo viewer: swipe or arrows/keys to browse, X, Escape or a swipe down to close.
 * Keeps focus inside and locks page scrolling while open.
 */
export function PhotoLightbox({ photos, startIndex, title, onClose }: PhotoLightboxProps) {
  const { scrollerProps, index, goTo } = useSnapCarousel(photos.length, startIndex);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const onWindowKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (e.key === "Escape") onClose(index);
    else if (e.key === "ArrowLeft") goTo(index - 1);
    else if (e.key === "ArrowRight") goTo(index + 1);
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Tab and Shift+Tab cycle through the viewer's own buttons only.
  function trapFocus(e: KeyboardEvent) {
    if (e.key !== "Tab" || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    touchStart.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  }

  function onTouchMove(e: TouchEvent) {
    const start = touchStart.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only a mostly vertical, downward drag moves the photo; sideways stays a swipe between photos.
    if (dragY > 0 || (dy > 10 && dy > Math.abs(dx) * 1.5)) setDragY(Math.max(0, dy));
  }

  function onTouchEnd() {
    touchStart.current = null;
    if (dragY > CLOSE_DISTANCE) onClose(index);
    else setDragY(0);
  }

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${title}`}
      onKeyDown={trapFocus}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="fade-in fixed inset-0 z-50 flex flex-col text-white"
      style={{ backgroundColor: `rgb(0 0 0 / ${Math.max(0.4, 1 - dragY / 400)})` }}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
        <p aria-live="polite" className="text-sm font-medium tabular-nums">
          <span className="sr-only">Photo </span>
          {photoCounter(index, photos.length)}
        </p>
        <button
          ref={closeButton}
          type="button"
          onClick={() => onClose(index)}
          aria-label="Close photos"
          className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95"
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : "transform 200ms ease-out",
        }}
      >
        <div
          {...scrollerProps}
          className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((src, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${i + 1} of ${photos.length}`}
              className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center px-2 pb-12"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads from Supabase Storage */}
              <img
                src={src}
                alt={`Photo ${i + 1} of ${photos.length}`}
                draggable={false}
                className="max-h-full max-w-full object-contain select-none"
              />
            </div>
          ))}
        </div>
        <GalleryControls index={index} count={photos.length} onGo={goTo} variant="lightbox" />
      </div>
    </div>,
    document.body,
  );
}
