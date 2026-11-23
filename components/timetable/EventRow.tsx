import { ChevronRight, MapPin } from "lucide-react";
import { EVENT_CATEGORIES, type TimetableEvent } from "@/types/timetable";
import { CATEGORY_STYLE, type EventStyle } from "./categoryStyles";

/** One line in the agenda: time, title, location, coloured by category. */
export function EventRow({
  event,
  style = CATEGORY_STYLE[event.category],
  onClick,
}: {
  event: TimetableEvent;
  /** Colours of the row (default: the category colour; "by course" mode passes the course colour). */
  style?: EventStyle;
  /** Makes the row tappable (e.g. to open lecture details). */
  onClick?: () => void;
}) {
  const time = event.start ? (event.end ? `${event.start}–${event.end}` : event.start) : "All day";

  const Inner = onClick ? "button" : "div";

  return (
    <li className={`bg-surface border-border rounded-xl border border-l-4 ${style.border}`}>
      <Inner
        {...(onClick ? { type: "button" as const, onClick } : {})}
        className={`flex w-full items-center gap-3 p-3 text-left ${onClick ? "hover:bg-border/30 rounded-r-xl" : ""}`}
      >
        <span className="text-muted w-20 shrink-0 text-xs font-medium tabular-nums">{time}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{event.title}</span>
          <span className="text-muted flex flex-wrap items-center gap-x-2 text-xs">
            {EVENT_CATEGORIES[event.category].replace(/s$/, "")}
            {event.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="size-3" aria-hidden />
                {event.location}
              </span>
            )}
          </span>
        </span>
        {onClick && <ChevronRight className="text-muted size-4 shrink-0" aria-hidden />}
      </Inner>
    </li>
  );
}
