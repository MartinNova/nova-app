"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { toISODate } from "@/lib/padel/dates";
import { filterListings } from "@/lib/rooms/rooms";
import { roomService } from "@/lib/services/rooms.service";
import { ROOM_AREAS, type ListingKind, type NewRoomListing, type RoomListing } from "@/types/rooms";
import { NewListingForm } from "./NewListingForm";
import { RoomCard } from "./RoomCard";

const BUDGETS = [400, 500, 600, 700, 800, 1000];

const selectClass =
  "border-border bg-surface text-foreground h-10 w-full rounded-xl border px-2 text-sm";

const noSubscription = () => () => {};
const readToday = () => toISODate(new Date());

/** Rooms & flats board: free rooms and students looking for one. */
export function RoomsView() {
  const { user, users, ready, mode } = useCurrentUser();
  const toast = useToast();
  const userId = user?.id;
  // Today is only known in the browser (the page is prerendered).
  const today = useSyncExternalStore(noSubscription, readToday, () => null);
  const [listings, setListings] = useState<RoomListing[] | null>(null);
  const [kind, setKind] = useState<ListingKind>("offer");
  const [area, setArea] = useState("");
  const [maxRent, setMaxRent] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      roomService
        .listListings()
        .then(setListings)
        .catch((err: unknown) => {
          setListings([]);
          setError(err instanceof Error ? err.message : "Could not load listings.");
        }),
    [],
  );
  // Load again when someone signs in or out (listings need an account).
  useEffect(() => void reload(), [reload, userId]);
  // Live: new listings from other devices appear without reloading.
  useEffect(() => roomService.onChange(() => void reload()), [reload]);

  async function handleCreate(input: NewRoomListing, photos: Blob[]) {
    if (!user) throw new Error("Please sign in first.");
    await roomService.createListing(input, photos, user.id);
    toast(input.kind === "offer" ? "Listing posted" : "Search posted");
    setShowForm(false);
    setKind(input.kind);
    await reload();
  }

  if (ready && mode === "accounts" && !user) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-semibold">Sign in to see rooms</p>
        <p className="text-muted max-w-xs text-sm">
          Listings are shared with Nova students on the app, so you need an account to see and post
          them.
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

  if (!listings || !today) {
    return <div className="bg-border h-64 animate-pulse rounded-2xl" aria-busy="true" />;
  }

  const shown = filterListings(listings, { kind, area: area || undefined, maxRent }, today);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div role="tablist" className="bg-muted/10 flex gap-1 rounded-xl p-1">
        {(["offer", "wanted"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`h-9 flex-1 rounded-lg text-sm font-medium transition ${
              kind === k ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            {k === "offer" ? "Rooms offered" : "Looking for a room"}
          </button>
        ))}
      </div>

      {showForm && today ? (
        <NewListingForm
          kind={kind}
          today={today}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <Button className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="size-4" aria-hidden />{" "}
          {kind === "offer" ? "Offer a room" : "Post that you're looking"}
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={selectClass}
        >
          <option value="">All areas</option>
          {ROOM_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          aria-label={kind === "offer" ? "Max. rent" : "Budget"}
          value={maxRent ?? ""}
          onChange={(e) => setMaxRent(e.target.value ? Number(e.target.value) : undefined)}
          className={selectClass}
        >
          <option value="">Any price</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              up to {b} €
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="font-semibold">
            {kind === "offer" ? "No rooms match right now" : "Nobody is looking right now"}
          </p>
          <p className="text-muted mt-1 text-sm">
            {kind === "offer"
              ? "Leaving your room for exchange? Post it here."
              : "Need a room? Post what you're looking for."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((l) => (
            <RoomCard
              key={l.id}
              listing={l}
              poster={users.find((u) => u.id === l.createdBy)}
              today={today}
            />
          ))}
        </div>
      )}

      {mode === "demo" && (
        <p className="text-muted text-xs">
          Demo mode: listings are stored in this browser only. With real accounts everyone sees
          them.
        </p>
      )}
    </div>
  );
}
