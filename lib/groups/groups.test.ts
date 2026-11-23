import { describe, expect, it } from "vitest";
import type { ChatGroup, GroupMessage } from "@/types/groups";
import {
  groupConversations,
  groupUnread,
  isAdmin,
  membersAfterRemoval,
  memberSummary,
  validateGroupDescription,
  validateGroupName,
  validateNewGroup,
} from "./groups";

const group: ChatGroup = {
  id: "g1",
  name: "Finance study group",
  photoUrl: null,
  description: "",
  createdBy: "a",
  createdAt: "2026-11-19T08:00:00Z",
  members: [
    {
      userId: "a",
      role: "admin",
      joinedAt: "2026-11-19T08:00:00Z",
      lastReadAt: "2026-11-19T09:00:00Z",
    },
    {
      userId: "b",
      role: "member",
      joinedAt: "2026-11-19T08:01:00Z",
      lastReadAt: "2026-11-19T08:00:00Z",
    },
    {
      userId: "c",
      role: "member",
      joinedAt: "2026-11-19T08:02:00Z",
      lastReadAt: "2026-11-19T08:00:00Z",
    },
  ],
};

const msg = (id: string, senderId: string, createdAt: string, groupId = "g1"): GroupMessage => ({
  id,
  groupId,
  senderId,
  body: id,
  imageUrl: null,
  file: null,
  createdAt,
  replyToId: null,
  forwarded: false,
  reactions: [],
});

describe("validateGroupName / validateNewGroup", () => {
  it("needs a name of reasonable length", () => {
    expect(validateGroupName("  ")).toMatch(/name/);
    expect(validateGroupName("x".repeat(51))).toMatch(/50/);
    expect(validateGroupName(" Padel crew ")).toBeNull();
  });

  it("needs at least one other member", () => {
    expect(validateNewGroup("Padel", [])).toMatch(/at least one/);
    expect(validateNewGroup("Padel", ["b"])).toBeNull();
    expect(
      validateNewGroup(
        "Padel",
        Array.from({ length: 50 }, (_, i) => `u${i}`),
      ),
    ).toMatch(/50/);
  });
});

describe("membersAfterRemoval", () => {
  it("just removes a normal member", () => {
    expect(membersAfterRemoval(group, "c").map((m) => m.userId)).toEqual(["a", "b"]);
  });

  it("promotes the longest member when the last admin leaves", () => {
    const rest = membersAfterRemoval(group, "a");
    expect(rest.find((m) => m.userId === "b")?.role).toBe("admin");
    expect(rest.find((m) => m.userId === "c")?.role).toBe("member");
  });
});

describe("groupUnread / groupConversations", () => {
  const messages = [
    msg("m1", "a", "2026-11-19T08:30:00Z"),
    msg("m2", "b", "2026-11-19T09:30:00Z"),
    msg("m3", "a", "2026-11-19T09:40:00Z"),
    msg("x", "b", "2026-11-19T10:00:00Z", "other"),
  ];

  it("counts others' messages after you last read", () => {
    expect(groupUnread(group, messages, "a")).toBe(1); // m2
    expect(groupUnread(group, messages, "b")).toBe(2); // m1, m3
    expect(groupUnread(group, messages, "stranger")).toBe(0);
  });

  it("finds the latest message of each group", () => {
    const [conv] = groupConversations([group], messages, "a");
    expect(conv.last?.id).toBe("m3");
    expect(conv.unread).toBe(1);
    expect(groupConversations([group], [], "a")[0].last).toBeNull();
  });
});

describe("isAdmin / memberSummary", () => {
  it("knows admins and lists members with you last", () => {
    expect(isAdmin(group, "a")).toBe(true);
    expect(isAdmin(group, "b")).toBe(false);
    expect(memberSummary(group, "b", (id) => id.toUpperCase())).toBe("A, C, You");
  });
});

describe("validateGroupDescription", () => {
  it("allows an empty description and up to 500 characters", () => {
    expect(validateGroupDescription("")).toBeNull();
    expect(validateGroupDescription("Corporate Finance study group, Tuesdays 18:00")).toBeNull();
    expect(validateGroupDescription("x".repeat(501))).toMatch(/500/);
  });
});
