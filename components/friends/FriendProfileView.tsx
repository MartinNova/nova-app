"use client";

import { MessageCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AvailabilityList } from "@/components/profile/AvailabilityList";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Card } from "@/components/ui/Card";
import { relationTo } from "@/lib/friends/friends";
import { profileService } from "@/lib/services/profile.service";
import type { Profile } from "@/types/profile";
import { FriendButton } from "./FriendButton";
import { useFriendships } from "./useFriendships";

type Loaded = { username: string; profile: Profile | null; today: string };

const linkClass =
  "border-border bg-surface hover:border-brand inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium";

/** Another student's profile with ways to get in touch. */
export function FriendProfileView() {
  const username = useSearchParams().get("u") ?? "";
  const { user, ready } = useCurrentUser();
  const userId = user?.id;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const friendships = useFriendships(userId);

  useEffect(() => {
    if (!userId) return;
    profileService
      .getProfileByUsername(username)
      .catch(() => null)
      .then((profile) =>
        setLoaded({ username, profile, today: new Date().toISOString().slice(0, 7) }),
      );
  }, [username, userId]);

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  if (!user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to see profiles</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }

  const current = loaded?.username === username ? loaded : null;
  if (!current)
    return <div className="bg-border h-64 animate-pulse rounded-2xl" aria-busy="true" />;

  const p = current.profile;
  if (!p) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Profile not found</p>
        <p className="text-muted mt-1 text-sm">It may be private or the account was deleted.</p>
      </Card>
    );
  }

  const isMe = p.userId === user.id;
  const isFriend = relationTo(friendships ?? [], user.id, p.userId).kind === "friends";

  return (
    <div className="grid gap-4">
      <ProfileCard profile={p} today={current.today} showOnline={isMe || isFriend} />
      <AvailabilityList profile={p} isMe={isMe} />

      {isMe ? (
        <Link href="/settings" className={linkClass}>
          This is you · Edit profile
        </Link>
      ) : (
        <Card className="grid gap-3">
          <p className="font-semibold">Get in touch with {p.firstName || `@${p.username}`}</p>
          {friendships ? (
            <FriendButton me={user.id} person={p} friendships={friendships} size="full" />
          ) : (
            <div className="bg-border h-11 animate-pulse rounded-xl" />
          )}
          <Link
            href={`/friends/chat?u=${p.username}`}
            // Primary once you're friends; before that "Add friend" is the main action.
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 font-semibold ${
              isFriend
                ? "bg-brand text-brand-foreground hover:opacity-90"
                : "border-border bg-surface hover:bg-border/40 border"
            }`}
          >
            <MessageCircle className="size-5" aria-hidden /> Message
          </Link>
          {/* Instagram and LinkedIn are the logos on the profile card above. */}
          {p.sports.includes("Padel") && (
            <div className="flex flex-wrap gap-2">
              <Link href="/sport/padel" className={linkClass}>
                <Trophy className="size-4" aria-hidden /> Find a padel match
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
