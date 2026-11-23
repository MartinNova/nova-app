"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { areasLabel } from "@/lib/rooms/rooms";
import { ROOM_AREAS } from "@/types/rooms";

interface AreaFilterProps {
  value: string[];
  onChange: (areas: string[]) => void;
}

/**
 * Area filter that allows several areas at once ("Cascais +2"). Looks like the other dropdowns;
 * opens a list with check marks that stays open while you tick, closes on tap outside or Esc.
 */
export function AreaFilter({ value, onChange }: AreaFilterProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(area: string) {
    // Kept in list order, so the label reads "Carcavelos +1" however you ticked them.
    const next = value.includes(area) ? value.filter((a) => a !== area) : [...value, area];
    onChange(ROOM_AREAS.filter((a) => next.includes(a)));
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Areas"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="border-border bg-surface text-foreground focus-visible:outline-brand flex h-10 w-full items-center rounded-xl border pr-3.5 pl-2 text-left text-sm focus-visible:outline-2"
      >
        <span className="min-w-0 flex-1 truncate">{areasLabel(value)}</span>
        <ChevronDown
          className={`text-muted size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          className="bg-surface border-border fade-in absolute inset-x-0 top-full z-30 mt-1 min-w-56 overflow-hidden rounded-2xl border shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          <div className="border-border flex items-center justify-between border-b px-3 py-2">
            <span className="text-muted text-xs">
              {value.length === 0 ? "All areas" : `${value.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={value.length === 0}
              className="text-brand text-sm font-medium disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" aria-label="Areas">
            {ROOM_AREAS.map((area) => {
              const on = value.includes(area);
              return (
                <li key={area}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(area)}
                    className="active:bg-brand/5 hover:bg-brand/5 flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm"
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? "bg-brand border-brand text-brand-foreground" : "border-border"}`}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{area}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
