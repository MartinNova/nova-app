import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageService } from "@/types/messages";
import type { NewPadelMatch, PadelService } from "@/types/padel";
import type { NewRoomListing, RoomService } from "@/types/rooms";

/**
 * Rejected actions through the real services (demo mode, so no network):
 * someone tries something they're not allowed to, and nothing changes.
 * The same rules are enforced again by the database (see supabase/migrations).
 */

// A small in-memory localStorage, so the demo services can save data in tests.
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

let rooms: RoomService;
let padel: PadelService;
let messages: MessageService;

beforeEach(async () => {
  vi.resetModules();
  // Demo mode: no Supabase settings.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubGlobal("window", { localStorage: memoryStorage() });
  ({ roomService: rooms } = await import("./rooms.service"));
  ({ padelService: padel } = await import("./padel.service"));
  ({ messageService: messages } = await import("./message.service"));
});

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const listing: NewRoomListing = {
  kind: "offer",
  title: "Room near campus",
  roomType: "room",
  areas: ["Carcavelos"],
  rent: 550,
  billsIncluded: true,
  availableFrom: inDays(10),
  availableUntil: "",
  description: "",
};

const court: NewPadelMatch = {
  date: inDays(1),
  time: "18:00",
  durationMinutes: 90,
  location: "Padel CIF",
  level: 2.5,
  maxPlayers: 4,
  guestCount: 2,
  description: "",
};

describe("rooms: rejected actions", () => {
  it("someone else can't delete your listing", async () => {
    const mine = await rooms.createListing(listing, [], "alice");
    await expect(rooms.deleteListing(mine.id, "bob")).rejects.toThrow(/Only the person/);
    expect(await rooms.getListing(mine.id)).not.toBeNull();
  });

  it("you can delete your own listing", async () => {
    const mine = await rooms.createListing(listing, [], "alice");
    await rooms.deleteListing(mine.id, "alice");
    expect(await rooms.getListing(mine.id)).toBeNull();
  });

  it("invalid listings are not saved", async () => {
    const before = (await rooms.listListings()).length;
    await expect(rooms.createListing({ ...listing, rent: 0 }, [], "alice")).rejects.toThrow(/Rent/);
    await expect(rooms.createListing({ ...listing, title: "Hi" }, [], "alice")).rejects.toThrow(
      /title/,
    );
    expect(await rooms.listListings()).toHaveLength(before);
  });
});

describe("padel: rejected actions", () => {
  it("only the organiser can cancel a match", async () => {
    const match = await padel.createMatch(court, "alice");
    await expect(padel.cancelMatch(match.id, "bob")).rejects.toThrow(/Only the player/);
    expect((await padel.listMatches()).some((m) => m.id === match.id)).toBe(true);
  });

  it("matches in the past are rejected", async () => {
    await expect(padel.createMatch({ ...court, date: inDays(-1) }, "alice")).rejects.toThrow(
      /future/,
    );
  });

  it("nobody can join a full court, and only the organiser answers requests", async () => {
    const match = await padel.createMatch(court, "alice"); // alice + 2 friends: 1 spot left
    const asked = await padel.requestToJoin(match.id, "bob", "");
    const request = asked.requests![0];

    await expect(padel.respondToRequest(match.id, request.id, true, "bob")).rejects.toThrow(
      /organiser/,
    );
    await padel.respondToRequest(match.id, request.id, true, "alice");
    await expect(padel.requestToJoin(match.id, "carol", "")).rejects.toThrow(/full/);
  });

  it("a declined player can't ask again", async () => {
    const match = await padel.createMatch(court, "alice");
    const asked = await padel.requestToJoin(match.id, "bob", "");
    await padel.respondToRequest(match.id, asked.requests![0].id, false, "alice");
    await expect(padel.requestToJoin(match.id, "bob", "")).rejects.toThrow(/said no/);
  });
});

describe("messages: rejected actions", () => {
  it("empty and too long messages are not sent", async () => {
    await expect(messages.send("alice", "bob", "   ")).rejects.toThrow(/Write/);
    await expect(messages.send("alice", "bob", "x".repeat(1001))).rejects.toThrow(/1000/);
    expect(await messages.listMine("alice")).toEqual([]);
  });

  it("others can't read your chat", async () => {
    await messages.send("alice", "bob", "Secret plan for padel");
    expect(await messages.listMine("carol")).toEqual([]);
    expect(await messages.listThread("carol", "bob")).toEqual([]);
    expect(await messages.listThread("bob", "alice")).toHaveLength(1);
  });

  it("reading only marks messages sent to you", async () => {
    await messages.send("alice", "bob", "Hi Bob");
    await messages.markRead("alice", "bob"); // alice sent it, so nothing changes
    expect((await messages.listMine("bob"))[0].readAt).toBeNull();
    await messages.markRead("bob", "alice");
    expect((await messages.listMine("bob"))[0].readAt).not.toBeNull();
  });

  it("only the sender can delete a message; replies to it lose the quote", async () => {
    const hi = await messages.send("alice", "bob", "Hi Bob");
    await messages.send("bob", "alice", "Hi!", undefined, { replyToId: hi.id });
    await expect(messages.remove(hi.id, "bob")).rejects.toThrow(/your own/);
    expect(await messages.listThread("alice", "bob")).toHaveLength(2);
    await messages.remove(hi.id, "alice");
    const [reply] = await messages.listThread("alice", "bob");
    expect(reply.body).toBe("Hi!");
    expect(reply.replyToId).toBeNull();
  });

  it("one reaction per person; outsiders can't react", async () => {
    const hi = await messages.send("alice", "bob", "Hi Bob");
    await messages.react(hi.id, "bob", "👍");
    await messages.react(hi.id, "bob", "😂");
    await expect(messages.react(hi.id, "carol", "❤️")).rejects.toThrow();
    expect((await messages.listMine("bob"))[0].reactions).toEqual([{ userId: "bob", emoji: "😂" }]);
    await messages.react(hi.id, "bob", null);
    expect((await messages.listMine("bob"))[0].reactions).toEqual([]);
  });
});
