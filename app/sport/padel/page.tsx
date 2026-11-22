import type { Metadata } from "next";
import { PadelView } from "@/components/sport/padel/PadelView";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Padel" };

export default function PadelPage() {
  return (
    <>
      <HubHero
        title="Padel"
        tagline="Find players for your next match."
        image={{
          src: "/images/nova-padel-lisbon-bridge.png",
          alt: "Two people playing padel beneath the Ponte 25 de Abril bridge in Lisbon.",
        }}
        focus="object-[20%_50%]"
        backHref="/sport"
      />
      <PadelView />
    </>
  );
}
