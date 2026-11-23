import {
  AtSign,
  BookOpen,
  ChevronRight,
  FileCheck,
  GraduationCap,
  Library,
  Lightbulb,
  Mail,
  Newspaper,
  Phone,
  Siren,
} from "lucide-react";
import Image from "next/image";
import { TILE_COLORS } from "@/components/ui/Tile";
import {
  CLUBS,
  CONTACTS,
  EMERGENCY_NUMBER,
  ESSENTIAL_LINKS,
  STUDENT_UNION,
  TIPS,
  type ClubCategory,
} from "@/data/new-at-nova";

/** Icon and colour per essential link, in the order of ESSENTIAL_LINKS. */
const LINK_STYLE: { icon: typeof Mail; color: keyof typeof TILE_COLORS }[] = [
  { icon: GraduationCap, color: "pink" },
  { icon: BookOpen, color: "orange" },
  { icon: Newspaper, color: "blue" },
  { icon: Mail, color: "teal" },
  { icon: Library, color: "purple" },
  { icon: FileCheck, color: "green" },
];

const CATEGORIES: ClubCategory[] = [
  "Finance & investing",
  "Consulting & business",
  "Tech & startups",
  "Impact & society",
  "Sport & well-being",
  "Culture & community",
];

/** "+351 213 801 670" → "tel:+351213801670" */
const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

const heading = "text-muted mb-3 text-sm font-semibold tracking-wide uppercase";
const round =
  "focus-visible:outline-brand flex size-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 active:scale-90";
const pill =
  "focus-visible:outline-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 active:scale-95";

/** Links, tips, contacts and clubs for students who just started at Nova SBE. */
export function NewAtNova() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="links">
        <h2 id="links" className={heading}>
          Your apps
        </h2>
        {/* Like app icons on a home screen: icon, name, one short line. */}
        <ul className="bg-surface grid grid-cols-3 gap-x-2 gap-y-5 rounded-3xl px-2 py-5">
          {ESSENTIAL_LINKS.map((link, i) => {
            const { icon: Icon, color } = LINK_STYLE[i % LINK_STYLE.length];
            return (
              <li key={link.title}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group focus-visible:outline-brand flex flex-col items-center gap-1.5 rounded-2xl text-center focus-visible:outline-2"
                >
                  <span
                    className={`${TILE_COLORS[color]} flex size-14 items-center justify-center rounded-2xl text-white shadow-sm transition group-hover:scale-105 group-active:scale-95`}
                  >
                    <Icon className="size-7" aria-hidden />
                  </span>
                  <span className="text-[15px] leading-tight font-semibold">{link.title}</span>
                  <span className="text-muted line-clamp-2 text-xs leading-snug">
                    {link.description}
                  </span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="tips">
        <h2 id="tips" className={heading}>
          Good to know
        </h2>
        <ol className="bg-surface divide-border divide-y rounded-3xl">
          {TIPS.map((tip, i) => (
            <li key={tip.title} className="flex gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-sm font-bold text-amber-700 dark:text-amber-300">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{tip.title}</span>
                <span className="text-muted mt-0.5 block text-[15px] leading-snug">{tip.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-muted mt-2 flex items-center gap-1.5 px-1 text-xs">
          <Lightbulb className="size-3.5" aria-hidden /> From the Nova SBE website (Life at Nova
          SBE, FAQ).
        </p>
      </section>

      <section aria-labelledby="contacts">
        <h2 id="contacts" className={heading}>
          Who to ask
        </h2>
        <a
          href={telHref(EMERGENCY_NUMBER)}
          className="focus-visible:outline-brand mb-3 flex items-center gap-3 rounded-3xl bg-red-600 p-4 text-white transition focus-visible:outline-2 active:scale-[0.98]"
        >
          <Siren className="size-6 shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block font-semibold">Emergency: {EMERGENCY_NUMBER}</span>
            <span className="block text-sm text-white/85">Police, fire and ambulance</span>
          </span>
          <Phone className="size-5" aria-hidden />
        </a>
        <ul className="bg-surface divide-border divide-y rounded-3xl">
          {CONTACTS.map((contact) => (
            <li key={contact.name} className="flex items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{contact.name}</span>
                <span className="text-muted block text-sm leading-snug">{contact.about}</span>
                {contact.email && (
                  <span className="text-muted mt-0.5 block truncate text-xs">{contact.email}</span>
                )}
              </span>
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  aria-label={`E-mail ${contact.name} (${contact.email})`}
                  className={`${round} bg-brand/10 text-brand`}
                >
                  <Mail className="size-5" aria-hidden />
                </a>
              )}
              {contact.phone && (
                <a
                  href={telHref(contact.phone)}
                  aria-label={`Call ${contact.name} (${contact.phone})`}
                  className={`${round} bg-green-600/10 text-green-700 dark:text-green-400`}
                >
                  <Phone className="size-5" aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className="text-muted mt-2 px-1 text-xs">
          Your personal Student Advisor is assigned when you start; you book meetings with them
          directly.
        </p>
      </section>

      <section aria-labelledby="clubs">
        <h2 id="clubs" className={heading}>
          Join a club
        </h2>
        <div className="bg-surface divide-border divide-y rounded-3xl">
          {CATEGORIES.map((category) => {
            const clubs = CLUBS.filter((club) => club.category === category);
            return (
              // Collapsed by default, so 39 clubs don't fill the whole page.
              <details key={category} className="group">
                <summary className="focus-visible:outline-brand flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{category}</span>
                    <span className="text-muted block text-sm">{clubs.length} clubs</span>
                  </span>
                  {/* A peek at the logos, like stacked profile pictures. */}
                  <span className="flex -space-x-2.5" aria-hidden>
                    {clubs.slice(0, 4).map((club) => (
                      <Image
                        key={club.name}
                        src={club.logo}
                        alt=""
                        width={32}
                        height={32}
                        className="ring-surface size-8 rounded-full bg-white object-cover ring-2"
                      />
                    ))}
                  </span>
                  <ChevronRight
                    className="text-muted size-4 shrink-0 transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                </summary>
                <ul className="divide-border divide-y px-4 pb-2">
                  {clubs.map((club) => (
                    <li key={club.name}>
                      <a
                        href={club.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-visible:outline-brand flex items-center gap-3 rounded-xl py-3 focus-visible:outline-2 active:opacity-70"
                      >
                        <Image
                          src={club.logo}
                          alt=""
                          width={48}
                          height={48}
                          className="border-border size-12 shrink-0 rounded-full border bg-white object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block leading-tight font-semibold">{club.name}</span>
                          <span className="text-muted mt-0.5 block text-sm leading-snug">
                            {club.about}
                          </span>
                        </span>
                        <span className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-full">
                          <AtSign className="size-4" aria-hidden />
                        </span>
                        <span className="sr-only">on Instagram (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          <div className="flex flex-wrap gap-2 p-4">
            <a
              href={STUDENT_UNION.instagram}
              target="_blank"
              rel="noreferrer"
              className={`${pill} bg-brand text-brand-foreground`}
            >
              <AtSign className="size-3.5" aria-hidden />
              {STUDENT_UNION.name}
            </a>
            <a
              href={STUDENT_UNION.clubsPage}
              target="_blank"
              rel="noreferrer"
              className={`${pill} text-brand`}
            >
              All clubs on novasu.pt
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
