import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Yoga" };

/** Nova MindSpace publishes its weekly class schedule and sign-up links on this page. */
const SCHEDULE_URL =
  "https://app.notion.com/p/novamindspace/Nova-MindSpace-Trainings-3e0b27d2f39b8049b44dcf41cb5363c4";

export default function YogaPage() {
  return (
    <>
      <PageHeader title="Yoga" subtitle="Classes on campus by Nova MindSpace." backHref="/sport" />
      <section aria-labelledby="yoga-title" className="space-y-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl sm:aspect-[16/9]">
          <Image
            src="/images/nova-mindspace.jpg"
            alt="Nova MindSpace logo: the words Mind and Space inside a hand-drawn blue oval."
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            preload
            className="object-cover object-center"
          />
        </div>
        <Card className="space-y-5 p-6 sm:p-8">
          <div className="space-y-3">
            <h2
              id="yoga-title"
              className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Your Campus, Your Calm.
            </h2>
            <p className="text-muted max-w-lg leading-relaxed">
              Join yoga classes on the beach lawn, run by the student club Nova MindSpace. Classes
              are donation-based, and your donation is your sign-up.
            </p>
          </div>
          <a
            href={SCHEDULE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand text-brand-foreground focus-visible:outline-brand inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
          >
            View the current schedule
            <ArrowUpRight className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <p className="text-muted text-xs leading-relaxed">
            Opens the Nova MindSpace schedule for current class times and sign-up. Sign-ups close at
            10pm the night before class.
          </p>
        </Card>
      </section>
    </>
  );
}
