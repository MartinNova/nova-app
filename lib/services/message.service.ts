import { MAX_DEMO_FILE_BYTES, MAX_FILE_BYTES, validateFile } from "@/lib/messages/attachments";
import { parseListingRef, validateMessage } from "@/lib/messages/messages";
import { withReaction } from "@/lib/messages/reactions";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase, liveChannel } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import type { Message, MessageService } from "@/types/messages";
import {
  attachmentToLocal,
  FILE_BUCKET,
  fileFromRow,
  IMAGE_BUCKET,
  signedUrls,
  uploadAttachment,
} from "./chat-files";
import { deleteMessage, loadReactions, saveReaction } from "./chat-reactions";
import { hasSession } from "./user.service";

const MESSAGES_KEY = "messages";
const listeners = new Set<() => void>();

// Messages saved before pictures, files, replies and reactions existed lack those fields.
const loadLocal = () =>
  readJSON<Message[]>(MESSAGES_KEY, []).map((m) => ({
    ...m,
    imageUrl: m.imageUrl ?? null,
    file: m.file ?? null,
    replyToId: m.replyToId ?? null,
    forwarded: m.forwarded ?? false,
    listing: parseListingRef(m.listing),
    reactions: m.reactions ?? [],
  }));
function saveLocal(messages: Message[]) {
  writeJSON(MESSAGES_KEY, messages);
  listeners.forEach((listener) => listener());
}
const between = (m: Message, a: string, b: string) =>
  (m.senderId === a && m.recipientId === b) || (m.senderId === b && m.recipientId === a);

/** Demo mode: messages live in this browser (switch demo accounts to "reply"). */
const localMessageService: MessageService = {
  async listMine(userId) {
    return loadLocal()
      .filter((m) => m.senderId === userId || m.recipientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listThread(userId, otherUserId) {
    return loadLocal()
      .filter((m) => between(m, userId, otherUserId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async send(userId, otherUserId, body, attachment, options) {
    const problem =
      validateMessage(body, Boolean(attachment)) ??
      (attachment?.kind === "file" ? validateFile(attachment.file, MAX_DEMO_FILE_BYTES) : null);
    if (problem) throw new Error(problem);
    // No file storage in demo mode: pictures and files are kept as data URLs.
    const message: Message = {
      id: crypto.randomUUID(),
      senderId: userId,
      recipientId: otherUserId,
      body: body.trim(),
      ...(await attachmentToLocal(attachment)),
      createdAt: new Date().toISOString(),
      readAt: null,
      replyToId: options?.replyToId ?? null,
      forwarded: options?.forwarded ?? false,
      listing: options?.listing ?? null,
      reactions: [],
    };
    saveLocal([...loadLocal(), message]);
    // The browser's storage is small; if it was full, nothing was saved.
    if (attachment && !loadLocal().some((m) => m.id === message.id))
      throw new Error("Demo storage is full. Clear old chats or send a smaller file.");
    return message;
  },
  async markRead(userId, otherUserId) {
    const now = new Date().toISOString();
    const all = loadLocal();
    if (!all.some((m) => m.recipientId === userId && m.senderId === otherUserId && !m.readAt))
      return;
    saveLocal(
      all.map((m) =>
        m.recipientId === userId && m.senderId === otherUserId && !m.readAt
          ? { ...m, readAt: now }
          : m,
      ),
    );
  },
  async react(messageId, userId, emoji) {
    const all = loadLocal();
    const message = all.find((m) => m.id === messageId);
    if (!message || (message.senderId !== userId && message.recipientId !== userId))
      throw new Error("Message not found.");
    saveLocal(
      all.map((m) =>
        m.id === messageId ? { ...m, reactions: withReaction(m.reactions, userId, emoji) } : m,
      ),
    );
  },
  async remove(messageId, userId) {
    const all = loadLocal();
    if (!all.some((m) => m.id === messageId && m.senderId === userId))
      throw new Error("You can only delete your own messages.");
    // Replies to it stay, without the quote (like the database's "on delete set null").
    saveLocal(
      all
        .filter((m) => m.id !== messageId)
        .map((m) => (m.replyToId === messageId ? { ...m, replyToId: null } : m)),
    );
  },
  onChange(_userId, listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** One row of `messages` (see supabase/migrations). */
interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  forwarded?: boolean;
  listing?: unknown;
}

/** Turns rows into messages; picture and file paths become short-lived signed links. */
async function rowsToMessages(rows: MessageRow[]): Promise<Message[]> {
  const [images, files, reactions] = await Promise.all([
    signedUrls(
      IMAGE_BUCKET,
      rows.map((r) => r.image_path),
    ),
    signedUrls(
      FILE_BUCKET,
      rows.map((r) => r.file_path),
      true,
    ),
    loadReactions(
      "message_reactions",
      rows.map((r) => r.id),
    ),
  ]);
  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    imageUrl: row.image_path ? (images.get(row.image_path) ?? null) : null,
    file: fileFromRow(row, files),
    createdAt: row.created_at,
    readAt: row.read_at,
    replyToId: row.reply_to_id ?? null,
    forwarded: row.forwarded ?? false,
    listing: parseListingRef(row.listing),
    reactions: reactions.get(row.id) ?? [],
  }));
}

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

/** Accounts mode: the `messages` table. RLS only lets the two people in a chat read it. */
const supabaseMessageService: MessageService = {
  async listMine(userId) {
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase()
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) fail(error);
    return rowsToMessages(data as MessageRow[]);
  },
  async listThread(userId, otherUserId) {
    const { data, error } = await getSupabase()
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),` +
          `and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) fail(error);
    return rowsToMessages(data as MessageRow[]);
  },
  async send(userId, otherUserId, body, attachment, options) {
    const problem =
      validateMessage(body, Boolean(attachment)) ??
      (attachment?.kind === "file" ? validateFile(attachment.file, MAX_FILE_BYTES) : null);
    if (problem) throw new Error(problem);

    // Upload first, so the message never points to a missing file.
    const id = crypto.randomUUID();
    const { columns, undo } = await uploadAttachment(`${userId}/${otherUserId}/${id}`, attachment);

    const { data, error } = await getSupabase()
      .from("messages")
      .insert({
        id,
        sender_id: userId,
        recipient_id: otherUserId,
        body: body.trim(),
        // Attachment columns only when there is one, so text works even before the migrations.
        ...columns,
        ...(options?.replyToId && { reply_to_id: options.replyToId }),
        ...(options?.forwarded && { forwarded: true }),
        ...(options?.listing && { listing: options.listing }),
      })
      .select("*")
      .single();
    if (error) {
      await undo();
      fail(error);
    }
    const [message] = await rowsToMessages([data as MessageRow]);
    return message;
  },
  async markRead(userId, otherUserId) {
    const { error } = await getSupabase()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("sender_id", otherUserId)
      .is("read_at", null);
    if (error) fail(error);
  },
  react(messageId, userId, emoji) {
    return saveReaction("message_reactions", messageId, userId, emoji);
  },
  remove(messageId, userId) {
    return deleteMessage("messages", messageId, userId);
  },
  onChange(userId, listener) {
    const channel = liveChannel(`messages:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, listener)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        listener,
      )
      .subscribe();
    return () => void getSupabase().removeChannel(channel);
  },
};

export const messageService: MessageService =
  AUTH_MODE === "accounts" ? supabaseMessageService : localMessageService;
