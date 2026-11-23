"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { normalizeUsername } from "@/lib/profile/profile-rules";
import { profileService } from "@/lib/services/profile.service";
import type { Profile, ProfileUpdate } from "@/types/profile";
import { AccountSection } from "./AccountSection";
import { AvailabilitySection } from "./AvailabilitySection";
import {
  AboutSection,
  ContactSection,
  FieldPrivacySection,
  InterestsSection,
  PrivacySection,
  StudySection,
} from "./ProfileSections";

/** Editable copy of the profile (everything except e-mail). */
function toUpdate(profile: Profile): ProfileUpdate {
  const update: Partial<Profile> = { ...profile };
  delete update.userId;
  delete update.email;
  return update as ProfileUpdate;
}

function SettingsForm({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const { mode } = useCurrentUser();
  const [form, setForm] = useState<ProfileUpdate>(() => toUpdate(profile));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileUpdate>(key: K, value: ProfileUpdate[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      await profileService.updateProfile(profile.userId, {
        ...form,
        username: normalizeUsername(form.username),
      });
      await onSaved();
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setStatus("idle");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <AboutSection form={form} set={set} userId={profile.userId} />
        <ContactSection form={form} set={set} />
        <StudySection form={form} set={set} />
        <InterestsSection form={form} set={set} />
        <AvailabilitySection form={form} set={set} />
        <PrivacySection form={form} set={set} />
        <FieldPrivacySection form={form} set={set} />

        {/* Sticky save bar above the bottom navigation. */}
        <div className="border-border bg-surface/95 sticky bottom-20 z-10 flex items-center gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur">
          <Button type="submit" disabled={status === "saving"}>
            Save changes
          </Button>
          {status === "saved" && (
            <span role="status" className="text-sm text-green-700 dark:text-green-400">
              Saved
            </span>
          )}
          {error && (
            <span role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </span>
          )}
        </div>
      </form>

      {mode === "accounts" && <AccountSection email={profile.email} />}
    </div>
  );
}

type Loaded = { userId: string; profile: Profile | null };

export function SettingsView() {
  const { user, ready, mode, refresh } = useCurrentUser();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    profileService
      .getProfile(userId)
      .catch(() => null)
      .then((profile) => setLoaded({ userId, profile }));
  }, [user]);

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  if (!user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to change your settings</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }

  const current = loaded?.userId === user.id ? loaded : null;

  return (
    <>
      {mode === "demo" && (
        <p className="text-muted mb-4 text-sm">
          Demo mode: changes are saved in this browser only.
        </p>
      )}
      {!current ? (
        <div className="bg-border h-64 animate-pulse rounded-2xl" aria-busy="true" />
      ) : current.profile ? (
        // key: start fresh when you switch account.
        <SettingsForm key={user.id} profile={current.profile} onSaved={refresh} />
      ) : (
        <Card className="text-center">
          <p className="font-semibold">Profile unavailable</p>
          <p className="text-muted mt-1 text-sm">Please try again in a moment.</p>
        </Card>
      )}
    </>
  );
}
