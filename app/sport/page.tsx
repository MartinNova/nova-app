import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { HubHero } from "@/components/ui/HubHero";
import { TILE_COLORS, Tile } from "@/components/ui/Tile";
import { SPORT_MODULES } from "@/lib/config/navigation";

export const metadata: Metadata = { title: "Sport" };

/** One colour per sport. */
const COLORS: Record<string, keyof typeof TILE_COLORS> = {
  "/sport/padel": "purple",
  "/sport/surf": "blue",
  "/sport/gym": "orange",
  "/sport/yoga": "pink",
  "/sport/running": "green",
};

export default function SportPage() {
  return (
    <>
      <HubHero
        hideTitle
        title="Sport"
        tagline="Move your body, clear your mind."
        image={{
          src: "/images/nova-sport-banner.png",
          alt: "An athlete training intensely in a gym.",
        }}
        focus="object-[42%_50%]"
      />
      <div className="grid grid-cols-2 gap-3">
        {SPORT_MODULES.map(({ href, label, description, icon: Icon, status }, i) => (
          <Tile
            key={href}
            href={href}
            title={label}
            description={description}
            icon={<Icon className="size-6" aria-hidden />}
            color={COLORS[href] ?? "navy"}
            wide={i === SPORT_MODULES.length - 1}
            badge={status === "soon" ? <Badge>Soon</Badge> : null}
          />
        ))}
      </div>
    </>
  );
}
