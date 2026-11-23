"use client";

import { CalendarDays, MinusCircle, Plus } from "lucide-react";
import { GroupedList } from "@/components/ui/GroupedList";
import { DEFAULT_SLOT, nextSlot, validateAvailability } from "@/lib/profile/availability";
import {
  MAX_SLOTS_PER_DAY,
  WEEKDAYS,
  type AvailabilitySlot,
  type ProfileUpdate,
  type Weekday,
} from "@/types/profile";

const DAY_NAMES: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

// min-w-0 + no clock icon below 360px: two times and the remove button fit on a 320px phone.
const timeClass =
  "bg-border/50 focus-visible:outline-brand min-w-0 rounded-lg px-2 py-1 text-[17px] tabular-nums max-[359px]:[&::-webkit-calendar-picker-indicator]:hidden focus-visible:outline-2 aria-invalid:text-red-700 dark:aria-invalid:text-red-400";

interface AvailabilitySectionProps {
  form: ProfileUpdate;
  set: <K extends keyof ProfileUpdate>(key: K, value: ProfileUpdate[K]) => void;
}

/**
 * Settings -> "Usually free": a switch per weekday, then one or more time windows for that day
 * (iOS Settings style). Windows are checked on save and merged if they overlap.
 */
export function AvailabilitySection({ form, set }: AvailabilitySectionProps) {
  const slots = form.availability;
  const error = validateAvailability(slots);
  const save = (next: AvailabilitySlot[]) => set("availability", next);

  // Position of each window in the full list, so edits stay in place.
  const ofDay = (day: Weekday) =>
    slots.flatMap((slot, index) => (slot.day === day ? [{ slot, index }] : []));

  const toggleDay = (day: Weekday, on: boolean) =>
    save(on ? [...slots, { day, ...DEFAULT_SLOT }] : slots.filter((s) => s.day !== day));
  const update = (index: number, change: Partial<AvailabilitySlot>) =>
    save(slots.map((s, i) => (i === index ? { ...s, ...change } : s)));
  const remove = (index: number) => save(slots.filter((_, i) => i !== index));
  const add = (day: Weekday) =>
    save([...slots, { day, ...nextSlot(ofDay(day).map((w) => w.slot)) }]);

  return (
    <div className="grid grid-cols-1 gap-2">
      <GroupedList title="Usually free">
        {WEEKDAYS.map((day) => {
          const windows = ofDay(day);
          const on = windows.length > 0;
          const labelId = `free-${day}`;
          return (
            <div key={day} className="group pl-4">
              <div className="flex min-h-14 items-center gap-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#2e7d32] text-white">
                  <CalendarDays className="size-[18px]" aria-hidden />
                </span>
                <span
                  className={`border-border flex min-h-14 min-w-0 flex-1 items-center gap-2 self-stretch py-2 pr-3 ${on ? "" : "border-b group-last:border-b-0"}`}
                >
                  <span id={labelId} className="flex-1 text-[17px]">
                    {DAY_NAMES[day]}
                  </span>
                  <Switch on={on} labelledBy={labelId} onChange={(next) => toggleDay(day, next)} />
                </span>
              </div>

              {on && (
                <div className="border-border grid grid-cols-1 gap-1 border-b pr-3 pb-3 pl-[46px] group-last:border-b-0">
                  {windows.map(({ slot, index }) => {
                    const wrong = slot.from >= slot.to;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={`${DAY_NAMES[day]} from`}
                          aria-invalid={wrong || undefined}
                          value={slot.from}
                          onChange={(e) => update(index, { from: e.target.value })}
                          className={timeClass}
                        />
                        <span className="text-muted" aria-hidden>
                          –
                        </span>
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={`${DAY_NAMES[day]} until`}
                          aria-invalid={wrong || undefined}
                          value={slot.to}
                          onChange={(e) => update(index, { to: e.target.value })}
                          className={timeClass}
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label={`Remove ${DAY_NAMES[day]} ${slot.from}–${slot.to}`}
                          className="focus-visible:outline-brand ml-auto flex size-11 items-center justify-center rounded-full text-red-600 focus-visible:outline-2"
                        >
                          <MinusCircle className="size-[22px]" aria-hidden />
                        </button>
                      </div>
                    );
                  })}
                  {windows.length < MAX_SLOTS_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => add(day)}
                      className="text-brand focus-visible:outline-brand flex h-9 items-center gap-1.5 justify-self-start rounded-lg text-[15px] font-medium focus-visible:outline-2"
                    >
                      <Plus className="size-4" aria-hidden /> Add time
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </GroupedList>
      <p className="text-muted mx-4 text-[13px]" aria-live="polite">
        {error ? (
          <span className="text-red-700 dark:text-red-400">{error}</span>
        ) : (
          `Helps others plan a game or a run with you. Up to ${MAX_SLOTS_PER_DAY} time windows per day; choose under Privacy who sees them.`
        )}
      </p>
    </div>
  );
}

/** iOS switch (same look as in Edit widgets). */
function Switch({
  on,
  labelledBy,
  onChange,
}: {
  on: boolean;
  labelledBy: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className="focus-visible:outline-brand flex h-11 items-center rounded-full focus-visible:outline-2"
    >
      <span
        className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ${on ? "bg-brand" : "bg-muted/30"}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.6,1)] ${on ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
