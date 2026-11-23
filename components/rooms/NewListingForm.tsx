"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resizePhoto } from "@/lib/rooms/photos";
import { listingFormCopy } from "@/lib/rooms/rooms";
import {
  MAX_ROOM_PHOTOS,
  ROOM_AREAS,
  ROOM_TYPES,
  type ListingKind,
  type ListingPhotos,
  type NewRoomListing,
  type RoomListing,
  type RoomType,
} from "@/types/rooms";

interface NewListingFormProps {
  /** Offer or search: follows the "Rooms offered / Looking for a room" tab. */
  kind: ListingKind;
  today: string;
  /** Editing: the listing as it is now (fields and photos start filled in). */
  initial?: RoomListing;
  onSubmit: (input: NewRoomListing, photos: ListingPhotos) => Promise<void>;
  onClose: () => void;
}

/** A photo in the form: already uploaded (only a URL) or just picked (a blob to upload). */
interface FormPhoto {
  url: string;
  blob?: Blob;
}

const fieldClass =
  "border-border bg-surface focus-visible:outline-brand mt-1 h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-2";

/** Post a free room, or that you are looking for one (depending on the tab), or edit yours. */
export function NewListingForm({ kind, today, initial, onSubmit, onClose }: NewListingFormProps) {
  const copy = listingFormCopy(kind);
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [roomType, setRoomType] = useState<RoomType>(initial?.roomType ?? "room");
  const [area, setArea] = useState<string>(initial?.area ?? ROOM_AREAS[0]);
  const [rent, setRent] = useState(initial ? String(initial.rent) : "");
  const [billsIncluded, setBillsIncluded] = useState(initial?.billsIncluded ?? false);
  const [availableFrom, setAvailableFrom] = useState(initial?.availableFrom ?? today);
  const [availableUntil, setAvailableUntil] = useState(initial?.availableUntil ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photos, setPhotos] = useState<FormPhoto[]>(
    () => initial?.photos.map((url) => ({ url })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    try {
      const picked = [...files].slice(0, MAX_ROOM_PHOTOS - photos.length);
      const resized = await Promise.all(picked.map((f) => resizePhoto(f)));
      setPhotos((current) => [
        ...current,
        ...resized.map((blob) => ({ blob, url: URL.createObjectURL(blob) })),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the photo.");
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      if (current[index].blob) URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          kind,
          title,
          roomType,
          area,
          rent: Number(rent),
          billsIncluded,
          availableFrom,
          availableUntil,
          description,
        },
        copy.withPhotos
          ? {
              kept: photos.filter((p) => !p.blob).map((p) => p.url),
              added: photos.flatMap((p) => (p.blob ? [p.blob] : [])),
            }
          : { kept: [], added: [] },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editing
            ? "Could not save the changes."
            : "Could not post the listing.",
      );
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <h2 className="text-base font-semibold">{editing ? "Edit listing" : copy.heading}</h2>

        <label className="text-sm font-medium">
          Title
          <input
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.titlePlaceholder}
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Type
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
              className={fieldClass}
            >
              {Object.entries(ROOM_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {copy.priceLabel}
            <input
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              step={1}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="600"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={billsIncluded}
            onChange={(e) => setBillsIncluded(e.target.checked)}
            className="accent-brand size-4"
          />
          Bills (water, power, internet) included
        </label>

        <label className="text-sm font-medium">
          Area
          <select value={area} onChange={(e) => setArea(e.target.value)} className={fieldClass}>
            {ROOM_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            {copy.fromLabel}
            <input
              type="date"
              required
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium">
            Until (optional)
            <input
              type="date"
              min={availableFrom}
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="text-sm font-medium">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder={copy.descriptionPlaceholder}
            className="border-border bg-surface focus-visible:outline-brand mt-1 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2"
          />
        </label>

        {copy.withPhotos && (
          <fieldset>
            <legend className="text-sm font-medium">
              Photos ({photos.length}/{MAX_ROOM_PHOTOS})
            </legend>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img
                    src={p.url}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </div>
              ))}
              {photos.length < MAX_ROOM_PHOTOS && (
                <label className="border-border hover:border-brand text-muted flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-xs">
                  <ImagePlus className="text-brand size-5" aria-hidden />
                  Add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </fieldset>
        )}

        <p className="text-muted text-xs">
          Your listing is visible to everyone signed in to the app. Others contact you via your
          profile, so add Instagram or LinkedIn in Settings.
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? editing
                ? "Saving…"
                : "Posting…"
              : editing
                ? "Save changes"
                : "Post listing"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
