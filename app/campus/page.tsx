import type { Metadata } from "next";
import { CampusTile } from "@/components/campus/CampusLinkCard";
import { HubHero } from "@/components/ui/HubHero";
import { PageHeader } from "@/components/ui/PageHeader";
import { CAMPUS_LINK_SECTIONS } from "@/data/campus-links";

export const metadata: Metadata = { title: "Campus" };

export default function CampusPage() {
  return (
    <>
      <PageHeader
        title="Campus"
        subtitle="Getting here, rooms & flats, library, campus map and restaurants."
      />
      <HubHero
        image={{
          src: "/images/nova-campus-evening-courtyard.png",
          alt: "The NOVA SBE courtyard with modern glass architecture and warm evening lighting.",
        }}
        headline="Life by the sea in Carcavelos."
        text="How to get here, where to live, where to eat and where to study."
      />
      <div className="space-y-6">
        {CAMPUS_LINK_SECTIONS.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <h2 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {section.links.map((link) => (
                <CampusTile key={link.id} link={link} wide={section.links.length === 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
