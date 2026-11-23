import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendService } from "@/types/friends";

/**
 * Friend requests through the real service (demo mode, so no network).
 * The database enforces the same rules again (supabase/migrations/…_friendships.sql).
 */

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

let friends: FriendService;
const A = "demo-1";
const B = "demo-2";

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubGlobal("window", { localStorage: memoryStorage() });
  ({ friendService: friends } = await import("./friend.service"));
});

describe("friend requests (demo mode)", () => {
  it("nobody is friends with anybody at the start", async () => {
    expect(await friends.listMine(A)).toEqual([]);
  });

  it("send → both see it pending → recipient accepts → friends", async () => {
    const sent = await friends.sendRequest(A, B);
    expect(sent.status).toBe("pending");
    expect(await friends.listMine(B)).toHaveLength(1);

    await friends.accept(sent.id, B);
    const [row] = await friends.listMine(A);
    expect(row.status).toBe("accepted");
  });

  it("only the recipient can accept", async () => {
    const sent = await friends.sendRequest(A, B);
    await expect(friends.accept(sent.id, A)).rejects.toThrow();
    await expect(friends.accept(sent.id, "demo-3")).rejects.toThrow();
    expect((await friends.listMine(A))[0].status).toBe("pending");
  });

  it("refuses a second request and requests to yourself", async () => {
    await friends.sendRequest(A, B);
    await expect(friends.sendRequest(A, B)).rejects.toThrow(/pending/);
    await expect(friends.sendRequest(A, A)).rejects.toThrow(/yourself/);
  });

  it("asking someone who already asked you accepts their request", async () => {
    await friends.sendRequest(B, A);
    const result = await friends.sendRequest(A, B);
    expect(result.status).toBe("accepted");
    expect(await friends.listMine(A)).toHaveLength(1);
  });

  it("decline, withdraw and unfriend delete the request; strangers can't", async () => {
    const sent = await friends.sendRequest(A, B);
    await expect(friends.remove(sent.id, "demo-3")).rejects.toThrow();
    await friends.remove(sent.id, A); // withdraw
    expect(await friends.listMine(B)).toEqual([]);

    const again = await friends.sendRequest(A, B);
    await friends.accept(again.id, B);
    await friends.remove(again.id, B); // unfriend
    expect(await friends.listMine(A)).toEqual([]);
  });

  it("tells listeners about changes", async () => {
    const listener = vi.fn();
    const stop = friends.onChange(A, listener);
    await friends.sendRequest(A, B);
    expect(listener).toHaveBeenCalled();
    stop();
  });
});
