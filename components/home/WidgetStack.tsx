"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { visibleWidgets, WIDGET_NAMES } from "@/lib/home/widgets";
import { EditWidgetsSheet } from "./EditWidgetsSheet";
import type { Today } from "./useToday";
import { useWidgetPrefs } from "./useWidgetPrefs";
import { Widget } from "./widgets";

const GAP = 12;

/**
 * Swipeable widget stack at the top of Home, like a Smart Stack on the iPhone home screen.
 * Native scroll snapping does the swiping (momentum, rubber band); page dots show where you are.
 */
export function WidgetStack({ today }: { today: Today | null }) {
  const [prefs, setPrefs] = useWidgetPrefs();
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  // Page a button scrolled to; scroll events on the way there are ignored so the dots don't flicker.
  const target = useRef<number | null>(null);

  const ids = visibleWidgets(prefs);
  const current = Math.min(active, ids.length - 1);

  function pageWidth() {
    const first = scroller.current?.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth ?? 1) + GAP;
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / pageWidth());
    if (target.current !== null && index !== target.current) return;
    target.current = null;
    setActive(index);
  }

  function goTo(index: number) {
    if (index === current || index < 0 || index >= ids.length) return;
    target.current = index;
    setActive(index);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.current?.scrollTo({
      left: index * pageWidth(),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <section aria-label="Widgets" aria-roledescription="carousel" className="flex flex-col gap-2">
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={() => (target.current = null)}
        className="widget-scroller -mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain px-4 [&::-webkit-scrollbar]:hidden"
      >
        {ids.map((id, i) => (
          <div
            key={id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${WIDGET_NAMES[id]}, ${i + 1} of ${ids.length}`}
            className="widget-page w-full shrink-0 snap-center snap-always"
          >
            <Widget id={id} today={today} />
          </div>
        ))}
      </div>

      <div className="relative flex h-11 items-center justify-center">
        {ids.length > 1 && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              aria-label="Previous widget"
              className="text-muted flex size-11 items-center justify-center rounded-full transition-opacity active:opacity-50 disabled:opacity-25"
            >
              <ChevronLeft aria-hidden size={18} strokeWidth={2.5} />
            </button>
            {ids.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${WIDGET_NAMES[id]}`}
                aria-current={i === current}
                className="flex h-11 items-center px-[5px]"
              >
                <span
                  className={`block h-[7px] rounded-full transition-all duration-300 ease-out ${
                    i === current ? "bg-foreground w-[18px]" : "bg-muted/40 w-[7px]"
                  }`}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current === ids.length - 1}
              aria-label="Next widget"
              className="text-muted flex size-11 items-center justify-center rounded-full transition-opacity active:opacity-50 disabled:opacity-25"
            >
              <ChevronRight aria-hidden size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-brand absolute right-0 h-11 rounded-full px-2 text-[15px] font-semibold active:opacity-60"
        >
          Edit
        </button>
      </div>

      {editing && (
        <EditWidgetsSheet prefs={prefs} onChange={setPrefs} onClose={() => setEditing(false)} />
      )}
    </section>
  );
}
