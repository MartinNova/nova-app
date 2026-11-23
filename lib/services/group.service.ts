import {
  isAdmin,
  isMember,
  membersAfterRemoval,
  validateGroupDescription,
  validateGroupName,
  validateNewGroup,
} from "@/lib/groups/groups";
import { MAX_DEMO_FILE_BYTES, MAX_FILE_BYTES, validateFile } from "@/lib/messages/attachments";
import { validateMessage } from "@/lib/messages/messages";
import { withReaction } from "@/lib/messages/reactions";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase, liveChannel } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import {
  MAX_GROUP_MEMBERS,
  type ChatGroup,
  type GroupMessage,
  type GroupService,
} from "@/types/groups";
import type { Attachment } from "@/types/messages";
import {
  attachmentToLocal,
  FILE_BUCKET,
  fileFromRow,
  IMAGE_BUCKET,
  signedUrls,
  toDataUrl,
  uploadAttachment,
} from "./chat-files";
import { deleteMessage, loadReactions, saveReaction } from "./chat-reactions";
import { hasSession } from "./user.service";

/** Private bucket: <group id>/<file>.jpg, readable only by the group's members. */
const PHOTO_BUCKET = "group-photos";

function checkMessage(body: string, attachment: Attachment | undefined, maxFileBytes: number) {
  const problem =
    validateMessage(body, Boolean(attachment)) ??
    (attachment?.kind === "file" ? validateFile(attachment.file, maxFileBytes) : null);
  if (problem) throw new Error(problem);
}

/* ------------------------------------------------------------------------------------------ */
/* Demo mode: groups live in this browser (switch demo accounts to see the other side).        */
/* ------------------------------------------------------------------------------------------ */

const GROUPS_KEY = "groups";
const GROUP_MESSAGES_KEY = "group-messages";
const listeners = new Set<() => void>();

// Groups saved before descriptions existed have none.
const loadGroups = () =>
  readJSON<ChatGroup[]>(GROUPS_KEY, []).map((g) => ({ ...g, description: g.description ?? "" }));
// Messages saved before replies and reactions existed lack those fields.
const loadMessages = () =>
  readJSON<GroupMessage[]>(GROUP_MESSAGES_KEY, []).map((m) => ({
    ...m,
    replyToId: m.replyToId ?? null,
    forwarded: m.forwarded ?? false,
    reactions: m.reactions ?? [],
  }));
function saveMessages(messages: GroupMessage[]) {
  writeJSON(GROUP_MESSAGES_KEY, messages);
  notify();
}
const notify = () => listeners.forEach((listener) => listener());

function saveGroups(groups: ChatGroup[]) {
  writeJSON(GROUPS_KEY, groups);
  notify();
}

/** Applies `change` to one group, after checking it exists. */
function changeGroup(groupId: string, change: (group: ChatGroup) => ChatGroup | null) {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error("This group doesn't exist anymore.");
  const next = change(group);
  saveGroups(
    next
      ? groups.map((g) => (g.id === groupId ? next : g))
      : groups.filter((g) => g.id !== groupId),
  );
}

