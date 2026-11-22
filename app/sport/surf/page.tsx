import type { Metadata } from "next";
import { SurfView } from "@/components/sport/surf/SurfView";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Surf" };

export default function SurfPage() {
  return (
    <>
      <HubHero
        title="Surf"
        tagline="Forecast and surf schools near Lisbon."
        image={{
          src: "/images/nova-surf-banner.png",
          alt: "Surfers carrying their boards along the beach.",
        }}
        focus="object-[25%_50%]"
        backHref="/sport"
      />
      <SurfView />
    </>
  );
}
