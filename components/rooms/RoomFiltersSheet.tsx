"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/timetable/Sheet";
import { Button } from "@/components/ui/Button";
import { priceCeiling, priceHistogram } from "@/lib/rooms/rooms";
import { ROOM_TYPES, type ListingKind, type RoomFilter, type RoomType } from "@/types/rooms";
import { PriceRange } from "./PriceRange";

/** The filters in this sheet (kind and areas live on the page itself). */
export type SheetFilter = Pick<
  RoomFilter,
  "minRent" | "maxRent" | "roomTypes" | "billsIncluded" | "withPhotos" | "availableBy"
>;

interface RoomFiltersSheetProps {
  kind: ListingKind;
  value: SheetFilter;
  /** Rents of all current listings of this kind, for the bars above the price slider. */
  rents: number[];
  /** How many listings these filters would show, for the button. */
  countFor: (filter: SheetFilter) => number;
  onApply: (filter: SheetFilter) => void;
  onClose: () => void;
}

/** Price range, room type, bills, photos and move-in date, applied together with one button. */
export function RoomFiltersSheet({
  kind,
  value,
  rents,
  countFor,
  onApply,
  onClose,
}: RoomFiltersSheetProps) {
  const [draft, setDraft] = useState<SheetFilter>(value);
  const ceiling = priceCeiling(rents);
  const count = countFor(draft);
  const update = (changes: Partial<SheetFilter>) => setDraft((d) => ({ ...d, ...changes }));

  function toggleType(type: RoomType) {
    const types = draft.roomTypes ?? [];
    update({
      roomTypes: types.includes(type) ? types.filter((t) => t !== type) : [...types, type],
    });
  }

  const offer = kind === "offer";

  return (
    <Sheet title="Filters" onClose={onClose}>
      <div className="grid gap-6">
        <section>
          <h3 className="font-semibold">{offer ? "Rent per month" : "Budget per month"}</h3>
          <p className="text-muted mb-3 text-sm">
            {offer ? "Including or excluding bills, as posted." : "The most people want to pay."}
          </p>
          <PriceRange
            ceiling={ceiling}
            histogram={priceHistogram(rents, ceiling)}
            min={draft.minRent}
            max={draft.maxRent}
            onChange={(minRent, maxRent) => update({ minRent, maxRent })}
          />
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Type</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(ROOM_TYPES) as [RoomType, string][]).map(([type, label]) => {
              const on = draft.roomTypes?.includes(type) ?? false;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(type)}
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
                    on
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-surface text-foreground hover:bg-brand/5"
                  }`}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="divide-border grid divide-y">
          <Toggle
            label="Bills included"
            hint="Water, power and internet in the price"
            on={Boolean(draft.billsIncluded)}
            onChange={(on) => update({ billsIncluded: on || undefined })}
          />
          {offer && (
            <Toggle
              label="With photos"
              hint="Only listings that show the room"
              on={Boolean(draft.withPhotos)}
              onChange={(on) => update({ withPhotos: on || undefined })}
            />
          )}
        </section>

        <section>
          <label className="font-semibold" htmlFor="filter-available-by">
            {offer ? "Move in by" : "Needed by"}
          </label>
          <p className="text-muted mb-2 text-sm">
            {offer
              ? "Rooms that are free on or before this day."
              : "People who need a room on or before this day."}
          </p>
          <div className="flex items-center gap-2">
            <input
              id="filter-available-by"
              type="date"
              value={draft.availableBy ?? ""}
              onChange={(e) => update({ availableBy: e.target.value || undefined })}
              className="border-border bg-surface focus-visible:outline-brand h-10 flex-1 rounded-xl border px-3 text-sm focus-visible:outline-2"
            />
            {draft.availableBy && (
              <Button variant="ghost" onClick={() => update({ availableBy: undefined })}>
                Any time
              </Button>
            )}
          </div>
        </section>

        <div className="border-border bg-surface sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setDraft({})}
            className="text-foreground text-sm font-medium underline underline-offset-2"
          >
            Clear all
          </button>
          <Button onClick={() => onApply(draft)}>
            {count === 0 ? "No matches" : `Show ${count} ${count === 1 ? "listing" : "listings"}`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/** iOS-style switch row. */
function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-muted block text-sm">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand)] ${on ? "bg-brand" : "bg-muted/30"}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-200 ${on ? "translate-x-5" : ""}`}
        />
      </span>
    </label>
  );
}
