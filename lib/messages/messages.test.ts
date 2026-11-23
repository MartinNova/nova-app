import { describe, expect, it } from "vitest";
import type { Message } from "@/types/messages";
import {
  badgeLabel,
  formatMessageTime,
  groupConversations,
  listingHref,
  messagePreview,
  parseListingRef,
  unreadCount,
  validateMessage,
} from "./messages";

const msg = (
  id: string,
  senderId: string,
  recipientId: string,
  createdAt: string,
  readAt: string | null = null,
): Message => ({
  id,
  senderId,
  recipientId,
  body: `Message ${id}`,
  imageUrl: null,
  file: null,
  createdAt,
  readAt,
  replyToId: null,
  forwarded: false,
  listing: null,
  reactions: [],
});

describe("validateMessage", () => {
  it("rejects empty and too long messages", () => {
    expect(validateMessage("  ")).toMatch(/Write/);
    expect(validateMessage("x".repeat(1001))).toMatch(/1000/);
    expect(validateMessage(" Hi! ")).toBeNull();
  });

  it("allows a picture without text", () => {
    expect(validateMessage("", true)).toBeNull();
    expect(validateMessage("x".repeat(1001), true)).toMatch(/1000/);
  });
});

describe("groupConversations", () => {
  const messages = [
    msg("1", "me", "anna", "2026-11-18T09:00:00Z"),
    msg("2", "anna", "me", "2026-11-18T09:05:00Z"),
    msg("3", "anna", "me", "2026-11-18T09:06:00Z"),
    msg("4", "ben", "me", "2026-11-18T08:00:00Z", "2026-11-18T08:30:00Z"),
    msg("5", "me", "carl", "2026-11-18T10:00:00Z"),
  ];

  it("makes one chat per person, newest first, with unread counts", () => {
    const chats = groupConversations(messages, "me");
    expect(chats.map((c) => [c.otherUserId, c.last.id, c.unread])).toEqual([
      ["carl", "5", 0],
      ["anna", "3", 2],
      ["ben", "4", 0],
    ]);
  });

  it("counts only unread messages sent to you", () => {
    expect(unreadCount(messages, "me")).toBe(2);
    expect(unreadCount(messages, "anna")).toBe(1);
  });
});

describe("formatMessageTime", () => {
  const now = new Date(2026, 10, 18, 15, 0);

  it("shows the time today and the day before that", () => {
    expect(formatMessageTime(new Date(2026, 10, 18, 9, 5).toISOString(), now)).toBe("09:05");
    expect(formatMessageTime(new Date(2026, 10, 17, 22, 0).toISOString(), now)).toBe("Yesterday");
    expect(formatMessageTime(new Date(2026, 10, 14, 12, 0).toISOString(), now)).toBe("Sat");
    expect(formatMessageTime(new Date(2026, 10, 2, 12, 0).toISOString(), now)).toBe("2 Nov");
  });
});

describe("messagePreview", () => {
  it("shows the text, or Photo for a picture without text", () => {
    const file = { url: "data:x", name: "Notes.pdf", size: 10, type: "application/pdf" };
    expect(messagePreview({ body: "Hi", imageUrl: "data:x", file: null })).toBe("Hi");
    expect(messagePreview({ body: " ", imageUrl: "data:x", file: null })).toBe("📷 Photo");
    expect(messagePreview({ body: "", imageUrl: null, file })).toBe("📎 Notes.pdf");
    expect(messagePreview({ body: "", imageUrl: null, file: null })).toBe("");
  });
});

describe("badgeLabel", () => {
  it("caps at 99+", () => {
    expect(badgeLabel(3)).toBe("3");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(120)).toBe("99+");
  });
});

describe("listing in a message", () => {
  const ref = {
    id: "8a6c1e2e-1111-4222-8333-944455556666",
    title: "Bright room 10 min from campus",
    subtitle: "620 €/month · Carcavelos",
    photo: "https://example.supabase.co/storage/v1/object/public/room-photos/a.jpg",
  };

  it("keeps a well-formed listing and links to it", () => {
    expect(parseListingRef(ref)).toEqual(ref);
    expect(listingHref(ref)).toBe(`/campus/rooms/listing?id=${ref.id}`);
  });

  it("drops anything malformed", () => {
    expect(parseListingRef(null)).toBeNull();
    expect(parseListingRef("x")).toBeNull();
    expect(parseListingRef({ ...ref, id: "../../evil" })).toBeNull();
    expect(parseListingRef({ ...ref, title: "" })).toBeNull();
  });

  it("only keeps safe picture links", () => {
    expect(parseListingRef({ ...ref, photo: "javascript:alert(1)" })?.photo).toBeNull();
    expect(parseListingRef({ ...ref, photo: undefined })?.photo).toBeNull();
  });
});
