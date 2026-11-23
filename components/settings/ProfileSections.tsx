"use client";

import { Camera, Phone } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { GroupedList, InputRow } from "@/components/ui/GroupedList";
import { squareAvatar } from "@/lib/profile/avatar";
import {
  COUNTRY_CODES,
  countryName,
  flagEmoji,
  normalizePhone,
  validatePhone,
} from "@/lib/profile/profile-rules";
import { profileService } from "@/lib/services/profile.service";
import { PADEL_LEVELS } from "@/types/padel";
import {
  BIO_MAX_LENGTH,
  DAY_TIMES,
  LANGUAGES,
  NOVA_PROGRAMS,
  SPORT_INTERESTS,
  STUDY_STATUSES,
  VISIBILITIES,
  WEEKDAYS,
  type ProfileUpdate,
  type StudyStatus,
  type Visibility,
} from "@/types/profile";
import { ChipGroup, MonthPicker, Section, fieldClass } from "./fields";

interface SectionProps {
  form: ProfileUpdate;
  set: <K extends keyof ProfileUpdate>(key: K, value: ProfileUpdate[K]) => void;
}

export function AboutSection({ form, set, userId }: SectionProps & { userId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const image = await squareAvatar(file);
      set("avatarUrl", await profileService.uploadAvatar(userId, image));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Section title="Profile" description="This is how other students see you.">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label="Change profile picture"
          className="group focus-visible:outline-brand relative rounded-full focus-visible:outline-2"
        >
          <Avatar
            firstName={form.firstName}
            lastName={form.lastName}
            username={form.username}
            url={form.avatarUrl}
            size={72}
            className={uploading ? "opacity-50" : ""}
          />
          <span className="bg-brand text-brand-foreground absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full shadow">
            <Camera className="size-4" aria-hidden />
          </span>
        </button>
        <div className="text-sm">
          <p className="font-medium">{uploading ? "Uploading…" : "Profile picture"}</p>
          <p className="text-muted">Tap the picture to choose a photo.</p>
          {form.avatarUrl && !uploading && (
            <button
              type="button"
              onClick={() => set("avatarUrl", "")}
              className="text-muted underline"
            >
              Remove picture
            </button>
          )}
          {uploadError && <p className="text-red-700 dark:text-red-400">{uploadError}</p>}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      <label className="text-sm font-medium">
        Username
        <div className="relative">
          <span className="text-muted pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2">
            @
          </span>
          <input
            required
            autoCapitalize="none"
            value={form.username}
            onChange={(e) => set("username", e.target.value.toLowerCase())}
            className={`${fieldClass} pl-7`}
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          First name
          <input
            required
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Last name
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="text-sm font-medium">
        Student ID
        <input
          inputMode="numeric"
          autoComplete="off"
          value={form.studentId}
          onChange={(e) => set("studentId", e.target.value.replace(/\D/g, ""))}
          maxLength={10}
          placeholder="e.g. 12345"
          className={fieldClass}
        />
        <span className="text-muted mt-1 block text-xs font-normal">
          Your Nova student number. Other students see it on your profile.
        </span>
      </label>

      <label className="text-sm font-medium">
        About you
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          placeholder="e.g. From Munich, new in Lisbon, looking for padel and surf buddies"
          className="border-border bg-surface focus-visible:outline-brand mt-1 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2"
        />
        <span className="text-muted block text-right text-xs">
          {form.bio.length}/{BIO_MAX_LENGTH}
        </span>
      </label>

      <label className="text-sm font-medium">
        Home country
        <select
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {flagEmoji(code)} {countryName(code)}
            </option>
          ))}
        </select>
      </label>

      <ChipGroup
        label="Languages you speak"
        options={LANGUAGES}
        value={form.languages}
        onChange={(v) => set("languages", v)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Instagram
          <input
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value.replace(/^@/, ""))}
            placeholder="your.handle"
            autoCapitalize="none"
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          LinkedIn
          <input
            type="url"
            value={form.linkedin}
            onChange={(e) => set("linkedin", e.target.value)}
            placeholder="https://www.linkedin.com/in/…"
            className={fieldClass}
          />
        </label>
      </div>
    </Section>
  );
}

