import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowUpRight, CalendarDays, Dumbbell, MapPin } from "lucide-react";
import { GymView } from "@/components/sport/gym/GymView";
import { Card } from "@/components/ui/Card";
import { HubHero } from "@/components/ui/HubHero";
import { PageHeader } from "@/components/ui/PageHeader";
import { VIVA_GYM } from "@/data/viva-gym";

export const metadata: Metadata = { title: "Gym" };

/** Photo of the gym (page header). If the file is removed, a dumbbell icon is shown instead. */
const PHOTO = "/images/viva-gym.jpg";
const HAS_PHOTO = existsSync(join(process.cwd(), "public", PHOTO));

export default function GymPage() {
  return (
    <>
      {HAS_PHOTO ? (
        <HubHero
          title="Gym"
          tagline="Viva Gym, right on campus."
          image={{
            src: PHOTO,
            alt: "Glass entrance of the Viva Gym with an orange Vivagym sign and a woman with a gym bag walking past.",
          }}
          backHref="/sport"
        />
      ) : (
        <>
          <PageHeader
            title="Gym"
            subtitle="Viva Gym on campus: opening hours and how busy it is."
            backHref="/sport"
          />
          <div
            className="bg-brand text-brand-foreground mb-4 flex aspect-[3/1] items-center justify-center rounded-2xl"
            aria-hidden
          >
            <Dumbbell className="size-16 opacity-70" />
          </div>
        </>
      )}

      <Card className="mb-4">
        <h2 className="text-lg font-semibold">{VIVA_GYM.name}</h2>
        <p className="text-muted mt-1 flex items-start gap-1.5 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          {VIVA_GYM.address}
        </p>
        <a
          href={VIVA_GYM.website}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand text-brand-foreground focus-visible:outline-brand mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
        >
          Viva Gym website
          <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Card>

      <Card className="mb-4">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <CalendarDays className="size-4" aria-hidden /> Class schedule
        </h2>
        <p className="text-muted mt-1 text-sm">
          Cycling, Pilates, Yoga, Zumba, a Run Club and more. The schedule changes weekly, so the
          official page always has the current times.
        </p>
        <a
          href={VIVA_GYM.scheduleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand text-brand-foreground focus-visible:outline-brand mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
        >
          View the class schedule
          <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Card>

      <GymView gym={VIVA_GYM} />
    </>
  );
}
