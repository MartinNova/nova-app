import { X } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

/** Icon tile colours, like the coloured squares in iOS Settings. White glyph on each passes 3:1. */
const TILE = {
  brand: "bg-brand text-brand-foreground",
  ocean: "bg-ocean text-ocean-foreground",
  food: "bg-[#b5651d] text-white",
  sport: "bg-[#2e7d32] text-white",
  task: "bg-[#8a5d00] text-white",
} as const;

export type TileTone = keyof typeof TILE;

/** iOS "inset grouped" list: optional section title, then rows on one rounded surface. */
export function GroupedList({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h2 className="mx-1 text-[22px] leading-7 font-bold">{title}</h2>}
      <div className="bg-surface overflow-hidden rounded-3xl">{children}</div>
    </section>
  );
}

interface ListRowProps {
  href: string;
  icon: React.ReactNode;
  tone?: TileTone;
  title: string;
  /** Second line under the title. */
  subtitle?: string;
  /** Right-hand value, e.g. "2 open". */
  detail?: React.ReactNode;
}

/** A read-only row: title on the left, value on the right (no chevron), as in iOS Settings. */
export function InfoRow({
  icon,
  tone = "brand",
  title,
  detail,
}: Omit<ListRowProps, "href" | "subtitle">) {
  return (
    <div className="group flex min-h-14 items-center gap-3.5 pl-4">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TILE[tone]}`}>
        {icon}
      </span>
      <span className="border-border flex min-h-14 min-w-0 flex-1 items-center gap-3 self-stretch border-b py-2 pr-4 group-last:border-b-0">
        <span className="shrink-0 text-[17px]">{title}</span>
        {detail && (
          <span className="text-muted min-w-0 flex-1 text-right text-[17px]">{detail}</span>
        )}
      </span>
    </div>
  );
}

type InputRowProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  icon: React.ReactNode;
  tone?: TileTone;
  /** Label on the left, like "Mobile" in iOS Contacts. */
  label: string;
  /** Shows a clear button while there is a value. */
  onClear?: () => void;
  /** Something in front of the text field, e.g. a calling-code picker. */
  leading?: React.ReactNode;
};

/** An editable row: label on the left, text field on the right, as in iOS Settings. */
export function InputRow({
  icon,
  tone = "brand",
  label,
  onClear,
  leading,
  ...input
}: InputRowProps) {
  const id = useId();
  const hasValue = typeof input.value === "string" && input.value !== "";
  return (
    <div className="group focus-within:bg-brand/5 flex min-h-14 items-center gap-3.5 pl-4 transition-colors">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TILE[tone]}`}>
        {icon}
      </span>
      <span className="border-border flex min-h-14 min-w-0 flex-1 items-center gap-2 self-stretch border-b py-2 pr-3 group-last:border-b-0">
        <label htmlFor={id} className="shrink-0 text-[17px]">
          {label}
        </label>
        {leading}
        <input
          id={id}
          {...input}
          className="placeholder:text-muted/70 min-w-0 flex-1 bg-transparent text-right text-[17px] outline-none"
        />
        {onClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="bg-muted/40 text-surface focus-visible:outline-brand flex size-5 shrink-0 items-center justify-center rounded-full focus-visible:outline-2"
          >
            <X className="size-3.5" strokeWidth={3} aria-hidden />
          </button>
        )}
      </span>
    </div>
  );
}

/** One tappable row. Separators start after the icon, as in iOS. */
export function ListRow({ href, icon, tone = "brand", title, subtitle, detail }: ListRowProps) {
  return (
    <Link
      href={href}
      className="group focus-visible:outline-brand active:bg-brand/5 flex min-h-14 items-center gap-3.5 pl-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TILE[tone]}`}>
        {icon}
      </span>
      <span className="border-border flex min-h-14 min-w-0 flex-1 items-center gap-2 self-stretch border-b py-2 pr-3.5 group-last:border-b-0">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px]">{title}</span>
          {subtitle && <span className="text-muted block truncate text-[15px]">{subtitle}</span>}
        </span>
        {detail && <span className="text-muted shrink-0 text-[17px]">{detail}</span>}
        <svg
          width="9"
          height="15"
          viewBox="0 0 9 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted/60 shrink-0"
          aria-hidden
        >
          <path d="m1.5 1.5 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
