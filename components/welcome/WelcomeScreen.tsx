"use client";

import Image from "next/image";
import Link from "next/link";
import { setGuest } from "@/lib/welcome/guest";
import { AppPreview } from "./AppPreview";
import { StudentCount } from "./StudentCount";

/** First screen for signed-out visitors: what the app does, then sign in or look around. */
export function WelcomeScreen() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      {/* Transparent black logo; turned white in dark mode. */}
      <Image
        priority
        src="/nova-logo.png"
        alt="Nova School of Business & Economics"
        width={572}
        height={80}
        className="h-7 w-auto max-w-none dark:invert"
      />

      <h1 className="mt-8 text-4xl leading-tight font-bold tracking-tight">
        Your campus life in one app
      </h1>
      <p className="text-muted mt-3 text-lg">
        Sport, friends, rooms and everything you need at Nova SBE.
      </p>

      <div className="mt-8">
        <AppPreview />
      </div>

      <div className="mt-auto grid gap-3 pt-8">
        <StudentCount />
        <Link
          href="/login?tab=signup"
          className="bg-brand text-brand-foreground flex h-12 items-center justify-center rounded-xl text-base font-semibold hover:opacity-90"
        >
          Create account
        </Link>
        <Link
          href="/login?tab=signin&next=/"
          className="border-border bg-surface hover:border-brand flex h-12 items-center justify-center rounded-xl border text-base font-semibold"
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={() => setGuest(true)}
          className="text-muted hover:text-foreground h-11 text-sm underline-offset-4 hover:underline"
        >
          Look around first
        </button>
      </div>
    </div>
  );
}
