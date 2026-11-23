"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Composer } from "@/components/messages/Composer";
import { MessageList } from "@/components/messages/MessageList";
import { TypingIndicator } from "@/components/messages/TypingIndicator";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { groupUnread, memberSummary } from "@/lib/groups/groups";
import { messagePreview } from "@/lib/messages/messages";
import { withReaction } from "@/lib/messages/reactions";
import { groupChatKey, typingInGroup, typingLabel } from "@/lib/presence/presence";
import { groupService } from "@/lib/services/group.service";
import type { GroupMessage } from "@/types/groups";
import type { Attachment } from "@/types/messages";
import { GroupAvatar } from "./GroupAvatar";
import { useGroup } from "./useGroup";

/** A group chat (?id=…): sender names above bubbles, pictures, files and @mentions, live. */
export function GroupChatView() {
  const params = useSearchParams();
  const groupId = params.get("id") ?? "";
  // Opened from search in Messages: jump to this message.
  const focusId = params.get("m");
  const { user, users, ready } = useCurrentUser();
  const { presence, setTyping } = usePresence();
  const userId = user?.id;
  const { group } = useGroup(groupId, userId);

  const [thread, setThread] = useState<{ groupId: string; messages: GroupMessage[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const knownUsernames = new Set(users.map((u) => u.username).filter((u): u is string => !!u));

  const reload = useCallback(() => {
    if (!groupId || !userId) return;
    void Promise.all([groupService.listMessages(groupId), groupService.getGroup(groupId, userId)])
      .then(([messages, current]) => {
        setThread({ groupId, messages });
        // Opening the chat (or a message arriving while it's open) counts as reading it.
        // Only when something is unread: marking read is itself a change that reloads.
        if (current && groupUnread(current, messages, userId) > 0)
          void groupService.markRead(groupId, userId).catch(() => {});
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the chat."),
      );
  }, [groupId, userId]);

  useEffect(reload, [reload]);
  useEffect(() => (userId ? groupService.onChange(userId, reload) : undefined), [userId, reload]);

  const messages = thread?.groupId === groupId ? thread.messages : null;

  function nameOf(id: string) {
    if (id === userId) return "You";
    const u = users.find((x) => x.id === id);
    return u ? u.firstName || `@${u.username}` : "Former member";
  }

  async function send(body: string, attachment?: Attachment) {
    if (!userId) return;
    await groupService.send(groupId, userId, body, attachment, { replyToId: replyTo?.id });
    setReplyTo(null);
    reload();
  }

  // Shown at once; the database confirms (or the reload undoes it).
  function react(item: { id: string }, emoji: string | null) {
    if (!userId) return;
    setThread(
      (t) =>
        t && {
          ...t,
          messages: t.messages.map((m) =>
            m.id === item.id ? { ...m, reactions: withReaction(m.reactions, userId, emoji) } : m,
          ),
        },
    );
    groupService.react(item.id, userId, emoji).then(reload, (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not react.");
      reload();
    });
  }

  function remove(item: { id: string }) {
    if (!userId) return;
    if (replyTo?.id === item.id) setReplyTo(null);
    groupService.remove(item.id, userId).then(reload, (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not delete the message.");
    });
  }

  if (!ready || (user && group === undefined)) {
    return <div className="bg-border mt-14 h-64 animate-pulse rounded-2xl" />;
  }
  if (!user) {
    return (
      <>
        <PageHeader title="Group" backHref="/friends/messages" />
        <Card className="text-center">
          <p className="font-semibold">Sign in to see your groups</p>
          <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
            Sign in or create account
          </Link>
        </Card>
      </>
    );
  }
  if (!group) {
    return (
      <>
        <PageHeader title="Group" backHref="/friends/messages" />
        <Card className="text-center">
          <p className="font-semibold">You&apos;re not in this group</p>
          <p className="text-muted mt-1 text-sm">You left, were removed, or it was deleted.</p>
        </Card>
      </>
    );
  }

  // Only members count; someone who just left the group doesn't show as typing in it.
  const typers = typingInGroup(presence, group.id, user.id).filter((id) =>
    group.members.some((m) => m.userId === id),
  );
  const typing = typingLabel(typers.map(nameOf));
  const onlineCount = group.members.filter(
    (m) => m.userId !== user.id && presence.online.has(m.userId),
  ).length;

  return (
    <>
      <PageHeader title={group.name} backHref="/friends/messages" />
      <div className="grid grid-cols-1 gap-3">
        <Link
          href={`/friends/group/info?id=${group.id}`}
          className="bg-surface focus-visible:outline-brand active:bg-brand/5 flex items-center gap-3 rounded-3xl p-3 transition focus-visible:outline-2 active:scale-[0.98]"
        >
          <GroupAvatar name={group.name} photoUrl={group.photoUrl} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{group.name}</span>
            <span
              className={`block truncate text-sm ${typing ? "text-brand font-medium" : "text-muted"}`}
            >
              {typing ??
                `${onlineCount > 0 ? `${onlineCount} online · ` : ""}${memberSummary(group, user.id, nameOf)}`}
            </span>
          </span>
          <ChevronRight className="text-muted/60 size-5 shrink-0" aria-hidden />
        </Link>

        {!messages ? (
          <div className="bg-border h-48 animate-pulse rounded-2xl" aria-busy="true" />
        ) : messages.length === 0 ? (
          <p className="text-muted py-8 text-center text-sm">
            Say hi to the group. Only members can see these messages.
          </p>
        ) : (
          <MessageList
            items={messages}
            userId={user.id}
            knownUsernames={knownUsernames}
            label={`Group chat ${group.name}`}
            nameOf={nameOf}
            authorOf={nameOf}
            onReact={react}
            onReply={(item) => setReplyTo(messages.find((m) => m.id === item.id) ?? null)}
            onDelete={remove}
            senderOf={(id) => users.find((u) => u.id === id)}
            focusId={focusId}
          />
        )}

        <TypingIndicator label={typing} />

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <Composer
          placeholder="Message"
          onSend={send}
          replyTo={
            replyTo && {
              name: replyTo.senderId === user.id ? "yourself" : nameOf(replyTo.senderId),
              preview: messagePreview(replyTo),
            }
          }
          onCancelReply={() => setReplyTo(null)}
          onTyping={(on) => setTyping(on ? groupChatKey(group.id) : null)}
        />
      </div>
    </>
  );
}
