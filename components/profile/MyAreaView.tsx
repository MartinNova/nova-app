"use client";

import { Pencil, Trophy, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Card, LinkCard } from "@/components/ui/Card";
import { profileService } from "@/lib/services/profile.service";
import type { Profile } from "@/types/profile";
import { AvailabilityList } from "./AvailabilityList";
import { ProfileCard } from "./ProfileCard";

/** Result of loading one user's profile; `userId` tells which user it belongs to. */
type Loaded = { userId: string; profile: Profile | null; today: string };

/** "Your area" after signing in: your profile card and shortcuts. */
export function MyAreaView() {
  const { user, ready } = useCurrentUser();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    profileService
      .getProfile(userId)
      .catch(() => null)
      // Today's month is read here (in the browser), not during server rendering.
      .then((profile) =>
        setLoaded({ userId, profile, today: new Date().toISOString().slice(0, 7) }),
      );
  }, [user]);

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  if (!user) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <UserRoundPlus className="text-brand size-8" aria-hidden />
        <p className="font-semibold">Your area</p>
        <p className="text-muted max-w-xs text-sm">
          Sign in to see your profile, matches and settings.
        </p>
        <Link
          href="/login"
          className="bg-brand text-brand-foreground inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium hover:opacity-90"
        >
          Sign in or create account
        </Link>
      </Card>
    );
  }

  // Loading is derived: the last result belongs to another user (or nothing loaded yet).
  const current = loaded?.userId === user.id ? loaded : null;
  const profile = current?.profile;
  const incomplete = profile && (!profile.avatarUrl || !profile.program);

  return (
    <div className="grid gap-4">
      {!current ? (
        <div className="bg-border h-64 animate-pulse rounded-2xl" aria-busy="true" />
      ) : profile ? (
        <>
          <ProfileCard profile={profile} today={current.today} />
          <AvailabilityList profile={profile} isMe />
        </>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">Profile unavailable</p>
          <p className="text-muted mt-1 text-sm">Please try again in a moment.</p>
        </Card>
      )}

      <Link
        href="/settings"
        className="border-border bg-surface hover:border-brand inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium"
      >
        <Pencil className="size-4" aria-hidden />
        {incomplete ? "Complete your profile" : "Edit profile"}
      </Link>

      <h2 className="text-muted mt-2 text-sm font-semibold tracking-wide uppercase">Jump in</h2>
      <LinkCard
        href="/sport/padel"
        title="Padel"
        description="Find players or post your court."
        icon={<Trophy className="size-5" aria-hidden />}
      />
    </div>
  );
}