/** Optional mobile number, as an iOS-style grouped row. */
export function ContactSection({ form, set }: SectionProps) {
  const [touched, setTouched] = useState(false);
  const error = touched ? validatePhone(normalizePhone(form.phone)) : null;

  return (
    <div className="grid gap-2">
      <GroupedList title="Contact">
        <InputRow
          icon={<Phone className="size-[18px]" aria-hidden />}
          tone="sport"
          label="Mobile"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+351 912 345 678"
          maxLength={25}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          onBlur={() => {
            setTouched(true);
            set("phone", normalizePhone(form.phone));
          }}
          onClear={() => {
            setTouched(false);
            set("phone", "");
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="phone-hint"
        />
      </GroupedList>
      <p id="phone-hint" className="text-muted mx-4 text-[13px]" aria-live="polite">
        {error ? (
          <span className="text-red-700 dark:text-red-400">{error}</span>
        ) : (
          "Optional. Students who can see your profile can call or text you. Leave it empty to hide it."
        )}
      </p>
    </div>
  );
}

export function StudySection({ form, set }: SectionProps) {
  return (
    <Section title="Studies at Nova" description="Your programme and when you are on campus.">
      <label className="text-sm font-medium">
        Programme
        <select
          value={form.program}
          onChange={(e) => set("program", e.target.value)}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {Object.entries(NOVA_PROGRAMS).map(([group, programs]) => (
            <optgroup key={group} label={group}>
              {programs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <MonthPicker label="Start" value={form.studyStart} onChange={(v) => set("studyStart", v)} />
        <MonthPicker
          label="Expected end"
          value={form.studyEnd}
          onChange={(v) => set("studyEnd", v)}
        />
      </div>
      <label className="text-sm font-medium">
        Status
        <select
          value={form.studyStatus}
          onChange={(e) => set("studyStatus", e.target.value as StudyStatus)}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {Object.entries(STUDY_STATUSES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </Section>
  );
}

export function InterestsSection({ form, set }: SectionProps) {
  return (
    <Section title="Sports & free time" description="Helps others find you for a game or a run.">
      <ChipGroup
        label="Sports you like"
        options={SPORT_INTERESTS}
        value={form.sports}
        onChange={(v) => set("sports", v)}
      />
      <label className="text-sm font-medium">
        Padel level
        <select
          value={form.padelLevel ?? ""}
          onChange={(e) => set("padelLevel", e.target.value === "" ? null : Number(e.target.value))}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {PADEL_LEVELS.map((band) => (
            <option key={band.min} value={band.min}>
              {band.min.toFixed(1)}–{band.max.toFixed(1)} {band.label}
            </option>
          ))}
        </select>
      </label>
      <ChipGroup
        label="Days you are usually free"
        options={WEEKDAYS}
        value={form.availabilityDays}
        onChange={(v) => set("availabilityDays", v)}
      />
      <ChipGroup
        label="Time of day"
        options={DAY_TIMES}
        value={form.availabilityTimes}
        onChange={(v) => set("availabilityTimes", v)}
      />
    </Section>
  );
}

export function PrivacySection({ form, set }: SectionProps) {
  return (
    <Section title="Privacy">
      <fieldset>
        <legend className="text-sm font-medium">Who can see your profile</legend>
        <div className="mt-2 grid gap-2">
          {(Object.entries(VISIBILITIES) as [Visibility, string][]).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                checked={form.visibility === id}
                onChange={() => set("visibility", id)}
                className="accent-brand size-4"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.showInSuggestions}
          onChange={(e) => set("showInSuggestions", e.target.checked)}
          className="accent-brand mt-0.5 size-4"
        />
        <span>
          <span className="font-medium">Show me in buddy suggestions</span>
          <span className="text-muted block">Coming soon: students with similar interests.</span>
        </span>
      </label>
    </Section>
  );
}
