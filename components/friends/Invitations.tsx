"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { studyProgress } from "@/lib/profile/profile-rules";
import { friendService } from "@/lib/services/friend.service";
import type { Friendship } from "@/types/friends";
import type { Profile } from "@/types/profile";

interface InvitationsProps {
  me: string;
  requests: Friendship[];
  /** Profiles by user id; someone with a private profile shows as "Nova student". */
  profiles: Map<string, Profile>;
  today: string;
}

const displayName = (p: Profile | undefined) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(" ") || `@${p.username}` : "Nova student";

/**
 * Incoming friend requests, like LinkedIn's "Invitations": who it is on the left,
 * Ignore (neutral X) and Accept (brand check mark) as round buttons on the right.
 */
export function Invitations({ me, requests, profiles, today }: InvitationsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function answer(request: Friendship, accept: boolean) {
    const name = profiles.get(request.requesterId)?.firstName || displayName(undefined);
    setBusy(request.id);
    try {
      if (accept) {
        await friendService.accept(request.id, me);
        toast(`You and ${name} are now friends`);
      } else {
        await friendService.remove(request.id, me);
        toast("Request declined");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="invitations-title" className="mb-6 flex flex-col gap-2">
      <h2 id="invitations-title" className="mx-1 text-[22px] leading-7 font-bold">
        Invitations <span className="text-muted font-semibold">{requests.length}</span>
      </h2>
      <ul className="bg-surface overflow-hidden rounded-3xl">
        {requests.map((request) => {
          const p = profiles.get(request.requesterId);
          const name = displayName(p);
          const info =
            [p?.program, p && studyProgress(p.studyStart, p.studyEnd, today)]
              .filter(Boolean)
              .join(" · ") || (p ? `@${p.username}` : "Wants to be your friend");
          return (
            <li key={request.id} className="group flex min-h-[72px] items-center gap-3 pl-4">
              {p ? (
                <Link href={`/friends/profile?u=${p.username}`} className="shrink-0">
                  <Avatar
                    firstName={p.firstName}
                    lastName={p.lastName}
                    username={p.username}
                    url={p.avatarUrl}
                    size={48}
                  />
                </Link>
              ) : (
                <Avatar firstName="?" lastName="" size={48} />
              )}
              <div className="border-border flex min-h-[72px] min-w-0 flex-1 items-center gap-2 self-stretch border-b py-2 pr-3 group-last:border-b-0">
                <div className="min-w-0 flex-1">
                  {p ? (
                    <Link
                      href={`/friends/profile?u=${p.username}`}
                      className="block truncate text-[17px] font-semibold"
                    >
                      {name}
                    </Link>
                  ) : (
                    <p className="truncate text-[17px] font-semibold">{name}</p>
                  )}
                  <p className="text-muted truncate text-[14px]">{info}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => void answer(request, false)}
                  aria-label={`Decline ${name}`}
                  className="bg-muted/15 text-foreground/80 hover:bg-muted/25 focus-visible:outline-brand flex size-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 active:scale-90 disabled:opacity-50"
                >
                  <X className="size-5" strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => void answer(request, true)}
                  aria-label={`Accept ${name}`}
                  className="bg-brand text-brand-foreground focus-visible:outline-brand flex size-10 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90 disabled:opacity-50"
                >
                  <Check className="size-5" strokeWidth={2.6} aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
