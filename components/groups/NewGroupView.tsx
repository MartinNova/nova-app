"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { useFriendIds } from "@/components/friends/useFriendships";
import { Card } from "@/components/ui/Card";
import { validateNewGroup } from "@/lib/groups/groups";
import { groupService } from "@/lib/services/group.service";
import { MAX_GROUP_NAME_LENGTH } from "@/types/groups";
import { GroupPhotoPicker } from "./GroupPhotoPicker";
import { MemberPicker } from "./MemberPicker";

/** New group: picture, name and the people to add. You become its admin. */
export function NewGroupView() {
  const router = useRouter();
  const { user, users, ready } = useCurrentUser();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friends = useFriendIds();

  useEffect(() => (photo ? () => URL.revokeObjectURL(photo.url) : undefined), [photo]);

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;
  if (!user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to create groups</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }

  // Only friends can be added to a group (they don't get asked first).
  const people = users.filter((u) => friends.has(u.id));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const problem = validateNewGroup(name, selected);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const group = await groupService.createGroup(user.id, name, selected, photo?.blob);
      router.replace(`/friends/group?id=${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={create} className="flex flex-col gap-6">
      <Card className="flex items-center gap-4">
        <GroupPhotoPicker
          name={name}
          photoUrl={photo?.url ?? null}
          size={72}
          onPick={(blob) => setPhoto({ blob, url: URL.createObjectURL(blob) })}
          onError={setError}
        />
        <label className="min-w-0 flex-1">
          <span className="text-muted mb-1 block text-[13px] font-medium">Group name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_GROUP_NAME_LENGTH}
            placeholder="e.g. Corporate Finance group"
            autoFocus
            className="border-border bg-background focus-visible:outline-brand h-11 w-full rounded-xl border px-3 text-base focus-visible:outline-2"
          />
        </label>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="mx-1 flex items-baseline justify-between text-[22px] leading-7 font-bold">
          Add people
          {selected.length > 0 && (
            <span className="text-muted text-[15px] font-medium">{selected.length} selected</span>
          )}
        </h2>
        <MemberPicker people={people} selected={selected} onChange={setSelected} />
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Sticky so "Create" stays reachable while scrolling through people. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+92px)] z-10">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-brand-foreground focus-visible:outline-brand h-12 w-full rounded-2xl text-[17px] font-semibold shadow-lg transition focus-visible:outline-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create group"}
        </button>
      </div>
    </form>
  );
}
