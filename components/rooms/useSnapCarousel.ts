"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { clampIndex, indexFromScroll } from "@/lib/rooms/gallery";

/**
 * State for a full-width scroll-snap carousel (same idea as the Home widget stack):
 * native scrolling does the swiping, buttons and keys scroll to a page via `goTo`.
 */
export function useSnapCarousel(count: number, startIndex = 0) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => clampIndex(startIndex, count));
  // Page a button scrolled to; scroll events on the way there are ignored so the counter doesn't flicker.
  const target = useRef<number | null>(null);
  const index = clampIndex(active, count);

  // Open on the start photo without an animation (e.g. the lightbox at photo 3).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && startIndex > 0) el.scrollLeft = clampIndex(startIndex, count) * el.clientWidth;
    // Only on mount: later changes go through goTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const next = indexFromScroll(el.scrollLeft, el.clientWidth, count);
    if (target.current !== null && next !== target.current) return;
    target.current = null;
    setActive(next);
  }

  function goTo(next: number, animate = true) {
    const el = scroller.current;
    const i = clampIndex(next, count);
    if (!el) return;
    target.current = i;
    setActive(i);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: animate && !reduce ? "smooth" : "auto" });
  }

  return {
    scroller,
    index,
    goTo,
    scrollerProps: {
      ref: scroller,
      onScroll,
      // A finger on the photos wins over a running button animation.
      onPointerDown: () => (target.current = null),
    },
  };
}
