import type { CourseColor, EventCategory, TimetableEvent } from "@/types/timetable";

export interface EventStyle {
  dot: string;
  border: string;
  chip: string;
}

/**
 * Colours per category, used by the filter chips and the event rows.
 * Lectures navy, exams yellow, deadlines soft orange, holidays light pink.
 * (Class names are written out in full so Tailwind can find them.)
 */
export const CATEGORY_STYLE: Record<EventCategory, EventStyle> = {
  lecture: {
    dot: "bg-brand",
    border: "border-l-brand",
    chip: "bg-brand text-brand-foreground border-brand",
  },
  exam: {
    dot: "bg-yellow-400",
    border: "border-l-yellow-400",
    chip: "bg-yellow-300 text-yellow-950 border-yellow-400",
  },
  deadline: {
    dot: "bg-orange-300",
    border: "border-l-orange-300",
    chip: "bg-orange-200 text-orange-950 border-orange-300",
  },
  holiday: {
    dot: "bg-pink-300",
    border: "border-l-pink-300",
    chip: "bg-pink-200 text-pink-950 border-pink-300",
  },
};

/** Colours for courses (optional "Colour lectures by course" mode); same palette as to-do labels. */
export const COURSE_STYLE: Record<CourseColor, EventStyle> = {
  red: {
    dot: "bg-red-500",
    border: "border-l-red-500",
    chip: "bg-red-500 text-white border-red-500",
  },
  orange: {
    dot: "bg-orange-500",
    border: "border-l-orange-500",
    chip: "bg-orange-500 text-white border-orange-500",
  },
  yellow: {
    dot: "bg-yellow-400",
    border: "border-l-yellow-400",
    chip: "bg-yellow-400 text-yellow-950 border-yellow-400",
  },
  green: {
    dot: "bg-green-600",
    border: "border-l-green-600",
    chip: "bg-green-600 text-white border-green-600",
  },
  teal: {
    dot: "bg-teal-600",
    border: "border-l-teal-600",
    chip: "bg-teal-600 text-white border-teal-600",
  },
  blue: {
    dot: "bg-blue-600",
    border: "border-l-blue-600",
    chip: "bg-blue-600 text-white border-blue-600",
  },
  purple: {
    dot: "bg-purple-600",
    border: "border-l-purple-600",
    chip: "bg-purple-600 text-white border-purple-600",
  },
  pink: {
    dot: "bg-pink-500",
    border: "border-l-pink-500",
    chip: "bg-pink-500 text-white border-pink-500",
  },
  gray: {
    dot: "bg-slate-500",
    border: "border-l-slate-500",
    chip: "bg-slate-500 text-white border-slate-500",
  },
};

/**
 * Style of one event. With `courseColors` (the "by course" mode) lecture events use
 * their course colour; everything else, and the default mode, uses the category colour.
 */
export function eventStyle(
  event: TimetableEvent,
  courseColors: ReadonlyMap<string, CourseColor> | null,
): EventStyle {
  const color = event.lectureId && courseColors ? courseColors.get(event.lectureId) : undefined;
  return color ? COURSE_STYLE[color] : CATEGORY_STYLE[event.category];
}
