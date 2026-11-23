"use client";

import { Check, Clock, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/timetable/Sheet";
import { useToast } from "@/components/ui/Toast";
import { relationTo } from "@/lib/friends/friends";
import { friendService } from "@/lib/services/friend.service";
import type { Friendship } from "@/types/friends";

const SHEET_ACTION =
  "bg-background hover:bg-border/60 flex h-12 w-full items-center justify-center rounded-xl text-[17px] font-medium";

interface FriendButtonProps {
  me: string;
  person: { userId: string; firstName: string; username: string };
  friendships: Friendship[];
  /** "compact" = small pill in a list row, "full" = wide button on a profile. */
  size?: "compact" | "full";
}

/**
 * Add friend → Pending (tap to withdraw) → Friends (tap to unfriend, profile only).
 * If they asked you first, it says "Accept".
 */
export function FriendButton({ me, person, friendships, size = "compact" }: FriendButtonProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"withdraw" | "unfriend" | null>(null);
  const relation = relationTo(friendships, me, person.userId);
  const name = person.firstName || `@${person.username}`;

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toast(message);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const base =
    size === "full"
      ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold"
      : "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold";
  const icon = size === "full" ? "size-5" : "size-4";
  const primary = `${base} bg-brand text-brand-foreground hover:opacity-90 disabled:opacity-60`;
  const neutral = `${base} border-border bg-surface text-foreground border hover:bg-border/40 disabled:opacity-60`;

  let button: React.ReactNode;
  if (relation.kind === "none") {
    button = (
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void run(() => friendService.sendRequest(me, person.userId), `Request sent to ${name}`)
        }
        className={primary}
      >
        <UserPlus className={icon} aria-hidden /> Add friend
      </button>
    );
  } else if (relation.kind === "incoming") {
    button = (
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void run(
            () => friendService.accept(relation.friendship.id, me),
            `You and ${name} are now friends`,
          )
        }
        className={primary}
      >
        <Check className={icon} aria-hidden /> Accept
      </button>
    );
  } else if (relation.kind === "outgoing") {
    button = (
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirm("withdraw")}
        aria-label={`Request to ${name} pending. Withdraw?`}
        className={`${neutral} text-muted`}
      >
        <Clock className={icon} aria-hidden /> Pending
      </button>
    );
  } else if (size === "full") {
    button = (
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirm("unfriend")}
        className={neutral}
      >
        <UserCheck className={icon} aria-hidden /> Friends
      </button>
    );
  } else {
    button = (
      <span className="text-muted inline-flex h-8 shrink-0 items-center gap-1 text-sm font-medium">
        <UserCheck className={icon} aria-hidden /> Friends
      </span>
    );
  }

  return (
    <>
      {button}
      {confirm && relation.kind !== "none" && (
        <Sheet
          title={confirm === "withdraw" ? `Withdraw request to ${name}?` : `Remove ${name}?`}
          subtitle={
            confirm === "withdraw"
              ? "They won't see it anymore. You can send a new one later."
              : "You won't be friends anymore. Your chats stay."
          }
          onClose={() => setConfirm(null)}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => friendService.remove(relation.friendship.id, me),
                  confirm === "withdraw" ? "Request withdrawn" : `Removed ${name} from friends`,
                )
              }
              className={`${SHEET_ACTION} text-red-700 dark:text-red-400`}
            >
              {confirm === "withdraw" ? "Withdraw request" : "Remove friend"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className={SHEET_ACTION}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
