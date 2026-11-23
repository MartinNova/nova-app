"use client";

import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LABEL_COLORS } from "@/types/todo";
import { WEEKDAYS } from "@/lib/timetable/dates";
import { normalizeUrl } from "@/lib/timetable/links";
import { getTerm } from "@/lib/timetable/terms";
import type { Lecture, LecturePatch } from "@/types/timetable";
import { COURSE_STYLE } from "./categoryStyles";
import { Sheet } from "./Sheet";

const INPUT =
  "border-border bg-surface focus-visible:outline-brand w-full rounded-xl border px-3 text-sm focus-visible:outline-2";

interface LectureDetailSheetProps {
  lecture: Lecture;
  onClose: () => void;
  onSave: (id: string, patch: LecturePatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** Course details: Moodle link and free-text notes. Same for every week of the lecture. */
export function LectureDetailSheet({
  lecture,
  onClose,
  onSave,
  onDelete,
}: LectureDetailSheetProps) {
  const [moodle, setMoodle] = useState(lecture.moodleUrl ?? "");
  const [notes, setNotes] = useState(lecture.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const savedUrl = lecture.moodleUrl;
  const isDirty = moodle !== (lecture.moodleUrl ?? "") || notes !== (lecture.notes ?? "");

  async function save() {
    const url = moodle.trim() ? normalizeUrl(moodle) : null;
    if (moodle.trim() && !url) {
      setError("Please enter a valid web link, e.g. https://moodle.novasbe.pt/…");
      return;
    }
    setError(null);
    await onSave(lecture.id, { moodleUrl: url ?? undefined, notes: notes.trim() || undefined });
    setMoodle(url ?? "");
    setSaved(true);
  }

  async function remove() {
    if (!window.confirm(`Delete "${lecture.title}" from every week?`)) return;
    await onDelete(lecture.id);
    onClose();
  }

  const term = getTerm(lecture.termId);

  return (
    <Sheet
      title={lecture.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2">
          <span>
            {WEEKDAYS[lecture.weekday - 1]} {lecture.start}–{lecture.end}
          </span>
          {lecture.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="size-3" aria-hidden />
              {lecture.location}
            </span>
          )}
          {term && <span>· {term.name}</span>}
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <section>
          <label htmlFor="moodle-url" className="mb-1 block text-sm font-medium">
            Moodle link
          </label>
          <input
            id="moodle-url"
            type="url"
            inputMode="url"
            value={moodle}
            onChange={(e) => {
              setMoodle(e.target.value);
              setSaved(false);
            }}
            placeholder="https://moodle.novasbe.pt/course/view.php?id=…"
            className={`${INPUT} h-10`}
          />
          {savedUrl && (
            <a
              href={savedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand mt-2 inline-flex items-center gap-1 text-sm font-medium"
            >
              <ExternalLink className="size-4" aria-hidden />
              Open course on Moodle
            </a>
          )}
        </section>

        <section>
          <label htmlFor="lecture-notes" className="mb-1 block text-sm font-medium">
            Notes
          </label>
          <textarea
            id="lecture-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            rows={6}
            placeholder="Professor, grading, readings, group members, anything…"
            className={`${INPUT} resize-y py-2`}
          />
        </section>

        <section>
          <p id="course-colour-label" className="mb-1.5 text-sm font-medium">
            Colour
          </p>
          <div
            role="group"
            aria-labelledby="course-colour-label"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              aria-pressed={!lecture.color}
              onClick={() => onSave(lecture.id, { color: undefined })}
              className={`focus-visible:outline-brand h-7 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 ${
                lecture.color ? "border-border text-muted" : "border-brand text-brand"
              }`}
            >
              Auto
            </button>
            {LABEL_COLORS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={lecture.color === value}
                onClick={() => onSave(lecture.id, { color: value })}
                className={`focus-visible:outline-brand size-7 rounded-full focus-visible:outline-2 ${COURSE_STYLE[value].dot} ${
                  lecture.color === value ? "ring-brand ring-2 ring-offset-2" : ""
                }`}
              />
            ))}
          </div>
          <p className="text-muted mt-1.5 text-xs">
            Shown in the calendar when “Colour lectures by course” is switched on.
          </p>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={!isDirty} className="flex-1">
            {saved && !isDirty ? "Saved" : "Save"}
          </Button>
          <Button variant="secondary" onClick={remove} aria-label="Delete lecture" className="px-3">
            <Trash2 className="size-4 text-red-600" aria-hidden />
          </Button>
        </div>
        <p className="text-muted text-xs">
          Link and notes apply to every week of this lecture and stay on this device.
        </p>
      </div>
    </Sheet>
  );
}