const localGroupService: GroupService = {
  async listMyGroups(userId) {
    return loadGroups().filter((g) => isMember(g, userId));
  },
  async getGroup(groupId, userId) {
    const group = loadGroups().find((g) => g.id === groupId);
    return group && isMember(group, userId) ? group : null;
  },
  async listLatestMessages(userId) {
    const mine = new Set((await this.listMyGroups(userId)).map((g) => g.id));
    return loadMessages()
      .filter((m) => mine.has(m.groupId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listMessages(groupId) {
    return loadMessages()
      .filter((m) => m.groupId === groupId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async createGroup(userId, name, memberIds, photo) {
    const others = [...new Set(memberIds)].filter((id) => id !== userId);
    const problem = validateNewGroup(name, others);
    if (problem) throw new Error(problem);
    const now = new Date().toISOString();
    const group: ChatGroup = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photoUrl: photo ? await toDataUrl(photo) : null,
      description: "",
      createdBy: userId,
      createdAt: now,
      members: [userId, ...others].map((id) => ({
        userId: id,
        role: id === userId ? "admin" : "member",
        joinedAt: now,
        lastReadAt: id === userId ? now : new Date(0).toISOString(),
      })),
    };
    saveGroups([...loadGroups(), group]);
    return group;
  },
  async updateGroup(groupId, { name, photo, description }) {
    if (name !== undefined) {
      const problem = validateGroupName(name);
      if (problem) throw new Error(problem);
    }
    if (description !== undefined) {
      const problem = validateGroupDescription(description);
      if (problem) throw new Error(problem);
    }
    const photoUrl = photo ? await toDataUrl(photo) : photo;
    changeGroup(groupId, (g) => ({
      ...g,
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(photoUrl !== undefined ? { photoUrl } : {}),
    }));
  },
  async addMembers(groupId, memberIds) {
    changeGroup(groupId, (g) => {
      const now = new Date().toISOString();
      const added = [...new Set(memberIds)]
        .filter((id) => !isMember(g, id))
        .map((id) => ({
          userId: id,
          role: "member" as const,
          joinedAt: now,
          lastReadAt: new Date(0).toISOString(),
        }));
      if (g.members.length + added.length > MAX_GROUP_MEMBERS)
        throw new Error(`A group can have at most ${MAX_GROUP_MEMBERS} members.`);
      return { ...g, members: [...g.members, ...added] };
    });
  },
  async removeMember(groupId, memberId) {
    changeGroup(groupId, (g) => {
      const members = membersAfterRemoval(g, memberId);
      return members.length > 0 ? { ...g, members } : null;
    });
  },
  async setAdmin(groupId, memberId, admin) {
    changeGroup(groupId, (g) => {
      if (
        !admin &&
        isAdmin(g, memberId) &&
        g.members.filter((m) => m.role === "admin").length === 1
      )
        throw new Error("A group needs at least one admin.");
      return {
        ...g,
        members: g.members.map((m) =>
          m.userId === memberId ? { ...m, role: admin ? "admin" : "member" } : m,
        ),
      };
    });
  },
  async send(groupId, userId, body, attachment, options) {
    checkMessage(body, attachment, MAX_DEMO_FILE_BYTES);
    const group = await this.getGroup(groupId, userId);
    if (!group) throw new Error("You're not in this group anymore.");
    const message: GroupMessage = {
      id: crypto.randomUUID(),
      groupId,
      senderId: userId,
      body: body.trim(),
      ...(await attachmentToLocal(attachment)),
      createdAt: new Date().toISOString(),
      replyToId: options?.replyToId ?? null,
      forwarded: options?.forwarded ?? false,
      reactions: [],
    };
    writeJSON(GROUP_MESSAGES_KEY, [...loadMessages(), message]);
    // The browser's storage is small; if it was full, nothing was saved.
    if (attachment && !loadMessages().some((m) => m.id === message.id))
      throw new Error("Demo storage is full. Clear old chats or send a smaller file.");
    // Sending also counts as reading, so your own message never shows as unread.
    await this.markRead(groupId, userId);
    notify();
    return message;
  },
  async markRead(groupId, userId) {
    const now = new Date().toISOString();
    const groups = loadGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !isMember(group, userId)) return;
    saveGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.map((m) => (m.userId === userId ? { ...m, lastReadAt: now } : m)),
            }
          : g,
      ),
    );
  },
  async react(messageId, userId, emoji) {
    const all = loadMessages();
    const message = all.find((m) => m.id === messageId);
    const group = message && (await this.getGroup(message.groupId, userId));
    if (!message || !group) throw new Error("Message not found.");
    saveMessages(
      all.map((m) =>
        m.id === messageId ? { ...m, reactions: withReaction(m.reactions, userId, emoji) } : m,
      ),
    );
  },
  async remove(messageId, userId) {
    const all = loadMessages();
    if (!all.some((m) => m.id === messageId && m.senderId === userId))
      throw new Error("You can only delete your own messages.");
    saveMessages(
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

/* ------------------------------------------------------------------------------------------ */
/* Accounts mode: tables chat_groups, chat_group_members, group_messages (see migrations).     */
/* RLS only lets members see a group; admin-only changes go through checked functions.        */
/* ------------------------------------------------------------------------------------------ */

interface MemberRow {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string;
}

interface GroupRow {
  id: string;
  name: string;
  photo_path: string | null;
  /** Missing before the description migration ran. */
  description?: string | null;
  created_by: string;
  created_at: string;
  chat_group_members: MemberRow[];
}

interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  reply_to_id?: string | null;
  forwarded?: boolean;
}

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

async function rowsToGroups(rows: GroupRow[]): Promise<ChatGroup[]> {
  const photos = await signedUrls(
    PHOTO_BUCKET,
    rows.map((r) => r.photo_path),
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    photoUrl: row.photo_path ? (photos.get(row.photo_path) ?? null) : null,
    description: row.description ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    members: row.chat_group_members.map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      lastReadAt: m.last_read_at,
    })),
  }));
}

async function rowsToMessages(rows: GroupMessageRow[]): Promise<GroupMessage[]> {
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
      "group_message_reactions",
      rows.map((r) => r.id),
    ),
  ]);
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    senderId: row.sender_id,
    body: row.body,
    imageUrl: row.image_path ? (images.get(row.image_path) ?? null) : null,
    file: fileFromRow(row, files),
    createdAt: row.created_at,
    replyToId: row.reply_to_id ?? null,
    forwarded: row.forwarded ?? false,
    reactions: reactions.get(row.id) ?? [],
  }));
}

const GROUP_SELECT = "*, chat_group_members(user_id, role, joined_at, last_read_at)";

