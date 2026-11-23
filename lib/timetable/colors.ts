import type { CourseColor, Lecture } from "@/types/timetable";

/** Order in which courses without an own colour get one (calm colours first). */
export const AUTO_COURSE_COLORS: CourseColor[] = [
  "blue",
  "green",
  "purple",
  "teal",
  "red",
  "pink",
  "orange",
  "yellow",
  "gray",
];

/**
 * Colour of every course, by lecture id. A colour the user picked is kept; the other
 * courses get the next free automatic colour, so two courses only share a colour
 * when there are more courses than colours.
 */
export function courseColorMap(lectures: Lecture[]): Map<string, CourseColor> {
  const taken = new Set(lectures.flatMap((l) => (l.color ? [l.color] : [])));
  const free = AUTO_COURSE_COLORS.filter((c) => !taken.has(c));
  const pool = free.length > 0 ? free : AUTO_COURSE_COLORS;

  const colors = new Map<string, CourseColor>();
  let next = 0;
  for (const lecture of lectures) {
    colors.set(lecture.id, lecture.color ?? pool[next++ % pool.length]);
  }
  return colors;
}
