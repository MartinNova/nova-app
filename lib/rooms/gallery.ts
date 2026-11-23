/** Keeps a photo index inside 0…count-1 (0 for an empty gallery). */
export function clampIndex(index: number, count: number): number {
  if (count <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.round(index), 0), count - 1);
}

/** Index of the slide that fills most of the scroller, from its scroll position. */
export function indexFromScroll(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0) return 0;
  return clampIndex(scrollLeft / slideWidth, count);
}

/** Short counter for the badge, e.g. "2 / 5" (1-based). */
export function photoCounter(index: number, count: number): string {
  return count > 0 ? `${clampIndex(index, count) + 1} / ${count}` : "";
}

/** Which arrows a gallery shows: none for a single photo, no "back" on the first, no "next" on the last. */
export function galleryArrows(index: number, count: number): { prev: boolean; next: boolean } {
  const i = clampIndex(index, count);
  return { prev: count > 1 && i > 0, next: count > 1 && i < count - 1 };
}
