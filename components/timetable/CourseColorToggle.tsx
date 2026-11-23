"use client";

interface CourseColorToggleProps {
  on: boolean;
  onToggle: () => void;
}

/** Switch under the filter chips: give every course its own colour instead of the lecture navy. */
export function CourseColorToggle({ on, onToggle }: CourseColorToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="focus-visible:outline-brand text-muted -mt-2 mb-4 flex items-center gap-2 rounded-md text-sm focus-visible:outline-2"
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      Colour lectures by course
    </button>
  );
}
