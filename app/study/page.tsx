import { ChevronRight, FileCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { HubHero } from "@/components/ui/HubHero";
import { TILE_COLORS, Tile } from "@/components/ui/Tile";
import { NETPA_DOCUMENTS_URL } from "@/data/netpa";
import { STUDY_MODULES } from "@/lib/config/navigation";

export const metadata: Metadata = { title: "Study Hub" };

/** One colour per module, in the order of STUDY_MODULES. */
const COLORS: (keyof typeof TILE_COLORS)[] = ["blue", "amber", "pink"];

export default function StudyHubPage() {
  return (
    <>
      <HubHero
        title="Study Hub"
        tagline="Stay on top of your semester."
        image={{
          src: "/images/nova-study-hub-classroom.png",
          alt: "Students attending a lecture in a modern NOVA SBE lecture hall.",
        }}
        focus="object-[100%_30%]"
      />
      {/* For students who just started: one place with links, contacts and clubs. */}
      <Link
        href="/study/new-at-nova"
        className="focus-visible:outline-brand mb-3 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-[#0b2a4a] to-[#0a84ff] p-4 text-white shadow-sm transition focus-visible:outline-2 active:scale-[0.98]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-tight font-semibold">New at Nova?</span>
          <span className="mt-0.5 block text-sm leading-snug text-white/85">
            Your apps, who to ask and clubs to join, all in one place.
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-white/80" aria-hidden />
      </Link>
      <div className="grid grid-cols-2 gap-3">
        {STUDY_MODULES.map(({ href, label, description, icon: Icon, status }, i) => (
          <Tile
            key={href}
            href={href}
            title={label}
            description={description}
            icon={<Icon className="size-6" aria-hidden />}
            color={COLORS[i % COLORS.length]}
            wide={i === 0}
            badge={status === "soon" ? <Badge>Soon</Badge> : null}
          />
        ))}
        <Tile
          href={NETPA_DOCUMENTS_URL}
          title="Enrollment certificate"
          description="Download it in netPA under Documents & Requests."
          icon={<FileCheck className="size-6" aria-hidden />}
          color="teal"
          wide
        />
      </div>
    </>
  );
}
