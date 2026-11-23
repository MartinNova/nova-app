"use client";

import { CalendarPlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { PLAYTOMIC_HOME } from "@/lib/padel/clubs";
import { firstDayWithMatch, fromISODate, upcomingDates } from "@/lib/padel/dates";
import { filterMatches, myMatches } from "@/lib/padel/matches";
import { padelService } from "@/lib/services/padel.service";
import { celebrate } from "@/lib/ui/confetti";
import { PADEL_LEVELS, freeSpots, type NewPadelMatch, type PadelMatch } from "@/types/padel";
import { DayStrip } from "./DayStrip";
import { MatchCard } from "./MatchCard";
import { NewMatchForm } from "./NewMatchForm";
import { PlaytomicLink } from "./PlaytomicLink";

const DAYS_SHOWN = 14;

/** Padel calendar: pick a day, see posted courts, join or post your own. */
export function PadelView() {
  const { user, users, ready, mode } = useCurrentUser();
  const userId = user?.id;
  // Today's date is only read in the browser (not during server rendering).
  const [dates, setDates] = useState<string[] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [level, setLevel] = useState<number | undefined>(undefined);
  const [matches, setMatches] = useState<PadelMatch[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => padelService.listMatches().then(setMatches), []);
  // Load again when someone signs in or out (shared matches need an account).
  useEffect(() => {
    void padelService
      .listMatches()
      .catch((err: unknown) => {
        // Show the problem instead of loading forever.
        setError(err instanceof Error ? err.message : "Could not load matches.");
        return [];
      })
      .then((list) => {
        const days = upcomingDates(new Date(), DAYS_SHOWN);
        setDates(days);
        // Open on the first day with a match, so courts posted for later show up right away.
        setSelectedDate(
          (current) =>
            current ||
            firstDayWithMatch(
              days,
              list.map((m) => m.date),
            ),
        );
        setMatches(list);
      });
  }, [userId]);
  // Live: new matches and players from other devices appear without reloading.
  useEffect(() => padelService.onChange(() => void reload()), [reload]);

  const toast = useToast();
  const myPending = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!matches || !userId) return;
    const pendingNow = new Set<string>();
    for (const m of matches) {
      const mine = m.requests?.find((r) => r.userId === userId);
      if (mine?.status === "pending") pendingNow.add(m.id);
      else if (mine?.status === "accepted" && myPending.current.has(m.id)) {
        celebrate();
        toast("You're in! See you on court 🎾");
      }
    }
    myPending.current = pendingNow;
  }, [matches, userId, toast]);

  const levelMatches = useMemo(() => filterMatches(matches ?? [], { level }), [matches, level]);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const m of levelMatches) result[m.date] = (result[m.date] ?? 0) + 1;
    return result;
  }, [levelMatches]);
  const dayMatches = levelMatches.filter((m) => m.date === selectedDate);
  // levelMatches is sorted by date and time, so this is the earliest match after this day.
  const nextMatch = levelMatches.find((m) => m.date > selectedDate && dates?.includes(m.date));
  // Always visible, whatever day is picked, so you see your court days before you play.
  const mine = userId ? myMatches(matches ?? [], userId) : [];

  async function run(matchId: string, action: () => Promise<unknown>, success?: string) {
    setBusyId(matchId);
    setError(null);
    try {
      const result = await action();
      if (success) toast(success);
      // Accepting the last free place fills the court: celebrate!
      if (result && typeof result === "object" && "playerIds" in result) {
        const match = result as PadelMatch;
        if (freeSpots(match) === 0 && match.createdBy === user?.id) {
          celebrate();
          toast("Court full, enjoy the game! 🎾");
        }
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(input: NewPadelMatch) {
    if (!user) throw new Error("Please sign in first.");
    const created = await padelService.createMatch(input, user.id);
    toast("Court posted");
    setShowForm(false);
    setSelectedDate(created.date);
    await reload();
  }

  if (ready && mode === "accounts" && !user) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-semibold">Sign in to find padel players</p>
        <p className="text-muted max-w-xs text-sm">
          Matches are shared with everyone on the app, so you need an account to see and join them.
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

  if (!dates || !matches) {
    return (
      <div
        className="bg-border h-64 animate-pulse rounded-2xl"
        aria-busy="true"
        aria-label="Loading matches"
      />
    );
  }

  const dayLabel = fromISODate(selectedDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <Card className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Need a court?</p>
          <p className="text-muted text-sm">
            Book on Playtomic (search “Lisboa”), then post it here.
          </p>
        </div>
        <PlaytomicLink
          href={PLAYTOMIC_HOME}
          className="bg-brand text-brand-foreground inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-medium hover:opacity-90"
        >
          Book a court
        </PlaytomicLink>
      </Card>

      {showForm ? (
        <NewMatchForm
          initialDate={selectedDate}
          minDate={dates[0]}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <Button className="mb-4 w-full" onClick={() => setShowForm(true)}>
          <CalendarPlus className="size-4" aria-hidden /> Post your court
        </Button>
      )}

      <DayStrip dates={dates} value={selectedDate} onChange={setSelectedDate} counts={counts} />

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="padel-day" className="scroll-mt-24 font-semibold">
          {dayLabel}
        </h2>
        <label className="text-muted flex items-center gap-2 text-sm">
          Level
          <select
            value={level ?? ""}
            onChange={(e) => setLevel(e.target.value === "" ? undefined : Number(e.target.value))}
            className="border-border bg-surface text-foreground h-9 max-w-40 rounded-xl border px-2 text-sm"
          >
            <option value="">All levels</option>
            {PADEL_LEVELS.map((band) => (
              <option key={band.min} value={band.min}>
                {band.min.toFixed(1)}–{band.max.toFixed(1)} {band.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {dayMatches.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="font-semibold">No matches on this day</p>
          <p className="text-muted mt-1 text-sm">Booked a court? Post it and find players.</p>
          {nextMatch && (
            <button
              type="button"
              onClick={() => setSelectedDate(nextMatch.date)}
              className="bg-brand/10 text-brand focus-visible:outline-brand mt-4 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 active:scale-95"
            >
              Next match:{" "}
              {fromISODate(nextMatch.date).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              · {nextMatch.time}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {dayMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              currentUserId={user?.id}
              users={users}
              busy={busyId === m.id}
              onRequest={(note) =>
                run(m.id, () => padelService.requestToJoin(m.id, user!.id, note), "Request sent")
              }
              onWithdraw={() =>
                run(m.id, () => padelService.withdrawRequest(m.id, user!.id), "Request taken back")
              }
              onRespond={(requestId, accept) =>
                run(
                  m.id,
                  () => padelService.respondToRequest(m.id, requestId, accept, user!.id),
                  accept ? "Player added" : "Request declined",
                )
              }
              onLeave={() =>
                run(m.id, () => padelService.leaveMatch(m.id, user!.id), "You left the match")
              }
              onCancel={() =>
                run(m.id, () => padelService.cancelMatch(m.id, user!.id), "Match cancelled")
              }
            />
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="your-matches" className="mt-8">
          <h2 id="your-matches" className="mb-3 font-semibold">
            Your matches
          </h2>
          <ul className="bg-surface divide-border divide-y rounded-2xl">
            {mine.map((m) => {
              const date = fromISODate(m.date);
              const status =
                m.createdBy === userId
                  ? "You posted"
                  : m.playerIds.includes(userId!)
                    ? "You're in"
                    : "Requested";
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(m.date);
                      document.getElementById("padel-day")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="focus-visible:outline-brand flex w-full items-center gap-3 rounded-2xl p-3 text-left focus-visible:outline-2 active:opacity-70"
                  >
                    <span className="bg-brand/10 text-brand flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5">
                      <span className="text-xs">
                        {m.date === dates[0]
                          ? "Today"
                          : date.toLocaleDateString("en-GB", { weekday: "short" })}
                      </span>
                      <span className="text-lg leading-tight font-semibold">{date.getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {m.time} · {m.location}
                      </span>
                      <span className="text-muted block text-sm">
                        {status} ·{" "}
                        {freeSpots(m) === 0
                          ? "Court full"
                          : `${freeSpots(m)} ${freeSpots(m) === 1 ? "spot" : "spots"} free`}
                      </span>
                    </span>
                    <ChevronRight className="text-muted size-4 shrink-0" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
