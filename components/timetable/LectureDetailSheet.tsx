"use client";

import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LABEL_COLORS } from "@/types/todo";
import { WEEKDAYS } from "@/lib/timetable/dates";
import { normalizeUrl } from "@/lib/timetable/links";
import { getTerm, NOVA_TERMS } from "@/lib/timetable/terms";
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

/**
 * Tapping a lecture in the calendar or the day list: change everything about it (name, day, time,
 * room, term) plus Moodle link, notes and colour. Applies to every week of the lecture.
 */
export function LectureDetailSheet({
  lecture,
  onClose,
  onSave,
  onDelete,
}: LectureDetailSheetProps) {
  const [title, setTitle] = useState(lecture.title);
  const [weekday, setWeekday] = useState(lecture.weekday);
  const [start, setStart] = useState(lecture.start);
  const [end, setEnd] = useState(lecture.end);
  const [location, setLocation] = useState(lecture.location ?? "");
  const [termId, setTermId] = useState(lecture.termId);
  const [moodle, setMoodle] = useState(lecture.moodleUrl ?? "");
  const [notes, setNotes] = useState(lecture.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const savedUrl = lecture.moodleUrl;
  const isDirty =
    title !== lecture.title ||
    weekday !== lecture.weekday ||
    start !== lecture.start ||
    end !== lecture.end ||
    location !== (lecture.location ?? "") ||
    termId !== lecture.termId ||
    moodle !== (lecture.moodleUrl ?? "") ||
    notes !== (lecture.notes ?? "");

  /** Any edit: the button says "Save" again. */
  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setSaved(false);
    };
  }

  async function save() {
    const url = moodle.trim() ? normalizeUrl(moodle) : null;
    if (moodle.trim() && !url) {
      setError("Please enter a valid web link, e.g. https://moodle.novasbe.pt/…");
      return;
    }
    setError(null);
    try {
      await onSave(lecture.id, {
        title: title.trim(),
        weekday,
        start,
        end,
        location: location.trim() || undefined,
        termId,
        moodleUrl: url ?? undefined,
        notes: notes.trim() || undefined,
      });
      setMoodle(url ?? "");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the lecture.");
    }
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
        <section className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Course</span>
            <input
              value={title}
              onChange={(e) => edit(setTitle)(e.target.value)}
              required
              maxLength={100}
              className={`${INPUT} h-10`}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Day</span>
              <select
                value={weekday}
                onChange={(e) => edit(setWeekday)(Number(e.target.value))}
                className={`${INPUT} h-10`}
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={day} value={i + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">From</span>
              <input
                type="time"
                value={start}
                onChange={(e) => edit(setStart)(e.target.value)}
                className={`${INPUT} h-10`}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">To</span>
              <input
                type="time"
                value={end}
                onChange={(e) => edit(setEnd)(e.target.value)}
                className={`${INPUT} h-10`}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Room</span>
            <input
              value={location}
              onChange={(e) => edit(setLocation)(e.target.value)}
              maxLength={100}
              placeholder="e.g. B-201"
              className={`${INPUT} h-10`}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Repeats weekly during</span>
            <select
              value={termId}
              onChange={(e) => edit(setTermId)(e.target.value)}
              className={`${INPUT} h-10`}
            >
              {NOVA_TERMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <label htmlFor="moodle-url" className="mb-1 block text-sm font-medium">
            Moodle link
          </label>
          <input
            id="moodle-url"
            type="url"
            inputMode="url"
            value={moodle}
            onChange={(e) => edit(setMoodle)(e.target.value)}
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
            onChange={(e) => edit(setNotes)(e.target.value)}
            rows={4}
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
        <p className="text-muted text-xs">Changes apply to every week of this lecture.</p>
      </div>
    </Sheet>
  );
}
