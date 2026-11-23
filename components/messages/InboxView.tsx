"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GroupAvatar } from "@/components/groups/GroupAvatar";
import { useMyGroups } from "@/components/groups/useMyGroups";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { groupConversations as groupChats } from "@/lib/groups/groups";
import {
  badgeLabel,
  formatMessageTime,
  groupConversations,
  messagePreview,
} from "@/lib/messages/messages";
import type { SearchFilter, SearchItem } from "@/lib/messages/search";
import { isTypingToMe, typingInGroup, typingLabel } from "@/lib/presence/presence";
import { MessageSearchBar, MessageSearchResults } from "./MessageSearch";
import { useMyMessages } from "./useMyMessages";

interface InboxRow {
  key: string;
  href: string;
  avatar: React.ReactNode;
  name: string;
  /** ISO timestamp used for sorting and the time on the right. */
  time: string;
  preview: string;
  /** Shown instead of the preview, like WhatsApp's "typing…". */
  typing: string | null;
  unread: number;
}

/** All your chats, direct and groups, most recent first. */
export function InboxView() {
  const { user, users, ready } = useCurrentUser();
  const messages = useMyMessages(user?.id);
  const groups = useMyGroups(user?.id);
  const { presence } = usePresence();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");

  if (ready && !user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to see your messages</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }
  if (!user || !messages || !groups) {
    return <div className="bg-border h-48 animate-pulse rounded-2xl" aria-busy="true" />;
  }

  const firstName = (id: string) => {
    if (id === user.id) return "You";
    const u = users.find((x) => x.id === id);
    return u?.firstName || (u?.username ? `@${u.username}` : "Someone");
  };

  const direct: InboxRow[] = groupConversations(messages, user.id).map(
    ({ otherUserId, last, unread }) => {
      const other = users.find((u) => u.id === otherUserId);
      return {
        key: `u:${otherUserId}`,
        href: other?.username ? `/friends/chat?u=${other.username}` : "/friends/messages",
        avatar: (
          <Avatar
            firstName={other?.firstName ?? "?"}
            lastName={other?.lastName ?? ""}
            username={other?.username}
            url={other?.avatarUrl}
            size={52}
            online={presence.online.has(otherUserId)}
          />
        ),
        name: other
          ? [other.firstName, other.lastName].filter(Boolean).join(" ") || `@${other.username}`
          : "Student",
        time: last.createdAt,
        preview: `${last.senderId === user.id ? "You: " : ""}${messagePreview(last)}`,
        typing: isTypingToMe(presence, otherUserId, user.id) ? "typing…" : null,
        unread,
      };
    },
  );

  const grouped: InboxRow[] = groupChats(groups.groups, groups.messages, user.id).map(
    ({ group, last, unread }) => ({
      key: `g:${group.id}`,
      href: `/friends/group?id=${group.id}`,
      avatar: <GroupAvatar name={group.name} photoUrl={group.photoUrl} size={52} />,
      name: group.name,
      time: last?.createdAt ?? group.createdAt,
      preview: last
        ? `${firstName(last.senderId)}: ${messagePreview(last)}`
        : group.createdBy === user.id
          ? "You created this group"
          : `${firstName(group.createdBy)} added you`,
      typing: typingLabel(
        typingInGroup(presence, group.id, user.id)
          .filter((id) => group.members.some((m) => m.userId === id))
          .map(firstName),
      ),
      unread,
    }),
  );

  // Newest message on top. Compared as dates: the database and the demo write times differently.
  const rows = [...direct, ...grouped].sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const now = new Date();

  // Search: every message the inbox already has (your latest direct and group messages).
  const searching = Boolean(query.trim()) || filter !== "all";
  const usernameOf = (id: string) => users.find((u) => u.id === id)?.username;
  const searchItems: SearchItem[] = searching
    ? [
        ...messages.map((m) => {
          const otherId = m.senderId === user.id ? m.recipientId : m.senderId;
          return {
            ...m,
            chat: {
              kind: "direct" as const,
              id: usernameOf(otherId) ?? "",
              name: direct.find((r) => r.key === `u:${otherId}`)?.name ?? "Student",
            },
          };
        }),
        ...groups.messages.flatMap((m) => {
          const group = groups.groups.find((g) => g.id === m.groupId);
          return group
            ? [{ ...m, chat: { kind: "group" as const, id: group.id, name: group.name } }]
            : [];
        }),
      ]
    : [];
  const hrefFor = (item: SearchItem) =>
    item.chat.kind === "group"
      ? `/friends/group?id=${item.chat.id}&m=${item.id}`
      : `/friends/chat?u=${item.chat.id}&m=${item.id}`;

  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 && (
        <MessageSearchBar query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
      )}
      {searching ? (
        <MessageSearchResults
          query={query}
          filter={filter}
          chats={rows}
          items={searchItems}
          senderName={firstName}
          hrefFor={hrefFor}
        />
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-brand text-brand-foreground flex size-14 items-center justify-center rounded-2xl">
            <MessageCircle className="size-7" aria-hidden />
          </span>
          <p className="font-semibold">No messages yet</p>
          <p className="text-muted max-w-xs text-sm">
            Find someone in Friends and say hi, start a group, or message the person behind a room
            or padel match.
          </p>
          <Link
            href="/friends"
            className="bg-brand text-brand-foreground inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium hover:opacity-90"
          >
            Find students
          </Link>
        </Card>
      ) : (
        <ul className="bg-surface overflow-hidden rounded-3xl">
          {rows.map((row) => (
            <li key={row.key} className="group">
              <Link
                href={row.href}
                className="focus-visible:outline-brand active:bg-brand/5 flex items-center gap-3 pl-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                {row.avatar}
                <span className="border-border flex min-w-0 flex-1 flex-col justify-center border-b py-3 pr-4 group-last:border-b-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-[17px] ${row.unread ? "font-bold" : "font-semibold"}`}
                    >
                      {row.name}
                    </span>
                    <span
                      className={`shrink-0 text-xs ${row.unread ? "font-semibold text-[#d70015] dark:text-[#ff6961]" : "text-muted"}`}
                    >
                      {formatMessageTime(row.time, now)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-[15px] ${row.typing ? "text-brand font-medium" : row.unread ? "text-foreground font-medium" : "text-muted"}`}
                    >
                      {row.typing ?? row.preview}
                    </span>
                    {row.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#d70015] px-1.5 text-[12px] font-semibold text-white tabular-nums">
                        {badgeLabel(row.unread)}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
