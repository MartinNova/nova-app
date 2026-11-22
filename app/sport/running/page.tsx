import type { Metadata } from "next";
import Image from "next/image";
import { RunningView } from "@/components/sport/running/RunningView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Running" };

export default function RunningPage() {
  return (
    <>
      <PageHeader
        title="Running"
        subtitle="Join a run club or post your own run."
        backHref="/sport"
      />
      <div className="relative mb-6 aspect-[2/1] overflow-hidden rounded-2xl sm:aspect-[3/1]">
        <Image
          src="/images/nova-running-banner.png"
          alt="Two runners seen from behind on the Lisbon waterfront, with the Ponte 25 de Abril bridge in the background."
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          preload
          className="object-cover object-left"
        />
      </div>
      <RunningView />
    </>
  );
}
