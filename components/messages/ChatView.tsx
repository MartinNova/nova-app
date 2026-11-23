"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { messagePreview } from "@/lib/messages/messages";
import { withReaction } from "@/lib/messages/reactions";
import { directChatKey, isTypingToMe } from "@/lib/presence/presence";
import { toListingRef } from "@/lib/rooms/rooms";
import { messageService } from "@/lib/services/message.service";
import { roomService } from "@/lib/services/rooms.service";
import type { Attachment, ListingRef, Message } from "@/types/messages";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

/**
 * One chat with another student (?u=username), live. Coming from "Message" on a room listing
 * (&listing=<id>), the first message carries that listing as a card.
 */
export function ChatView() {
  const params = useSearchParams();
  const router = useRouter();
  const username = params.get("u") ?? "";
  const listingId = params.get("listing");
  const focusId = params.get("m");
  const { user, users, ready } = useCurrentUser();
  const { presence, setTyping } = usePresence();
  const other = users.find((u) => u.username === username.toLowerCase());
  const userId = user?.id;
  const otherId = other?.id;

  const [thread, setThread] = useState<{ key: string; messages: Message[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [aboutListing, setAboutListing] = useState<ListingRef | null>(null);
  const knownUsernames = new Set(users.map((u) => u.username).filter((u): u is string => !!u));
  const key = `${userId}:${otherId}`;

  const reload = useCallback(() => {
    if (!userId || !otherId) return;
    void messageService
      .listThread(userId, otherId)
      .then((messages) => {
        setThread({ key: `${userId}:${otherId}`, messages });
        // Opening the chat (or a new message arriving while it's open) counts as reading it.
        if (messages.some((m) => m.recipientId === userId && !m.readAt))
          void messageService.markRead(userId, otherId);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the chat."),
      );
  }, [userId, otherId]);

  useEffect(reload, [reload]);

  // The listing you came from, shown above the field until you send (or remove it).
  useEffect(() => {
    if (!listingId || !userId) return;
    let cancelled = false;
    roomService
      .getListing(listingId)
      .then((listing) => !cancelled && setAboutListing(listing ? toListingRef(listing) : null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listingId, userId]);

  /** Forget the listing: it was sent, or you removed it. Also drops it from the address. */
  function clearListing() {
    setAboutListing(null);
    if (listingId) router.replace(`/friends/chat?u=${encodeURIComponent(username)}`);
  }
  useEffect(() => (userId ? messageService.onChange(userId, reload) : undefined), [userId, reload]);

  const messages = thread?.key === key ? thread.messages : null;
  const online = !!otherId && presence.online.has(otherId);
  const typing = !!otherId && !!userId && isTypingToMe(presence, otherId, userId);

  async function send(body: string, attachment?: Attachment) {
    if (!userId || !otherId) return;
    await messageService.send(userId, otherId, body, attachment, {
      replyToId: replyTo?.id,
      listing: aboutListing,
    });
    setReplyTo(null);
    if (aboutListing) clearListing();
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
    messageService.react(item.id, userId, emoji).then(reload, (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not react.");
      reload();
    });
  }

  function remove(item: { id: string }) {
    if (!userId) return;
    if (replyTo?.id === item.id) setReplyTo(null);
    messageService.remove(item.id, userId).then(reload, (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not delete the message.");
    });
  }

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;
  if (!user) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Sign in to send messages</p>
        <Link href="/login" className="text-brand mt-2 inline-block text-sm underline">
          Sign in or create account
        </Link>
      </Card>
    );
  }
  if (!other) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Student not found</p>
        <p className="text-muted mt-1 text-sm">The account may have been deleted.</p>
      </Card>
    );
  }
  if (other.id === user.id) {
    return (
      <Card className="text-center">
        <p className="font-semibold">That&apos;s you</p>
        <p className="text-muted mt-1 text-sm">Pick someone else to message.</p>
      </Card>
    );
  }

  const name = [other.firstName, other.lastName].filter(Boolean).join(" ") || `@${other.username}`;

  return (
    <div className="grid grid-cols-1 gap-3">
      <Link
        href={`/friends/profile?u=${other.username}`}
        className="bg-surface focus-visible:outline-brand active:bg-brand/5 flex items-center gap-3 rounded-3xl p-3 transition focus-visible:outline-2 active:scale-[0.98]"
      >
        <Avatar
          firstName={other.firstName}
          lastName={other.lastName}
          username={other.username}
          url={other.avatarUrl}
          size={40}
          online={online}
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name}</span>
          {/* Like WhatsApp: "typing…", else "Online", else a link hint. */}
          <span
            className={`block text-sm ${typing ? "text-brand font-medium" : online ? "text-[#248a3d] dark:text-[#30d158]" : "text-muted"}`}
          >
            {typing ? "typing…" : online ? "Online" : "View profile"}
          </span>
        </span>
      </Link>

      {!messages ? (
        <div className="bg-border h-48 animate-pulse rounded-2xl" aria-busy="true" />
      ) : messages.length === 0 ? (
        <p className="text-muted py-8 text-center text-sm">
          Say hi to {other.firstName || name}. Messages are only visible to the two of you.
        </p>
      ) : (
        <MessageList
          items={messages}
          userId={user.id}
          knownUsernames={knownUsernames}
          label={`Chat with ${name}`}
          authorOf={(id) => (id === user.id ? "You" : other.firstName || name)}
          onReact={react}
          onReply={(item) => setReplyTo(messages.find((m) => m.id === item.id) ?? null)}
          onDelete={remove}
          focusId={focusId}
          footer={
            messages.at(-1)?.senderId === user.id &&
            messages.at(-1)?.readAt && <li className="text-muted justify-self-end text-xs">Seen</li>
          }
        />
      )}

      <TypingIndicator label={typing ? `${other.firstName || name} is typing…` : null} />

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <Composer
        placeholder={`Message ${other.firstName || name}`}
        onSend={send}
        replyTo={
          replyTo && {
            name: replyTo.senderId === user.id ? "yourself" : other.firstName || name,
            preview: messagePreview(replyTo),
          }
        }
        onCancelReply={() => setReplyTo(null)}
        listing={aboutListing}
        onCancelListing={clearListing}
        onTyping={(on) => setTyping(on && otherId ? directChatKey(otherId) : null)}
      />
    </div>
  );
}