/** Uploads a new group picture and returns its path (a new name each time, so caches update). */
async function uploadPhoto(groupId: string, photo: Blob): Promise<string> {
  const path = `${groupId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: "image/jpeg" });
  if (error) throw new Error("Could not upload the group picture. Please try a smaller one.");
  return path;
}

const supabaseGroupService: GroupService = {
  async listMyGroups() {
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase()
      .from("chat_groups")
      .select(GROUP_SELECT)
      .order("created_at", { ascending: false });
    if (error) fail(error);
    return rowsToGroups(data as GroupRow[]);
  },
  async getGroup(groupId) {
    const { data, error } = await getSupabase()
      .from("chat_groups")
      .select(GROUP_SELECT)
      .eq("id", groupId)
      .maybeSingle();
    if (error) fail(error);
    return data ? (await rowsToGroups([data as GroupRow]))[0] : null;
  },
  async listLatestMessages() {
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase()
      .from("group_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) fail(error);
    return rowsToMessages(data as GroupMessageRow[]);
  },
  async listMessages(groupId) {
    const { data, error } = await getSupabase()
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) fail(error);
    return rowsToMessages(data as GroupMessageRow[]);
  },
  async createGroup(userId, name, memberIds, photo) {
    const others = [...new Set(memberIds)].filter((id) => id !== userId);
    const problem = validateNewGroup(name, others);
    if (problem) throw new Error(problem);
    const { data: id, error } = await getSupabase().rpc("create_chat_group", {
      group_name: name.trim(),
      member_ids: others,
    });
    if (error) fail(error);
    if (photo) {
      const path = await uploadPhoto(id as string, photo);
      const { error: photoError } = await getSupabase()
        .from("chat_groups")
        .update({ photo_path: path })
        .eq("id", id);
      if (photoError) fail(photoError);
    }
    const group = await this.getGroup(id as string, userId);
    if (!group) throw new Error("Could not load the new group.");
    return group;
  },
  async updateGroup(groupId, { name, photo, description }) {
    const changes: { name?: string; photo_path?: string | null; description?: string } = {};
    if (name !== undefined) {
      const problem = validateGroupName(name);
      if (problem) throw new Error(problem);
      changes.name = name.trim();
    }
    if (description !== undefined) {
      const problem = validateGroupDescription(description);
      if (problem) throw new Error(problem);
      changes.description = description.trim();
    }
    let oldPath: string | null = null;
    if (photo !== undefined) {
      const { data } = await getSupabase()
        .from("chat_groups")
        .select("photo_path")
        .eq("id", groupId)
        .single();
      oldPath = (data as { photo_path: string | null } | null)?.photo_path ?? null;
      changes.photo_path = photo ? await uploadPhoto(groupId, photo) : null;
    }
    const { error } = await getSupabase().from("chat_groups").update(changes).eq("id", groupId);
    if (error) fail(error);
    if (oldPath) await getSupabase().storage.from(PHOTO_BUCKET).remove([oldPath]);
  },
  async addMembers(groupId, memberIds) {
    const { error } = await getSupabase().rpc("add_chat_group_members", {
      target_group: groupId,
      member_ids: [...new Set(memberIds)],
    });
    if (error) fail(error);
  },
  async removeMember(groupId, memberId) {
    const { error } = await getSupabase()
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", memberId);
    if (error) fail(error);
  },
  async setAdmin(groupId, memberId, admin) {
    const { error } = await getSupabase().rpc("set_chat_group_admin", {
      target_group: groupId,
      target_user: memberId,
      make_admin: admin,
    });
    if (error) fail(error);
  },
  async send(groupId, userId, body, attachment, options) {
    checkMessage(body, attachment, MAX_FILE_BYTES);
    // Upload first, so the message never points to a missing file.
    const id = crypto.randomUUID();
    const { columns, undo } = await uploadAttachment(
      `groups/${groupId}/${userId}/${id}`,
      attachment,
    );
    const { data, error } = await getSupabase()
      .from("group_messages")
      .insert({
        id,
        group_id: groupId,
        sender_id: userId,
        body: body.trim(),
        ...columns,
        ...(options?.replyToId && { reply_to_id: options.replyToId }),
        ...(options?.forwarded && { forwarded: true }),
      })
      .select("*")
      .single();
    if (error) {
      await undo();
      fail(error);
    }
    await this.markRead(groupId, userId);
    return (await rowsToMessages([data as GroupMessageRow]))[0];
  },
  async markRead(groupId, userId) {
    const { error } = await getSupabase()
      .from("chat_group_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) fail(error);
  },
  react(messageId, userId, emoji) {
    return saveReaction("group_message_reactions", messageId, userId, emoji);
  },
  remove(messageId, userId) {
    return deleteMessage("group_messages", messageId, userId);
  },
  onChange(userId, listener) {
    const channel = liveChannel(`groups:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, listener)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_message_reactions" },
        listener,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_groups" }, listener)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_group_members" },
        listener,
      )
      .subscribe();
    return () => void getSupabase().removeChannel(channel);
  },
};

export const groupService: GroupService =
  AUTH_MODE === "accounts" ? supabaseGroupService : localGroupService;
