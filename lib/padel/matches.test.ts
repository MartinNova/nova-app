import { describe, expect, it } from "vitest";
import { freeSpots, getLevelBand, type NewPadelMatch, type PadelMatch } from "@/types/padel";
import { fromISODate, toISODate, upcomingDates } from "./dates";
import {
  filterMatches,
  joinMatch,
  leaveMatch,
  myMatches,
  pendingRequests,
  requestToJoin,
  respondToRequest,
  validateNewMatch,
  withdrawRequest,
} from "./matches";

const match = (overrides: Partial<PadelMatch> = {}): PadelMatch => ({
  id: "m1",
  date: "2026-11-20",
  time: "18:30",
  durationMinutes: 90,
  location: "Padel CIF",
  level: 2.5,
  maxPlayers: 4,
  playerIds: ["a"],
  guestCount: 0,
  description: "",
  createdBy: "a",
  createdAt: "2026-11-17T12:00:00.000Z",
  ...overrides,
});

const newMatch = (overrides: Partial<NewPadelMatch> = {}): NewPadelMatch => ({
  date: "2026-11-20",
  time: "18:30",
  durationMinutes: 90,
  location: "Padel CIF",
  level: 2.5,
  maxPlayers: 4,
  guestCount: 0,
  description: "",
  ...overrides,
});

describe("levels", () => {
  it("finds the band for a value", () => {
    expect(getLevelBand(1.0).label).toBe("Newcomer");
    expect(getLevelBand(2.7).label).toBe("Intermediate");
    expect(getLevelBand(7.0).label).toBe("Professional");
  });
});

describe("freeSpots", () => {
  it("counts app players and guests", () => {
    expect(freeSpots(match())).toBe(3);
    expect(freeSpots(match({ guestCount: 1, playerIds: ["a", "b"] }))).toBe(1);
  });
});

describe("filterMatches", () => {
  const list = [
    match({ id: "late", time: "20:00" }),
    match({ id: "early", time: "08:00" }),
    match({ id: "other-day", date: "2026-11-21", level: 4 }),
  ];

  it("sorts by date and time", () => {
    expect(filterMatches(list).map((m) => m.id)).toEqual(["early", "late", "other-day"]);
  });
  it("filters by date and level", () => {
    expect(filterMatches(list, { date: "2026-11-20" })).toHaveLength(2);
    expect(filterMatches(list, { level: 4 }).map((m) => m.id)).toEqual(["other-day"]);
  });
});

describe("validateNewMatch", () => {
  it("accepts a valid match", () => {
    expect(validateNewMatch(newMatch(), "2026-11-17")).toBeNull();
  });
  it("rejects past dates, unknown levels and a full court", () => {
    expect(validateNewMatch(newMatch(), "2026-11-21")).toMatch(/future/);
    expect(validateNewMatch(newMatch({ level: 2.7 }), "2026-11-17")).toMatch(/level/);
    expect(validateNewMatch(newMatch({ guestCount: 3 }), "2026-11-17")).toMatch(/between 1 and 3/);
  });
});

describe("join and leave", () => {
  it("adds and removes a player", () => {
    const joined = joinMatch(match(), "b");
    expect(joined.playerIds).toEqual(["a", "b"]);
    expect(leaveMatch(joined, "b").playerIds).toEqual(["a"]);
  });
  it("blocks joining twice or a full match", () => {
    expect(() => joinMatch(match(), "a")).toThrow(/already joined/);
    expect(() => joinMatch(match({ guestCount: 3 }), "b")).toThrow(/full/);
  });
  it("the creator cannot leave", () => {
    expect(() => leaveMatch(match(), "a")).toThrow(/Cancel/);
  });
});

describe("dates", () => {
  it("round-trips local dates", () => {
    expect(toISODate(fromISODate("2026-11-20"))).toBe("2026-11-20");
    expect(upcomingDates(fromISODate("2026-11-30"), 2)).toEqual(["2026-11-30", "2026-12-01"]);
  });
});

describe("join requests", () => {
  const ask = (m: PadelMatch, userId: string, createdAt = "2026-11-18T10:00:00Z") =>
    requestToJoin(m, { id: `r-${userId}`, userId, note: " Level 3 ", createdAt });

  it("sends a pending request with a trimmed note", () => {
    const asked = ask(match(), "b");
    expect(asked.requests).toEqual([
      {
        id: "r-b",
        userId: "b",
        note: "Level 3",
        status: "pending",
        createdAt: "2026-11-18T10:00:00Z",
      },
    ]);
    expect(asked.playerIds).toEqual(["a"]);
  });

  it("blocks the organiser, players, double requests and full courts", () => {
    expect(() => ask(match(), "a")).toThrow(/posted/);
    expect(() => ask(match({ playerIds: ["a", "b"] }), "b")).toThrow(/already playing/);
    expect(() => ask(ask(match(), "b"), "b")).toThrow(/already asked/);
    expect(() => ask(match({ guestCount: 3 }), "b")).toThrow(/full/);
  });

  it("lists pending requests oldest first and lets you take yours back", () => {
    const asked = ask(ask(match(), "c", "2026-11-18T11:00:00Z"), "b", "2026-11-18T09:00:00Z");
    expect(pendingRequests(asked).map((r) => r.userId)).toEqual(["b", "c"]);
    expect(withdrawRequest(asked, "b").requests?.map((r) => r.userId)).toEqual(["c"]);
  });

  it("accepting adds the player, declining keeps them out", () => {
    const asked = ask(match(), "b");
    const accepted = respondToRequest(asked, "r-b", true, "a");
    expect(accepted.playerIds).toEqual(["a", "b"]);
    expect(accepted.requests?.[0].status).toBe("accepted");

    const declined = respondToRequest(asked, "r-b", false, "a");
    expect(declined.playerIds).toEqual(["a"]);
    expect(() => ask(declined, "b")).toThrow(/said no/);
  });

  it("only the organiser answers, once, and not beyond a full court", () => {
    const asked = ask(match(), "b");
    expect(() => respondToRequest(asked, "r-b", true, "b")).toThrow(/organiser/);
    const accepted = respondToRequest(asked, "r-b", true, "a");
    expect(() => respondToRequest(accepted, "r-b", false, "a")).toThrow(/already answered/);
    expect(() => respondToRequest({ ...asked, guestCount: 3 }, "r-b", true, "a")).toThrow(/full/);
  });

  it("leaving clears your request so you could ask again", () => {
    const accepted = respondToRequest(ask(match(), "b"), "r-b", true, "a");
    const left = leaveMatch(accepted, "b");
    expect(left.requests).toEqual([]);
    expect(ask(left, "b").requests?.[0].status).toBe("pending");
  });
});

describe("myMatches", () => {
  const pending = { id: "r", userId: "b", note: "", createdAt: "2026-11-18T10:00:00Z" };

  it("lists matches you play in or asked to join, earliest first", () => {
    const list = [
      match({ id: "later", date: "2026-11-27", playerIds: ["a", "b"] }),
      match({ id: "asked", date: "2026-11-25", requests: [{ ...pending, status: "pending" }] }),
      match({ id: "other", date: "2026-11-24" }),
    ];
    expect(myMatches(list, "b").map((m) => m.id)).toEqual(["asked", "later"]);
  });

  it("leaves out declined requests", () => {
    const declined = match({ requests: [{ ...pending, status: "declined" }] });
    expect(myMatches([declined], "b")).toEqual([]);
  });
});
