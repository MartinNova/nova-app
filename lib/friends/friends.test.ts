import { describe, expect, it } from "vitest";
import type { Friendship } from "@/types/friends";
import {
  friendIds,
  incomingRequests,
  isBetween,
  otherPerson,
  outgoingRequests,
  relationTo,
  validateFriendRequest,
} from "./friends";

const request = (
  id: string,
  requesterId: string,
  addresseeId: string,
  status: Friendship["status"] = "pending",
  createdAt = "2026-11-20T10:00:00Z",
): Friendship => ({ id, requesterId, addresseeId, status, createdAt });

const ME = "me";
const all = [
  request("a", ME, "anna", "accepted"),
  request("b", "ben", ME, "accepted"),
  request("c", ME, "carla"),
  request("d", "dora", ME, "pending", "2026-11-21T10:00:00Z"),
  request("e", "emil", ME, "pending", "2026-11-22T10:00:00Z"),
  request("x", "anna", "ben", "accepted"), // not mine
];

describe("relationTo", () => {
  it("knows friends, sent and received requests and strangers", () => {
    expect(relationTo(all, ME, "anna").kind).toBe("friends");
    expect(relationTo(all, ME, "ben").kind).toBe("friends");
    expect(relationTo(all, ME, "carla").kind).toBe("outgoing");
    expect(relationTo(all, ME, "dora").kind).toBe("incoming");
    expect(relationTo(all, ME, "zoe").kind).toBe("none");
  });

  it("is the mirror image for the other person", () => {
    expect(relationTo(all, "carla", ME).kind).toBe("incoming");
    expect(relationTo(all, "dora", ME).kind).toBe("outgoing");
  });
});

describe("friend lists", () => {
  it("only counts accepted friendships I'm part of", () => {
    expect([...friendIds(all, ME)].sort()).toEqual(["anna", "ben"]);
  });

  it("lists requests waiting for me, newest first", () => {
    expect(incomingRequests(all, ME).map((f) => f.id)).toEqual(["e", "d"]);
  });

  it("lists requests I sent", () => {
    expect(outgoingRequests(all, ME).map((f) => f.id)).toEqual(["c"]);
  });

  it("finds the other person and checks both directions", () => {
    expect(otherPerson(all[0], ME)).toBe("anna");
    expect(otherPerson(all[1], ME)).toBe("ben");
    expect(isBetween(all[1], ME, "ben")).toBe(true);
    expect(isBetween(all[1], "ben", ME)).toBe(true);
    expect(isBetween(all[1], ME, "anna")).toBe(false);
  });
});

describe("validateFriendRequest", () => {
  it("allows a request to someone new", () => {
    expect(validateFriendRequest(all, ME, "zoe")).toBeNull();
  });

  it("refuses yourself, friends and duplicate requests", () => {
    expect(validateFriendRequest(all, ME, ME)).toMatch(/yourself/);
    expect(validateFriendRequest(all, ME, "anna")).toMatch(/already friends/);
    expect(validateFriendRequest(all, ME, "carla")).toMatch(/pending/);
  });

  it("allows answering someone who asked you (the service accepts theirs)", () => {
    expect(validateFriendRequest(all, ME, "dora")).toBeNull();
  });
});
