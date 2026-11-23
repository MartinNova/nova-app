"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { User } from "@/types/user";

interface MemberPickerProps {
  /** People you can pick (already without yourself and existing members). */
  people: User[];
  /** Your friends: listed first, under "Friends", so they're quick to find. */
  friendIds?: ReadonlySet<string>;
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Shown when there's nobody to pick at all. */
  emptyText?: string;
}

export const fullName = (u: User) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || `@${u.username}`;

/** Searchable list with round check marks, like picking contacts for a WhatsApp group. */
export function MemberPicker({
  people,
  selected,
  onChange,
  friendIds = new Set(),
  emptyText = "Nobody else is on the app yet.",
}: MemberPickerProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = people
    .filter((u) => !q || fullName(u).toLowerCase().includes(q) || u.username?.includes(q))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  // Friends on top; everyone else below, so you can still add people you aren't friends with.
  const sections = [
    { title: "Friends", people: shown.filter((u) => friendIds.has(u.id)) },
    {
      title: friendIds.size ? "Other students" : "Students",
      people: shown.filter((u) => !friendIds.has(u.id)),
    },
  ].filter((s) => s.people.length > 0);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Search people</span>
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or @username"
          className="border-border bg-surface focus-visible:outline-brand h-11 w-full rounded-xl border pr-3 pl-9 text-base focus-visible:outline-2"
        />
      </label>

      {shown.length === 0 ? (
        <p className="text-muted py-6 text-center text-sm">
          {people.length === 0 ? emptyText : "Nobody found."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-1.5">
              <h3 className="text-muted px-4 text-[13px]">
                {section.title}
                <span className="sr-only">: {section.people.length}</span>
              </h3>
              <ul className="bg-surface overflow-hidden rounded-3xl">
                {section.people.map((u) => {
                  const on = selected.includes(u.id);
                  return (
                    <li key={u.id} className="group">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(u.id)}
                        className="active:bg-brand/5 flex min-h-14 w-full items-center gap-3 pl-4 text-left transition-colors"
                      >
                        <Avatar
                          firstName={u.firstName}
                          lastName={u.lastName}
                          username={u.username}
                          url={u.avatarUrl}
                          size={40}
                        />
                        <span className="border-border flex min-h-14 flex-1 items-center gap-3 border-b pr-4 group-last:border-b-0">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[17px]">{fullName(u)}</span>
                            {u.username && (
                              <span className="text-muted block truncate text-[13px]">
                                @{u.username}
                              </span>
                            )}
                          </span>
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                              on
                                ? "bg-brand border-brand text-brand-foreground scale-100"
                                : "border-muted/50"
                            }`}
                          >
                            {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
