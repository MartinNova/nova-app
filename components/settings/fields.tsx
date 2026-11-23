"use client";

/** Small form building blocks shared by the settings sections. */

export const fieldClass =
  "border-border bg-surface focus-visible:outline-brand mt-1 h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-2";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-surface grid grid-cols-1 gap-4 rounded-2xl border p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-muted text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Multi-select as toggle chips. */
export function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== option) : [...value, option])}
              className={`focus-visible:outline-brand rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 ${
                on
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-surface hover:border-brand"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = Array.from({ length: 13 }, (_, i) => 2020 + i);

/**
 * Month + year as two selects. (Safari on macOS has no <input type="month">.)
 * `value` is "YYYY-MM" or "".
 */
export function MonthPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [year, month] = value ? value.split("-") : ["", ""];
  const update = (y: string, m: string) => onChange(y && m ? `${y}-${m}` : "");

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label={`${label} month`}
          value={month}
          onChange={(e) => update(year || String(new Date().getFullYear()), e.target.value)}
          className={fieldClass}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, "0")}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} year`}
          value={year}
          onChange={(e) => update(e.target.value, month || "09")}
          className={fieldClass}
        >
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
