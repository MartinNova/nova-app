import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { LinkCard } from "@/components/ui/Card";
import { HubHero } from "@/components/ui/HubHero";
import { SPORT_MODULES } from "@/lib/config/navigation";

export const metadata: Metadata = { title: "Sport" };

export default function SportPage() {
  return (
    <>
      <HubHero
        title="Sport"
        tagline="Move your body, clear your mind."
        image={{
          src: "/images/nova-sport-banner.png",
          alt: "An athlete training intensely in a gym.",
        }}
        focus="object-[42%_50%]"
      />
      <div className="grid gap-3">
        {SPORT_MODULES.map(({ href, label, description, icon: Icon, status }) => (
          <LinkCard
            key={href}
            href={href}
            title={label}
            description={description}
            icon={<Icon className="size-5" aria-hidden />}
            badge={status === "soon" ? <Badge>Soon</Badge> : null}
          />
        ))}
      </div>
    </>
  );
}
