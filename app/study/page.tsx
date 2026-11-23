import { FileCheck } from "lucide-react";
import type { Metadata } from "next";
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
          src: "/images/nova-study-lecture-hall.png",
          alt: "Students attending a lecture in a modern NOVA SBE lecture hall.",
        }}
        cropTop
      />
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
