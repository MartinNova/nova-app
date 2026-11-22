import type { Metadata } from "next";
import { Pizza } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HubHero } from "@/components/ui/HubHero";
import { MenuCategory } from "@/components/canteen/MenuCategory";
import { THE_CUT_MENU, THE_CUT_REVIEW_NOTES } from "@/data/the-cut";

export const metadata: Metadata = { title: "The Cut · Food Options" };
export default function TheCutPage() {
  return (
    <div className="space-y-8">
      <div>
        <HubHero
          title="The Cut"
          tagline="Pizza, snacks & drinks."
          image={{
            src: "/images/food/the-cut.png",
            alt: "AI-generated illustration of mozzarella pizza with garlic bread and a drink.",
          }}
          backHref="/canteen"
        />
        <Card className="border-brand/20 bg-brand/5 space-y-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Pizza className="text-brand size-9" aria-hidden />
            <Badge tone="brand">NOVA SBE · In-store menu</Badge>
          </div>
          <p className="text-muted text-sm leading-relaxed">
            Menu photographed on 17 November 2026. Prices and availability may change.
          </p>
          <p className="text-muted text-xs">
            Transcribed from the in-store boards. Confirm prices and allergen information with the
            team before ordering.
          </p>
        </Card>
      </div>
      <nav aria-label="Menu categories" className="flex flex-wrap gap-2">
        {THE_CUT_MENU.map((category) => (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="border-border bg-surface hover:border-brand focus-visible:outline-brand rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {category.title}
          </a>
        ))}
      </nav>
      <div className="space-y-10">
        {THE_CUT_MENU.map((category) => (
          <MenuCategory key={category.id} category={category} />
        ))}
      </div>
      <Card className="space-y-3">
        <details>
          <summary className="focus-visible:outline-brand cursor-pointer rounded font-semibold focus-visible:outline-2">
            Photo notes & items to confirm
          </summary>
          <ul className="text-muted mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {THE_CUT_REVIEW_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}
