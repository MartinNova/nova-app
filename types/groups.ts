/**
 * Group chats (like WhatsApp groups): a name, an optional picture and members.
 * Implement `GroupService` in lib/services/group.service.ts.
 */
import type { Attachment, MessageFile, Reaction, SendOptions } from "./messages";

export const MAX_GROUP_NAME_LENGTH = 50;
export const MAX_GROUP_DESCRIPTION_LENGTH = 500;
/** Including the creator. */
export const MAX_GROUP_MEMBERS = 50;

export type GroupRole = "admin" | "member";

export interface GroupMember {
  userId: string;
  role: GroupRole;
  /** ISO timestamp. */
  joinedAt: string;
  /** When this member last opened the chat; messages after it are unread for them. */
  lastReadAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  /** Group picture (signed URL, or a data URL in demo mode); null = initials. */
  photoUrl: string | null;
  /** What the group is for, shown in group info (like WhatsApp); empty = none. */
  description: string;
  createdBy: string;
  /** ISO timestamp. */
  createdAt: string;
  members: GroupMember[];
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  /** Text; may be empty when the message is a picture or file. */
  body: string;
  imageUrl: string | null;
  file: MessageFile | null;
  /** ISO timestamp. */
  createdAt: string;
  /** The message this one answers; null = not a reply (or the original was deleted). */
  replyToId: string | null;
  /** Shown as "Forwarded" above the message. */
  forwarded: boolean;
  reactions: Reaction[];
}

/** One group in the inbox: the group, its latest message and your unread count. */
export interface GroupConversation {
  group: ChatGroup;
  last: GroupMessage | null;
  unread: number;
}

export interface GroupService {
  /** Groups you're a member of. */
  listMyGroups(userId: string): Promise<ChatGroup[]>;
  /** null if it doesn't exist or you're not a member. */
  getGroup(groupId: string, userId: string): Promise<ChatGroup | null>;
  /** The newest messages of each of your groups (for the inbox), newest first. */
  listLatestMessages(userId: string): Promise<GroupMessage[]>;
  /** One group's chat, oldest first. */
  listMessages(groupId: string): Promise<GroupMessage[]>;
  /** You become admin; `memberIds` are the others. `photo` is a square JPEG. */
  createGroup(userId: string, name: string, memberIds: string[], photo?: Blob): Promise<ChatGroup>;
  /** Admins only. Pass `photo: null` to remove the picture. */
  updateGroup(
    groupId: string,
    changes: { name?: string; photo?: Blob | null; description?: string },
  ): Promise<void>;
  /** Admins only. */
  addMembers(groupId: string, memberIds: string[]): Promise<void>;
  /** Admins remove others; anyone can remove themselves (leave). */
  removeMember(groupId: string, memberId: string): Promise<void>;
  /** Admins only. */
  setAdmin(groupId: string, memberId: string, admin: boolean): Promise<void>;
  send(
    groupId: string,
    userId: string,
    body: string,
    attachment?: Attachment,
    options?: SendOptions,
  ): Promise<GroupMessage>;
  /** Your reaction to a group message; null removes it. */
  react(messageId: string, userId: string, emoji: string | null): Promise<void>;
  /** Deletes your own message for everyone in the group. */
  remove(messageId: string, userId: string): Promise<void>;
  /** Marks the group as read for you (now). */
  markRead(groupId: string, userId: string): Promise<void>;
  /** Calls `listener` when groups or group messages change. Returns an unsubscribe function. */
  onChange(userId: string, listener: () => void): () => void;
}
