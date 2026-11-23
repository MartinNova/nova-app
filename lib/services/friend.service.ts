import { relationTo, validateFriendRequest } from "@/lib/friends/friends";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase, liveChannel } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import type { FriendService, Friendship } from "@/types/friends";
import { hasSession } from "./user.service";

const FRIENDSHIPS_KEY = "friendships";
const listeners = new Set<() => void>();

const loadLocal = () => readJSON<Friendship[]>(FRIENDSHIPS_KEY, []);
function saveLocal(friendships: Friendship[]) {
  writeJSON(FRIENDSHIPS_KEY, friendships);
  listeners.forEach((listener) => listener());
}
const involves = (f: Friendship, userId: string) =>
  f.requesterId === userId || f.addresseeId === userId;

/** Demo mode: requests live in this browser (switch demo accounts to answer them). */
const localFriendService: FriendService = {
  async listMine(userId) {
    return loadLocal().filter((f) => involves(f, userId));
  },
  async sendRequest(userId, otherUserId) {
    const all = loadLocal();
    const relation = relationTo(all, userId, otherUserId);
    if (relation.kind === "incoming") {
      await this.accept(relation.friendship.id, userId);
      return { ...relation.friendship, status: "accepted" };
    }
    const problem = validateFriendRequest(all, userId, otherUserId);
    if (problem) throw new Error(problem);
    const friendship: Friendship = {
      id: crypto.randomUUID(),
      requesterId: userId,
      addresseeId: otherUserId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    saveLocal([...all, friendship]);
    return friendship;
  },
  async accept(friendshipId, userId) {
    const all = loadLocal();
    const request = all.find((f) => f.id === friendshipId);
    if (!request || request.addresseeId !== userId || request.status !== "pending")
      throw new Error("Request not found.");
    saveLocal(all.map((f) => (f.id === friendshipId ? { ...f, status: "accepted" } : f)));
  },
  async remove(friendshipId, userId) {
    const all = loadLocal();
    if (!all.some((f) => f.id === friendshipId && involves(f, userId)))
      throw new Error("Request not found.");
    saveLocal(all.filter((f) => f.id !== friendshipId));
  },
  onChange(_userId, listener) {
    listeners.add(listener);
    // Other tabs of the demo (another account) change the same storage.
    const onStorage = (e: StorageEvent) => e.key?.endsWith(FRIENDSHIPS_KEY) && listener();
    if (typeof window !== "undefined" && "addEventListener" in window)
      window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined" && "removeEventListener" in window)
        window.removeEventListener("storage", onStorage);
    };
  },
};

/** One row of `friendships` (see supabase/migrations). */
interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: Friendship["status"];
  created_at: string;
}

const rowToFriendship = (row: FriendshipRow): Friendship => ({
  id: row.id,
  requesterId: row.requester_id,
  addresseeId: row.addressee_id,
  status: row.status,
  createdAt: row.created_at,
});

const COLUMNS = "id, requester_id, addressee_id, status, created_at";

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

/**
 * Accounts mode: the `friendships` table. RLS: you only see your own requests, send them as
 * yourself, only the recipient accepts, and either person can delete.
 */
const supabaseFriendService: FriendService = {
  async listMine(userId) {
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase()
      .from("friendships")
      .select(COLUMNS)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) fail(error);
    return (data as FriendshipRow[]).map(rowToFriendship);
  },
  async sendRequest(userId, otherUserId) {
    const mine = await this.listMine(userId);
    const relation = relationTo(mine, userId, otherUserId);
    if (relation.kind === "incoming") {
      await this.accept(relation.friendship.id, userId);
      return { ...relation.friendship, status: "accepted" };
    }
    const problem = validateFriendRequest(mine, userId, otherUserId);
    if (problem) throw new Error(problem);
    const { data, error } = await getSupabase()
      .from("friendships")
      .insert({ requester_id: userId, addressee_id: otherUserId })
      .select(COLUMNS)
      .single();
    // 23505 = unique violation: a request between the two was sent at the same moment.
    if (error?.code === "23505") throw new Error("There's already a request between you two.");
    if (error) fail(error);
    return rowToFriendship(data as FriendshipRow);
  },
  async accept(friendshipId, userId) {
    const { data, error } = await getSupabase()
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .select("id");
    if (error) fail(error);
    if (!data?.length) throw new Error("Request not found.");
  },
  async remove(friendshipId) {
    const { error } = await getSupabase().from("friendships").delete().eq("id", friendshipId);
    if (error) fail(error);
  },
  onChange(userId, listener) {
    const channel = liveChannel(`friendships:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, listener)
      .subscribe();
    return () => void getSupabase().removeChannel(channel);
  },
};

export const friendService: FriendService =
  AUTH_MODE === "accounts" ? supabaseFriendService : localFriendService;
