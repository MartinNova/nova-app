import type { FriendRelation, Friendship } from "@/types/friends";

/** True if the request is between these two people (either direction). */
export function isBetween(f: Friendship, a: string, b: string): boolean {
  return (
    (f.requesterId === a && f.addresseeId === b) || (f.requesterId === b && f.addresseeId === a)
  );
}

/** The other person in a request, seen from `me`. */
export function otherPerson(f: Friendship, me: string): string {
  return f.requesterId === me ? f.addresseeId : f.requesterId;
}

/** How `me` relates to `other`: none, outgoing request, incoming request or friends. */
export function relationTo(friendships: Friendship[], me: string, other: string): FriendRelation {
  const friendship = friendships.find((f) => isBetween(f, me, other));
  if (!friendship) return { kind: "none" };
  if (friendship.status === "accepted") return { kind: "friends", friendship };
  return { kind: friendship.requesterId === me ? "outgoing" : "incoming", friendship };
}

/** Ids of everyone `me` is friends with (accepted only). */
export function friendIds(friendships: Friendship[], me: string): Set<string> {
  return new Set(
    friendships
      .filter((f) => f.status === "accepted" && (f.requesterId === me || f.addresseeId === me))
      .map((f) => otherPerson(f, me)),
  );
}

/** Requests waiting for `me` to answer, newest first. */
export function incomingRequests(friendships: Friendship[], me: string): Friendship[] {
  return friendships
    .filter((f) => f.status === "pending" && f.addresseeId === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Requests `me` sent that are still open, newest first. */
export function outgoingRequests(friendships: Friendship[], me: string): Friendship[] {
  return friendships
    .filter((f) => f.status === "pending" && f.requesterId === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Why `me` can't send `other` a request, or null if it's fine. */
export function validateFriendRequest(
  friendships: Friendship[],
  me: string,
  other: string,
): string | null {
  if (!other || me === other) return "You can't add yourself.";
  const relation = relationTo(friendships, me, other);
  if (relation.kind === "friends") return "You're already friends.";
  if (relation.kind === "outgoing") return "Your request is already pending.";
  return null;
}
