import type { Metadata } from "next";
import { RunningView } from "@/components/sport/running/RunningView";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Running" };

export default function RunningPage() {
  return (
    <>
      <HubHero
        title="Running"
        tagline="Join a run club or post your own run."
        image={{
          src: "/images/nova-running-banner.png",
          alt: "Two runners seen from behind on the Lisbon waterfront, with the Ponte 25 de Abril bridge in the background.",
        }}
        focus="object-[35%_50%]"
        backHref="/sport"
      />
      <RunningView />
    </>
  );
}
