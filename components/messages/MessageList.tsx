"use client";

import { Forward, Reply, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { formatMessageTime, messagePreview } from "@/lib/messages/messages";
import { myReaction, nextReaction, summarizeReactions } from "@/lib/messages/reactions";
import type { ListingRef, MessageFile, Reaction } from "@/types/messages";
import type { User } from "@/types/user";
import { FileCard } from "./FileCard";
import { ListingCard } from "./ListingCard";
import { ForwardSheet } from "./ForwardSheet";
import { MessageActions } from "./MessageActions";
import { MessageText } from "./MessageText";
import { SWIPE_REPLY_PX, useMessageGestures } from "./useMessageGestures";

/** What a bubble needs; direct and group messages both fit. */
export interface ChatItem {
  id: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  file: MessageFile | null;
  createdAt: string;
  replyToId: string | null;
  forwarded: boolean;
  /** Direct messages sent from a room listing show it as a card. */
  listing?: ListingRef | null;
  reactions: Reaction[];
}

/** Colours for sender names in groups (like WhatsApp), all ≥ 4.5:1 on white and dark. */
const SENDER_COLORS = [
  "text-[#0b6e78] dark:text-[#5cc8d2]",
  "text-[#b5651d] dark:text-[#f0a868]",
  "text-[#2e7d32] dark:text-[#7cc47f]",
  "text-[#7b3fa0] dark:text-[#c79be0]",
  "text-[#a8325e] dark:text-[#f08cb3]",
  "text-[#0b2a4a] dark:text-[#7fb2e5]",
];

function colorFor(userId: string) {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SENDER_COLORS[hash % SENDER_COLORS.length];
}

interface MessageListProps {
  items: ChatItem[];
  userId: string;
  knownUsernames: ReadonlySet<string>;
  label: string;
  /** Who wrote a message, for quoted replies ("You", "Martin"). */
  authorOf: (userId: string) => string;
  /** Groups: show the sender's name above their messages. */
  nameOf?: (userId: string) => string;
  /** Groups: the sender's account, for the round picture next to their messages (tap → profile). */
  senderOf?: (userId: string) => User | undefined;
  /** Your reaction; null takes it back. */
  onReact: (item: ChatItem, emoji: string | null) => void;
  onReply: (item: ChatItem) => void;
  /** Only offered for your own messages. */
  onDelete: (item: ChatItem) => void;
  /** Shown after the last message, e.g. "Seen". */
  footer?: React.ReactNode;
  /** Opened from search: scroll to this message and light it up once. */
  focusId?: string | null;
}

/**
 * Chat bubbles with times, pictures (tap for full screen), files, @mentions, replies and
 * reactions. Holding a message (or right-clicking it) opens its menu.
 */
export function MessageList({
  items,
  userId,
  knownUsernames,
  label,
  authorOf,
  nameOf,
  senderOf,
  onReact,
  onReply,
  onDelete,
  footer,
  focusId,
}: MessageListProps) {
  const [viewing, setViewing] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forwarding, setForwarding] = useState<ChatItem | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const toast = useToast();
  const gestures = useMessageGestures({
    onLongPress: setActiveId,
    onSwipeReply: (id) => {
      const item = items.find((m) => m.id === id);
      if (item) onReply(item);
    },
  });
  const now = new Date();
  const byId = new Map(items.map((m) => [m.id, m]));
  // A message deleted while its menu is open closes the menu.
  const active = activeId ? byId.get(activeId) : undefined;

  // Newest message at the bottom, just above the message field (like any messenger).
  const count = items.length;
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [count]);

  // Coming from search: after the jump to the bottom, go to the found message and flash it.
  const focusLoaded = focusId ? byId.has(focusId) : false;
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || !focusLoaded || focused.current === focusId) return;
    // Marked as done inside the timer: in development React runs effects twice and the first
    // timer gets cancelled, so marking it here would skip the jump.
    const timer = setTimeout(() => {
      focused.current = focusId;
      document
        .getElementById(`message-${focusId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      setFlashId(focusId);
      setTimeout(() => setFlashId((current) => (current === focusId ? null : current)), 1800);
    }, 150);
    return () => clearTimeout(timer);
  }, [focusId, focusLoaded]);

  // Escape closes the full-screen picture.
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  /** Tapping a quote jumps to the original message and lights it up briefly. */
  function jumpTo(id: string) {
    document
      .getElementById(`message-${id}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashId(id);
    setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1400);
  }

  function bubbleFor(m: ChatItem, { interactive, tail }: { interactive: boolean; tail: boolean }) {
    const mine = m.senderId === userId;
    const attachment = Boolean(m.imageUrl || m.file);
    const original = m.replyToId ? byId.get(m.replyToId) : undefined;
    // Swipe to reply: the bubble follows the finger to the right.
    const dx = interactive && gestures.drag?.id === m.id ? gestures.drag.dx : 0;
    const bubble = (
      <span
        id={interactive ? `message-${m.id}` : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-haspopup={interactive ? "dialog" : undefined}
        onPointerDown={(e) => {
          if (interactive) gestures.start(e, m.id);
        }}
        onPointerMove={(e) => {
          if (interactive) gestures.move(e);
        }}
        onPointerUp={() => gestures.end()}
        onPointerCancel={() => gestures.cancel()}
        onClickCapture={(e) => {
          // Letting go after a swipe isn't a tap on a picture or link.
          if (gestures.consumeSwipe()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onContextMenu={
          interactive
            ? (e) => {
                e.preventDefault();
                gestures.cancel();
                setActiveId(m.id);
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (e) => {
                if (e.target !== e.currentTarget) return;
                if (
                  e.key === "Enter" ||
                  e.key === "ContextMenu" ||
                  (e.shiftKey && e.key === "F10")
                ) {
                  e.preventDefault();
                  setActiveId(m.id);
                }
              }
            : undefined
        }
        className={`focus-visible:outline-brand relative flex touch-pan-y flex-col overflow-hidden rounded-2xl text-[15px] break-words whitespace-pre-line select-none [-webkit-touch-callout:none] focus-visible:outline-2 ${
          interactive ? "max-w-full" : "max-w-[80%]"
        } ${dx ? "" : "transition-[transform,box-shadow] duration-300 ease-out"} ${
          mine
            ? `bg-brand text-brand-foreground justify-self-end ${tail ? "rounded-br-md" : ""}`
            : `bg-surface justify-self-start ${tail ? "rounded-bl-md" : ""}`
        } ${attachment ? "p-1" : "px-3.5 py-2"} ${flashId === m.id ? "ring-brand/40 ring-4" : ""} ${
          // Room for the listing's title even when the text is just "Hi".
          m.listing ? "min-w-[75%]" : ""
        }`}
      >
        {m.forwarded && (
          <span
            className={`mb-0.5 flex items-center gap-1 text-[13px] italic ${
              mine ? "opacity-75" : "text-muted"
            } ${attachment ? "px-2.5 pt-1" : ""}`}
          >
            <Forward className="size-3.5" aria-hidden />
            Forwarded
          </span>
        )}
        {m.listing && (
          <span className={attachment ? "px-1 pt-1" : ""}>
            <ListingCard listing={m.listing} mine={mine} interactive={interactive} />
          </span>
        )}
        {original && (
          <button
            type="button"
            onClick={() => interactive && jumpTo(original.id)}
            tabIndex={interactive ? 0 : -1}
            className={`mb-1 min-w-0 rounded-lg border-l-4 px-2.5 py-1.5 text-left ${
              mine ? "border-white/70 bg-white/15" : "border-brand bg-background"
            }`}
          >
            <span
              className={`block text-[13px] font-semibold ${
                mine
                  ? ""
                  : original.senderId === userId
                    ? "text-brand"
                    : colorFor(original.senderId)
              }`}
            >
              {authorOf(original.senderId)}
            </span>
            <span className={`line-clamp-2 text-[13px] ${mine ? "opacity-85" : "text-muted"}`}>
              {messagePreview(original)}
            </span>
          </button>
        )}
        {m.imageUrl && (
          <button
            type="button"
            onClick={() => interactive && setViewing(m.imageUrl)}
            tabIndex={interactive ? 0 : -1}
            className="focus-visible:outline-brand block rounded-[14px] focus-visible:outline-2"
            aria-label="Open picture"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed or data URL, already resized */}
            <img
              src={m.imageUrl}
              alt=""
              loading="lazy"
              draggable={false}
              className="max-h-80 w-full min-w-40 rounded-[14px] object-cover"
            />
          </button>
        )}
        {m.file && <FileCard file={m.file} mine={mine} />}
        {m.body && (
          <span className={attachment ? "px-2.5 pt-1.5 pb-1" : ""}>
            <MessageText text={m.body} knownUsernames={knownUsernames} mine={mine} />
          </span>
        )}
      </span>
    );
    if (!interactive) return bubble;
    const progress = Math.min(1, dx / SWIPE_REPLY_PX);
    return (
      <span
        className={`relative grid max-w-[80%] ${mine ? "justify-self-end" : "justify-self-start"}`}
      >
        {/* Revealed behind the bubble while swiping; full size once letting go would reply. */}
        <span
          aria-hidden
          style={{
            opacity: progress,
            transform: `translateY(-50%) scale(${0.4 + 0.6 * progress})`,
          }}
          className={`absolute top-1/2 left-1 flex size-8 items-center justify-center rounded-full ${
            progress >= 1 ? "bg-brand text-brand-foreground" : "bg-surface text-muted"
          }`}
        >
          <Reply className="size-4" />
        </span>
        {bubble}
      </span>
    );
  }

  function reactionsFor(m: ChatItem) {
    if (m.reactions.length === 0) return null;
    const summary = summarizeReactions(m.reactions, userId);
    const mine = m.senderId === userId;
    return (
      <button
        type="button"
        onClick={() => setActiveId(m.id)}
        aria-label={`Reactions: ${summary.map((r) => `${r.emoji} ${r.count}`).join(", ")}`}
        className={`bg-surface ring-background relative z-[1] -mt-1.5 flex h-6 items-center gap-0.5 rounded-full px-1.5 text-sm shadow-sm ring-2 transition active:scale-95 ${
          mine ? "mr-2 justify-self-end" : "ml-2 justify-self-start"
        }`}
      >
        {summary.slice(0, 3).map((r) => (
          <span key={r.emoji} className="reaction-pop">
            {r.emoji}
          </span>
        ))}
        {m.reactions.length > 1 && (
          <span className="text-muted ml-0.5 text-xs tabular-nums">{m.reactions.length}</span>
        )}
      </button>
    );
  }

  function close() {
    setActiveId(null);
  }

  return (
    <>
      <ol className="grid gap-1.5 py-2" aria-label={label}>
        {items.map((m, i) => {
          const mine = m.senderId === userId;
          const prev = items[i - 1];
          const showTime =
            !prev ||
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 15 * 60_000;
          const showSender =
            Boolean(nameOf) && !mine && (showTime || prev?.senderId !== m.senderId);
          // Groups, like WhatsApp: others' messages sit next to a small profile picture, shown
          // at the last message of each run (so it moves down as they send more); that
          // bubble's corner points to it.
          const withAvatar = Boolean(senderOf) && !mine;
          const next = items[i + 1];
          const lastOfRun =
            !next ||
            next.senderId !== m.senderId ||
            new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > 15 * 60_000;
          const bubble = (
            <>
              {bubbleFor(m, { interactive: true, tail: withAvatar ? lastOfRun : true })}
              {reactionsFor(m)}
            </>
          );
          const senderName = showSender && nameOf && (
            <span className={`mt-1 mb-0.5 ml-3 text-[13px] font-semibold ${colorFor(m.senderId)}`}>
              {nameOf(m.senderId)}
            </span>
          );
          return (
            <li key={m.id} className="grid">
              {showTime && (
                <span className="text-muted my-2 text-center text-xs">
                  {formatMessageTime(m.createdAt, now)}
                </span>
              )}
              {withAvatar && senderOf ? (
                // Name above the first bubble, picture level with the last bubble's bottom corner.
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-end gap-x-2">
                  {senderName && <span className="col-start-2 grid">{senderName}</span>}
                  {lastOfRun ? (
                    <SenderAvatar user={senderOf(m.senderId)} name={nameOf?.(m.senderId)} />
                  ) : (
                    <span aria-hidden />
                  )}
                  <div className="grid">{bubble}</div>
                </div>
              ) : (
                <>
                  {senderName}
                  {bubble}
                </>
              )}
            </li>
          );
        })}
        {footer}
      </ol>

      {active && (
        <MessageActions
          preview={bubbleFor(active, { interactive: false, tail: true })}
          mine={active.senderId === userId}
          current={myReaction(active.reactions, userId)}
          canCopy={Boolean(active.body.trim())}
          onReact={(emoji) => {
            onReact(active, nextReaction(myReaction(active.reactions, userId), emoji));
            close();
          }}
          onReply={() => {
            onReply(active);
            close();
          }}
          onForward={() => {
            setForwarding(active);
            close();
          }}
          onCopy={() => {
            void navigator.clipboard
              ?.writeText(active.body)
              .then(() => toast("Copied"))
              .catch(() => toast("Could not copy"));
            close();
          }}
          onDelete={() => {
            onDelete(active);
            close();
          }}
          onClose={close}
        />
      )}

      {forwarding && (
        <ForwardSheet
          item={forwarding}
          onClose={() => setForwarding(null)}
          onDone={(n) => {
            setForwarding(null);
            toast(n > 1 ? `Forwarded to ${n} chats` : "Forwarded");
          }}
        />
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Picture"
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewing(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed or data URL, already resized */}
          <img src={viewing} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Close picture"
            autoFocus
            className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

/** The sender's round picture in a group chat; tapping it opens their profile. */
function SenderAvatar({ user, name }: { user: User | undefined; name?: string }) {
  const picture = (
    <Avatar
      firstName={user?.firstName ?? "?"}
      lastName={user?.lastName ?? ""}
      username={user?.username}
      url={user?.avatarUrl}
      size={32}
    />
  );
  // Someone who deleted their account has no profile to open.
  if (!user?.username) return <span className="shrink-0">{picture}</span>;
  return (
    <Link
      href={`/friends/profile?u=${user.username}`}
      aria-label={`${name ?? user.firstName}'s profile`}
      className="focus-visible:outline-brand shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90"
    >
      {picture}
    </Link>
  );
}
