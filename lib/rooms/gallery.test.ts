import { describe, expect, it } from "vitest";
import { clampIndex, galleryArrows, indexFromScroll, photoCounter } from "./gallery";

describe("clampIndex", () => {
  it("keeps the index inside the gallery", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(7, 3)).toBe(2);
  });

  it("returns 0 for empty galleries and odd input", () => {
    expect(clampIndex(2, 0)).toBe(0);
    expect(clampIndex(Number.NaN, 4)).toBe(0);
  });
});

describe("indexFromScroll", () => {
  it("picks the slide that is mostly visible", () => {
    expect(indexFromScroll(0, 300, 4)).toBe(0);
    expect(indexFromScroll(140, 300, 4)).toBe(0);
    expect(indexFromScroll(160, 300, 4)).toBe(1);
    expect(indexFromScroll(900, 300, 4)).toBe(3);
  });

  it("stays in range when overscrolled or not measured yet", () => {
    expect(indexFromScroll(5000, 300, 4)).toBe(3);
    expect(indexFromScroll(-40, 300, 4)).toBe(0);
    expect(indexFromScroll(120, 0, 4)).toBe(0);
  });
});

describe("photoCounter", () => {
  it("counts from 1", () => {
    expect(photoCounter(0, 5)).toBe("1 / 5");
    expect(photoCounter(1, 5)).toBe("2 / 5");
    expect(photoCounter(9, 5)).toBe("5 / 5");
  });

  it("is empty without photos", () => {
    expect(photoCounter(0, 0)).toBe("");
  });
});

describe("galleryArrows", () => {
  it("shows no arrows for one photo", () => {
    expect(galleryArrows(0, 1)).toEqual({ prev: false, next: false });
    expect(galleryArrows(0, 0)).toEqual({ prev: false, next: false });
  });

  it("hides the arrow at either end", () => {
    expect(galleryArrows(0, 3)).toEqual({ prev: false, next: true });
    expect(galleryArrows(1, 3)).toEqual({ prev: true, next: true });
    expect(galleryArrows(2, 3)).toEqual({ prev: true, next: false });
  });
});
