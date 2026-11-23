"use client";

import { Check, Search, SendHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useFriendIds } from "@/components/friends/useFriendships";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
import { useMyGroups } from "@/components/groups/useMyGroups";
import { useMyMessages } from "@/components/messages/useMyMessages";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Sheet } from "@/components/timetable/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { messagePreview } from "@/lib/messages/messages";
import { groupService } from "@/lib/services/group.service";
import { messageService } from "@/lib/services/message.service";
import type { Attachment } from "@/types/messages";
import type { ChatItem } from "./MessageList";

/** At most this many chats at once (WhatsApp allows 5 too). */
const MAX_TARGETS = 5;

type Target = { kind: "user" | "group"; id: string };
const keyOf = (t: Target) => `${t.kind}:${t.id}`;

/** The picture or file of a message, fetched again so it can be sent as a new message. */
async function attachmentOf(item: ChatItem): Promise<Attachment | undefined> {
  if (item.imageUrl) {
    const blob = await (await fetch(item.imageUrl)).blob();
    return { kind: "image", blob };
  }
  if (item.file) {
    const blob = await (await fetch(item.file.url)).blob();
    return { kind: "file", file: new File([blob], item.file.name, { type: item.file.type }) };
  }
  return undefined;
}

interface ForwardSheetProps {
  item: ChatItem;
  onClose: () => void;
  /** After sending, with how many chats it went to. */
  onDone: (count: number) => void;
}

/** "Forward to…": pick up to five students or groups; the message arrives marked "Forwarded". */
export function ForwardSheet({ item, onClose, onDone }: ForwardSheetProps) {
  const { user, users } = useCurrentUser();
  const groups = useMyGroups(user?.id);
  const messages = useMyMessages(user?.id);
  const friends = useFriendIds();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Target[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const groupRows = (groups?.groups ?? []).map((g) => ({
      target: { kind: "group" as const, id: g.id },
      name: g.name,
      avatar: <GroupAvatar name={g.name} photoUrl={g.photoUrl} size={40} />,
    }));
    // Your friends and everyone you already have a chat with.
    const chatPartners = new Set((messages ?? []).flatMap((m) => [m.senderId, m.recipientId]));
    const userRows = users
      .filter(
        (u) => u.id !== user?.id && u.username && (friends.has(u.id) || chatPartners.has(u.id)),
      )
      .map((u) => ({
        target: { kind: "user" as const, id: u.id },
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || `@${u.username}`,
        avatar: (
          <Avatar
            firstName={u.firstName}
            lastName={u.lastName}
            username={u.username}
            url={u.avatarUrl}
            size={40}
          />
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...groupRows, ...userRows].filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [groups, users, user?.id, q, friends, messages]);

  function toggle(target: Target) {
    setChosen((list) =>
      list.some((t) => keyOf(t) === keyOf(target))
        ? list.filter((t) => keyOf(t) !== keyOf(target))
        : list.length < MAX_TARGETS
          ? [...list, target]
          : list,
    );
  }

  async function send() {
    if (!user || chosen.length === 0) return;
    setSending(true);
    setError(null);
    try {
      for (const target of chosen) {
        // A fresh copy each time: sending may consume the picture or file.
        const attachment = await attachmentOf(item);
        if (target.kind === "user")
          await messageService.send(user.id, target.id, item.body, attachment, { forwarded: true });
        else
          await groupService.send(target.id, user.id, item.body, attachment, { forwarded: true });
      }
      onDone(chosen.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not forward the message.");
      setSending(false);
    }
  }

  return (
    <Sheet
      title="Forward to…"
      subtitle={<span className="line-clamp-1">{messagePreview(item)}</span>}
      onClose={onClose}
    >
      <label className="relative mb-3 block">
        <span className="sr-only">Search chats</span>
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="border-border bg-background focus-visible:outline-brand h-10 w-full rounded-xl border pr-3 pl-9 text-base focus-visible:outline-2"
        />
      </label>

      <ul className="-mx-2 max-h-[45vh] overflow-y-auto">
        {rows.map(({ target, name, avatar }) => {
          const selected = chosen.some((t) => keyOf(t) === keyOf(target));
          const full = !selected && chosen.length >= MAX_TARGETS;
          return (
            <li key={keyOf(target)}>
              <button
                type="button"
                onClick={() => toggle(target)}
                disabled={full}
                aria-pressed={selected}
                className="active:bg-brand/5 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors disabled:opacity-40"
              >
                {avatar}
                <span className="min-w-0 flex-1 truncate text-[17px]">{name}</span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    selected ? "border-brand bg-brand text-brand-foreground" : "border-border"
                  }`}
                >
                  {selected && <Check className="size-4" strokeWidth={3} aria-hidden />}
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="text-muted px-2 py-6 text-center text-sm">No chats found</li>
        )}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={chosen.length === 0 || sending}
        className="bg-brand text-brand-foreground mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40"
      >
        <SendHorizontal className="size-5" aria-hidden />
        {sending
          ? "Forwarding…"
          : chosen.length > 1
            ? `Forward to ${chosen.length} chats`
            : "Forward"}
      </button>
    </Sheet>
  );
}
