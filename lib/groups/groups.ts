import {
  MAX_GROUP_DESCRIPTION_LENGTH,
  MAX_GROUP_MEMBERS,
  MAX_GROUP_NAME_LENGTH,
  type ChatGroup,
  type GroupConversation,
  type GroupMessage,
} from "@/types/groups";

/** Returns an error message, or null if the name is fine. */
export function validateGroupName(name: string): string | null {
  const text = name.trim();
  if (!text) return "Give the group a name.";
  if (text.length > MAX_GROUP_NAME_LENGTH)
    return `Group names can have at most ${MAX_GROUP_NAME_LENGTH} characters.`;
  return null;
}

/** Returns an error message, or null if the description can be saved (empty is fine). */
export function validateGroupDescription(description: string): string | null {
  return description.trim().length > MAX_GROUP_DESCRIPTION_LENGTH
    ? `The description can have at most ${MAX_GROUP_DESCRIPTION_LENGTH} characters.`
    : null;
}

/** Returns an error message, or null if a new group with these other members can be created. */
export function validateNewGroup(name: string, memberIds: string[]): string | null {
  const problem = validateGroupName(name);
  if (problem) return problem;
  if (memberIds.length === 0) return "Add at least one person.";
  if (memberIds.length + 1 > MAX_GROUP_MEMBERS)
    return `A group can have at most ${MAX_GROUP_MEMBERS} members.`;
  return null;
}

export function isMember(group: ChatGroup, userId: string): boolean {
  return group.members.some((m) => m.userId === userId);
}

export function isAdmin(group: ChatGroup, userId: string): boolean {
  return group.members.some((m) => m.userId === userId && m.role === "admin");
}

/**
 * Members after someone leaves or is removed. If no admin is left, the member who joined
 * first becomes admin, so a group is never stuck without one (same as WhatsApp).
 */
export function membersAfterRemoval(group: ChatGroup, memberId: string): ChatGroup["members"] {
  const rest = group.members.filter((m) => m.userId !== memberId);
  if (rest.length === 0 || rest.some((m) => m.role === "admin")) return rest;
  const first = [...rest].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0];
  return rest.map((m) => (m.userId === first.userId ? { ...m, role: "admin" as const } : m));
}

/** Messages from others after you last opened the group. */
export function groupUnread(group: ChatGroup, messages: GroupMessage[], userId: string): number {
  const me = group.members.find((m) => m.userId === userId);
  if (!me) return 0;
  return messages.filter(
    (m) => m.groupId === group.id && m.senderId !== userId && m.createdAt > me.lastReadAt,
  ).length;
}

/** Your groups with their latest message and unread count. */
export function groupConversations(
  groups: ChatGroup[],
  messages: GroupMessage[],
  userId: string,
): GroupConversation[] {
  return groups.map((group) => {
    const own = messages.filter((m) => m.groupId === group.id);
    const last = own.reduce<GroupMessage | null>(
      (latest, m) => (!latest || m.createdAt > latest.createdAt ? m : latest),
      null,
    );
    return { group, last, unread: groupUnread(group, own, userId) };
  });
}

/** "Lukas, Sofia, You" — first names of the members, you last. */
export function memberSummary(
  group: ChatGroup,
  userId: string,
  nameOf: (userId: string) => string,
): string {
  const others = group.members.filter((m) => m.userId !== userId).map((m) => nameOf(m.userId));
  return [...others, ...(isMember(group, userId) ? ["You"] : [])].join(", ");
}
