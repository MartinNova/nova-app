/**
 * Direct messages between two students.
 * Implement `MessageService` in lib/services/message.service.ts.
 */

export const MAX_MESSAGE_LENGTH = 1000;

/** A file sent in a chat (not a picture). */
export interface MessageFile {
  /** Download link (signed URL, or a data URL in demo mode). */
  url: string;
  name: string;
  /** Bytes. */
  size: number;
  /** MIME type, e.g. "application/pdf". */
  type: string;
}

/** An emoji reaction; one per person and message. */
export interface Reaction {
  userId: string;
  emoji: string;
}

/**
 * A room listing a message is about (sent from "Message" on the listing). A snapshot, so the
 * chat still shows what it was about after the listing changes or is taken down.
 */
export interface ListingRef {
  id: string;
  title: string;
  /** e.g. "620 €/month · Carcavelos" */
  subtitle: string;
  /** First photo, if any. */
  photo: string | null;
}

/** Extras when sending: a reply to an earlier message of the same chat, or a forwarded copy. */
export interface SendOptions {
  replyToId?: string | null;
  forwarded?: boolean;
  /** The room listing this message is about. */
  listing?: ListingRef | null;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  /** Text; may be empty when the message is a picture. */
  body: string;
  /** Picture to show (signed URL, or a data URL in demo mode); null = text only. */
  imageUrl: string | null;
  /** Attached file; null = none. */
  file: MessageFile | null;
  /** ISO timestamp. */
  createdAt: string;
  /** When the recipient opened the chat; null = unread. */
  readAt: string | null;
  /** The message this one answers; null = not a reply (or the original was deleted). */
  replyToId: string | null;
  /** Shown as "Forwarded" above the message. */
  forwarded: boolean;
  /** Shown as a card above the text, linking to the listing; null = not about a listing. */
  listing: ListingRef | null;
  reactions: Reaction[];
}

/** One chat in the inbox: the other person and the latest message. */
export interface Conversation {
  otherUserId: string;
  last: Message;
  /** Messages from the other person you haven't read yet. */
  unread: number;
}

export type Attachment = { kind: "image"; blob: Blob } | { kind: "file"; file: File };

export interface MessageService {
  /** Your latest messages (sent and received), newest first. */
  listMine(userId: string): Promise<Message[]>;
  /** The chat between you and one other person, oldest first. */
  listThread(userId: string, otherUserId: string): Promise<Message[]>;
  /** Sends text and/or one attachment: a picture (already resized JPEG) or a file. */
  send(
    userId: string,
    otherUserId: string,
    body: string,
    attachment?: Attachment,
    options?: SendOptions,
  ): Promise<Message>;
  /** Your reaction to a message; null removes it. */
  react(messageId: string, userId: string, emoji: string | null): Promise<void>;
  /** Deletes your own message for both of you. */
  remove(messageId: string, userId: string): Promise<void>;
  /** Marks everything the other person sent you as read. */
  markRead(userId: string, otherUserId: string): Promise<void>;
  /** Calls `listener` when a message to or from you arrives. Returns an unsubscribe function. */
  onChange(userId: string, listener: () => void): () => void;
}
