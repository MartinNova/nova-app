"use client";

import { GraduationCap, IdCard, Languages, Phone } from "lucide-react";
import Image from "next/image";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  countryName,
  flagEmoji,
  formatMonth,
  phoneHref,
  studyProgress,
} from "@/lib/profile/profile-rules";
import { formatLevel } from "@/types/padel";
import { STUDY_STATUSES, type Profile } from "@/types/profile";

interface ProfileCardProps {
  profile: Profile;
  /** "YYYY-MM", used for "1st year" etc. */
  today: string;
}

/** How a student appears to others: picture, name, programme, interests. */
export function ProfileCard({ profile: p, today }: ProfileCardProps) {
  const { presence } = usePresence();
  const progress = studyProgress(p.studyStart, p.studyEnd, today);
  const period = [formatMonth(p.studyStart), formatMonth(p.studyEnd)].filter(Boolean).join(" – ");

  return (
    <Card className="grid gap-5">
      <div className="flex items-center gap-4">
        <Avatar
          firstName={p.firstName}
          lastName={p.lastName}
          username={p.username}
          url={p.avatarUrl}
          size={80}
          online={presence.online.has(p.userId)}
        />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">
            {[p.firstName, p.lastName].filter(Boolean).join(" ") || `@${p.username}`}
          </h2>
          {p.username && <p className="text-muted">@{p.username}</p>}
          {p.country && (
            <p className="mt-0.5 text-sm">
              {flagEmoji(p.country)} {countryName(p.country)}
            </p>
          )}
        </div>
      </div>

      {p.bio && <p className="text-sm">{p.bio}</p>}

      {p.program && (
        <div className="flex gap-3">
          <GraduationCap className="text-brand mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-medium">{p.program}</p>
            <p className="text-muted">
              {[progress, period, p.studyStatus && STUDY_STATUSES[p.studyStatus]]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {p.studentId && (
        <div className="flex items-center gap-3">
          <IdCard className="text-brand size-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <span className="text-muted">Student ID</span>{" "}
            <span className="font-medium tabular-nums">{p.studentId}</span>
          </p>
        </div>
      )}

      {p.phone && (
        <div className="flex items-center gap-3">
          <Phone className="text-brand size-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <span className="text-muted">Mobile</span>{" "}
            <a href={phoneHref(p.phone)} className="text-brand font-medium tabular-nums underline">
              {p.phone}
            </a>
          </p>
        </div>
      )}

      {(p.sports.length > 0 || p.padelLevel !== null) && (
        <div className="flex flex-wrap gap-1.5">
          {p.sports.map((s) => (
            <Badge key={s} tone="brand">
              {s}
            </Badge>
          ))}
          {p.padelLevel !== null && <Badge>Padel {formatLevel(p.padelLevel)}</Badge>}
        </div>
      )}

      {/* Free days and times are shown below the card (AvailabilityList). */}
      {p.languages.length > 0 && (
        <dl className="text-muted grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt>
              <Languages className="size-4" aria-label="Languages" />
            </dt>
            <dd>{p.languages.join(", ")}</dd>
          </div>
        </dl>
      )}

      {(p.instagram || p.linkedin) && (
        <div className="flex gap-3">
          {p.instagram && (
            <SocialLink
              href={`https://instagram.com/${p.instagram}`}
              icon="/icons/instagram.png"
              label={`Instagram: @${p.instagram}`}
            />
          )}
          {p.linkedin && (
            <SocialLink href={p.linkedin} icon="/icons/linkedin.png" label="LinkedIn profile" />
          )}
        </div>
      )}
    </Card>
  );
}

/** App-style icon that opens the profile in Instagram / LinkedIn (new tab). */
function SocialLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="focus-visible:outline-brand rounded-[10px] transition focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90"
    >
      <Image src={icon} alt="" width={36} height={36} className="size-9 rounded-[10px]" />
    </a>
  );
}
