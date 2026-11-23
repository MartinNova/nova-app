import { Trash2 } from "lucide-react";
import { formatDay } from "@/lib/timetable/dates";
import type { TimetableEvent } from "@/types/timetable";
import type { EventStyle } from "./categoryStyles";
import { EventRow } from "./EventRow";

/** Details of the selected day, shown below the calendar. */
export function DayList({
  date,
  today,
  events,
  styleOf,
  onRemove,
  onOpenLecture,
}: {
  date: string;
  today: string;
  events: TimetableEvent[];
  /** Colours of an event (category colour or course colour). */
  styleOf: (event: TimetableEvent) => EventStyle;
  /** Called for events the user added by hand (ids start with "event:"). */
  onRemove?: (id: string) => void;
  /** Opens the detail sheet of a weekly lecture. */
  onOpenLecture?: (lectureId: string) => void;
}) {
  return (
    <section aria-label="Selected day" className="mt-4">
      <h3 className={`mb-2 text-sm font-semibold ${date === today ? "text-brand" : "text-muted"}`}>
        {formatDay(date, { weekday: "long", day: "numeric", month: "long" })}
        {date === today && " · Today"}
      </h3>
      {events.length === 0 ? (
        <p className="text-muted text-sm">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event) =>
            onRemove && event.id.startsWith("event:") ? (
              <div key={event.id} className="flex items-center gap-1">
                <ul className="min-w-0 flex-1">
                  <EventRow event={event} style={styleOf(event)} />
                </ul>
                <button
                  type="button"
                  onClick={() => onRemove(event.id)}
                  aria-label={`Delete ${event.title}`}
                  className="text-muted rounded-lg p-2 hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <EventRow
                key={event.id}
                event={event}
                style={styleOf(event)}
                onClick={
                  onOpenLecture && event.lectureId
                    ? () => onOpenLecture(event.lectureId!)
                    : undefined
                }
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
