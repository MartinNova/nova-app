import type { Metadata } from "next";
import Image from "next/image";
import { PadelView } from "@/components/sport/padel/PadelView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Padel" };

export default function PadelPage() {
  return (
    <>
      <PageHeader title="Padel" subtitle="Find players for your next match." backHref="/sport" />
      <div className="relative mb-6 aspect-[2/1] overflow-hidden rounded-2xl sm:aspect-[3/1]">
        <Image
          src="/images/nova-padel-lisbon-bridge.png"
          alt="Two people playing padel beneath the Ponte 25 de Abril bridge in Lisbon."
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          preload
          className="object-cover object-left"
        />
      </div>
      <PadelView />
    </>
  );
}
