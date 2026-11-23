"use client";

import { useEffect, useRef } from "react";
import { addDays, formatDay } from "@/lib/timetable/dates";
import { layoutTimedEvents } from "@/lib/timetable/schedule";
import type { TimetableEvent } from "@/types/timetable";
import type { EventStyle } from "./categoryStyles";

const HOUR_PX = 44;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Where the scroll area starts when the week has no earlier events. */
const DEFAULT_SCROLL_HOUR = 8;

interface WeekGridProps {
  weekStart: string;
  today: string;
  selected: string;
  events: TimetableEvent[];
  /** Colours of an event (category colour or course colour). */
  styleOf: (event: TimetableEvent) => EventStyle;
  onSelectDay: (date: string) => void;
  /** Tapping an empty slot: add something on this day at this hour. */
  onCreateAt: (date: string, hour: number) => void;
  /** Tapping a weekly lecture block opens its details. */
  onOpenLecture: (lectureId: string) => void;
}

/**
 * Google-Calendar-style week: one column per day, events as blocks by time, 00:00-24:00.
 * The time area scrolls; day headers and the "due · all-day" row stay visible.
 * Weekend columns only appear when something is scheduled.
 */
export function WeekGrid(props: WeekGridProps) {
  const { weekStart, today, selected, events, styleOf, onSelectDay, onCreateAt, onOpenLecture } =
    props;
  const scrollRef = useRef<HTMLDivElement>(null);

  const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const days = allDays.filter((d, i) => i < 5 || events.some((e) => e.date === d));

  // Deadlines (often 23:59) and all-day items go to the top row instead of the grid.
  const isTopRow = (e: TimetableEvent) => !e.start || e.category === "deadline";
  const timed = events.filter((e) => !isTopRow(e));
  const hasTopRow = events.some(isTopRow);

  // Scroll to the earliest event of the week (or 08:00) when the week changes.
  const firstHour = Math.min(
    DEFAULT_SCROLL_HOUR,
    ...timed.map((e) => Number(e.start!.slice(0, 2))),
  );
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(firstHour - 0.5, 0) * HOUR_PX });
  }, [weekStart, firstHour]);

  function handleSlotClick(day: string, ev: React.MouseEvent<HTMLDivElement>) {
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
    onSelectDay(day);
    onCreateAt(day, Math.min(23, Math.max(0, Math.floor(y / HOUR_PX))));
  }

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      {/* Day headers */}
      <div className="border-border flex border-b">
        <div className="w-10 shrink-0" />
        {days.map((day) => {
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              className="flex min-w-0 flex-1 flex-col items-center py-1.5 text-xs"
            >
              <span className="text-muted">{formatDay(day, { weekday: "short" })}</span>
              <span
                className={`mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isSelected
                    ? "bg-brand text-brand-foreground"
                    : isToday
                      ? "text-brand ring-brand ring-1"
                      : ""
                }`}
              >
                {Number(day.slice(8))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deadlines + all-day row */}
      {hasTopRow && (
        <div className="border-border flex border-b">
          <div className="text-muted w-10 shrink-0 py-1 pr-1 text-right text-[11px]">
            due · all-day
          </div>
          {days.map((day) => (
            <div key={day} className="min-w-0 flex-1 space-y-0.5 p-0.5">
              {events
                .filter((e) => e.date === day && isTopRow(e))
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectDay(day)}
                    title={e.start ? `${e.start} ${e.title}` : e.title}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium ${styleOf(e).chip}`}
                  >
                    {e.start && <span className="opacity-90">{e.start} </span>}
                    {e.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable 24h time grid */}
      <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto overscroll-contain">
        <div className="flex">
          <div className="w-10 shrink-0">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="text-muted -translate-y-1.5 pr-1 text-right text-[11px] tabular-nums"
              >
                {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day}
              className={`border-border relative min-w-0 flex-1 cursor-pointer border-l ${
                day === selected ? "bg-brand/5" : ""
              }`}
              style={{ height: 24 * HOUR_PX }}
              onClick={(ev) => handleSlotClick(day, ev)}
              title="Tap to add"
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-border/70 pointer-events-none absolute inset-x-0 border-t"
                  style={{ top: h * HOUR_PX }}
                />
              ))}

              {layoutTimedEvents(timed.filter((e) => e.date === day)).map((p) => {
                const top = (p.startMin / 60) * HOUR_PX;
                const height = Math.max(((p.endMin - p.startMin) / 60) * HOUR_PX - 2, 16);
                const width = 100 / p.laneCount;
                return (
                  <button
                    key={p.event.id}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelectDay(day);
                      if (p.event.lectureId) onOpenLecture(p.event.lectureId);
                    }}
                    title={`${p.event.start} ${p.event.title}`}
                    className={`absolute overflow-hidden rounded-md px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm ${styleOf(p.event).chip}`}
                    style={{
                      top: top + 1,
                      height,
                      left: `calc(${p.lane * width}% + 1px)`,
                      width: `calc(${width}% - 2px)`,
                    }}
                  >
                    <span className="block font-semibold">{p.event.title}</span>
                    {height > 30 && <span className="block opacity-90">{p.event.start}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
