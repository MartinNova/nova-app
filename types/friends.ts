/** "pending" = sent, waiting for an answer; "accepted" = you're friends. */
export type FriendshipStatus = "pending" | "accepted";

/** One friend request between two students. Declining, withdrawing or unfriending deletes it. */
export interface Friendship {
  id: string;
  /** Who sent the request. */
  requesterId: string;
  /** Who received it; only they can accept. */
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
}

/**
 * How you relate to another student:
 * "none" = nothing yet, "outgoing" = you sent a request, "incoming" = they sent you one,
 * "friends" = accepted.
 */
export type FriendRelation =
  { kind: "none" } | { kind: "outgoing" | "incoming" | "friends"; friendship: Friendship };

/**
 * Contract for friend requests. Demo mode: localStorage. Accounts mode: the `friendships`
 * table (see supabase/migrations). Components only talk to this interface.
 */
export interface FriendService {
  /** Every request and friendship you're part of. */
  listMine(userId: string): Promise<Friendship[]>;
  /** Sends a request. If the other person already asked you, this accepts theirs instead. */
  sendRequest(userId: string, otherUserId: string): Promise<Friendship>;
  /** Only the person who received the request can accept it. */
  accept(friendshipId: string, userId: string): Promise<void>;
  /** Decline, withdraw or unfriend: either person may delete it. */
  remove(friendshipId: string, userId: string): Promise<void>;
  /** Calls `listener` when one of your requests changes. Returns an unsubscribe function. */
  onChange(userId: string, listener: () => void): () => void;
}
