"use client";

import { useId } from "react";

interface PriceRangeProps {
  /** Right end of the slider; there it means "and more" (no upper limit). */
  ceiling: number;
  /** Listings per price step, drawn as bars above the slider. */
  histogram: number[];
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}

const STEP = 10;

/**
 * Price range with two handles and how many listings there are at each price above it.
 * Bars inside the range are in the brand colour, the rest muted. Left end = no minimum,
 * right end = no maximum ("1,000 €+").
 */
export function PriceRange({ ceiling, histogram, min, max, onChange }: PriceRangeProps) {
  const id = useId();
  const low = min ?? 0;
  const high = max ?? ceiling;
  const tallest = Math.max(1, ...histogram);
  const pct = (value: number) => (value / ceiling) * 100;

  function set(nextLow: number, nextHigh: number) {
    const a = Math.max(0, Math.min(nextLow, nextHigh - STEP));
    const b = Math.min(ceiling, Math.max(nextHigh, a + STEP));
    onChange(a <= 0 ? undefined : a, b >= ceiling ? undefined : b);
  }

  return (
    <div>
      <div className="flex h-16 items-end gap-[2px] px-3" aria-hidden>
        {histogram.map((count, i) => {
          const from = (i / histogram.length) * ceiling;
          const to = ((i + 1) / histogram.length) * ceiling;
          const inside = to > low && from < high;
          return (
            <span
              key={i}
              className={`flex-1 rounded-t-[3px] transition-colors duration-150 ${inside ? "bg-brand" : "bg-border"}`}
              style={{ height: count ? `${Math.max(8, (count / tallest) * 100)}%` : "2px" }}
            />
          );
        })}
      </div>

      <div className="relative h-7">
        <div className="bg-border absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full" />
        <div
          className="bg-brand absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(12px + (100% - 24px) * ${pct(low) / 100})`,
            right: `calc(12px + (100% - 24px) * ${1 - pct(high) / 100})`,
          }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={0}
          max={ceiling}
          step={STEP}
          value={low}
          onChange={(e) => set(Number(e.target.value), high)}
          className="range-thumb absolute inset-0 w-full"
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={0}
          max={ceiling}
          step={STEP}
          value={high}
          onChange={(e) => set(low, Number(e.target.value))}
          className="range-thumb absolute inset-0 w-full"
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <label className="text-muted grid gap-1 text-xs" htmlFor={`${id}-min`}>
          Minimum (€)
          <PriceInput
            id={`${id}-min`}
            value={min}
            placeholder="0 €"
            onCommit={(v) => set(v ?? 0, high)}
          />
        </label>
        <label className="text-muted grid gap-1 text-right text-xs" htmlFor={`${id}-max`}>
          Maximum (€)
          <PriceInput
            id={`${id}-max`}
            value={max}
            placeholder={`${ceiling.toLocaleString("en-GB")} €+`}
            onCommit={(v) => set(low, v ?? ceiling)}
          />
        </label>
      </div>
    </div>
  );
}

/** A price you can also type; empty = no limit. Applies on blur or Enter. */
function PriceInput({
  id,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  value: number | undefined;
  placeholder: string;
  onCommit: (value: number | undefined) => void;
}) {
  return (
    <input
      // Re-mount when the slider moves, so the box shows the new value.
      key={value ?? "none"}
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      step={STEP}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onBlur={(e) => onCommit(e.target.value ? Number(e.target.value) : undefined)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="border-border bg-surface text-foreground focus-visible:outline-brand h-11 w-28 rounded-full border px-4 text-center text-[15px] tabular-nums focus-visible:outline-2"
    />
  );
}
