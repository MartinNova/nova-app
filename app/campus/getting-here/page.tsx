import type { Metadata } from "next";
import { GettingThereView } from "@/components/transport/GettingThereView";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Getting to campus" };

export default function GettingHerePage() {
  return (
    <>
      <HubHero
        title="Getting to campus"
        tagline="Your train after class, Uber, the map and the next trains."
        image={{
          src: "/images/nova-campus-coastal-train.png",
          alt: "A train travelling beside the coast near Lisbon.",
        }}
        backHref="/campus"
      />
      <GettingThereView />
    </>
  );
}
