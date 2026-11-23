import {
  MAX_PADEL_PLAYERS,
  MAX_REQUEST_NOTE,
  PADEL_LEVELS,
  freeSpots,
  type JoinRequest,
  type NewPadelMatch,
  type PadelMatch,
  type PadelMatchFilter,
} from "@/types/padel";

/**
 * Pure match logic (no storage), so it can be unit tested and reused when we
 * move to Supabase. Every function returns a new object instead of mutating.
 */

/** Matches for a filter, sorted by date and time. */
export function filterMatches(matches: PadelMatch[], filter: PadelMatchFilter = {}): PadelMatch[] {
  return matches
    .filter((m) => !filter.date || m.date === filter.date)
    .filter((m) => filter.level === undefined || m.level === filter.level)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/** Returns an error message, or null if the new match is valid. */
export function validateNewMatch(input: NewPadelMatch, today: string): string | null {
  if (!input.date || input.date < today) return "Pick today or a future date.";
  if (!/^\d{2}:\d{2}$/.test(input.time)) return "Pick a start time.";
  if (!input.location.trim()) return "Where is the court?";
  if (!PADEL_LEVELS.some((band) => band.min === input.level)) return "Pick a level.";
  if (input.maxPlayers !== MAX_PADEL_PLAYERS)
    return `A padel match has ${MAX_PADEL_PLAYERS} players.`;
  const needed = input.maxPlayers - 1 - input.guestCount;
  if (needed < 1 || needed > MAX_PADEL_PLAYERS - 1) return "You need between 1 and 3 players.";
  return null;
}

export function joinMatch(match: PadelMatch, userId: string): PadelMatch {
  if (match.playerIds.includes(userId)) throw new Error("You already joined this match.");
  if (freeSpots(match) === 0) throw new Error("This match is already full.");
  return { ...match, playerIds: [...match.playerIds, userId] };
}

export function leaveMatch(match: PadelMatch, userId: string): PadelMatch {
  if (match.createdBy === userId) throw new Error("You posted this match. Cancel it instead.");
  if (!match.playerIds.includes(userId)) throw new Error("You are not in this match.");
  return {
    ...match,
    playerIds: match.playerIds.filter((id) => id !== userId),
    // Leaving clears your request, so you could ask again later.
    requests: (match.requests ?? []).filter((r) => r.userId !== userId),
  };
}

/**
 * Matches you play in or asked to join, sorted by date and time: shown as "Your matches" below
 * the calendar, so a court booked for next week is visible without picking its day.
 */
export function myMatches(matches: PadelMatch[], userId: string): PadelMatch[] {
  return filterMatches(matches).filter(
    (m) => m.playerIds.includes(userId) || myRequest(m, userId)?.status === "pending",
  );
}

/** Your own request for this match, if any. */
export function myRequest(match: PadelMatch, userId: string): JoinRequest | undefined {
  return (match.requests ?? []).find((r) => r.userId === userId);
}

/** Requests the organiser still has to answer, oldest first. */
export function pendingRequests(match: PadelMatch): JoinRequest[] {
  return (match.requests ?? [])
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Throws a readable error if `userId` can't ask to join this match. */
export function checkCanRequest(match: PadelMatch, userId: string, note: string): void {
  if (match.createdBy === userId) throw new Error("You posted this match.");
  if (match.playerIds.includes(userId)) throw new Error("You are already playing.");
  const existing = myRequest(match, userId);
  if (existing?.status === "pending") throw new Error("You already asked to join.");
  if (existing?.status === "declined")
    throw new Error("The organiser said no this time. Try another match.");
  if (freeSpots(match) === 0) throw new Error("This match is already full.");
  if (note.trim().length > MAX_REQUEST_NOTE)
    throw new Error(`The note can have at most ${MAX_REQUEST_NOTE} characters.`);
}

export function requestToJoin(
  match: PadelMatch,
  request: Pick<JoinRequest, "id" | "userId" | "note" | "createdAt">,
): PadelMatch {
  checkCanRequest(match, request.userId, request.note);
  const others = (match.requests ?? []).filter((r) => r.userId !== request.userId);
  return {
    ...match,
    requests: [...others, { ...request, note: request.note.trim(), status: "pending" }],
  };
}

export function withdrawRequest(match: PadelMatch, userId: string): PadelMatch {
  if (myRequest(match, userId)?.status !== "pending")
    throw new Error("No open request to take back.");
  return { ...match, requests: (match.requests ?? []).filter((r) => r.userId !== userId) };
}

/** Organiser accepts (adds the player) or declines a pending request. */
export function respondToRequest(
  match: PadelMatch,
  requestId: string,
  accept: boolean,
  userId: string,
): PadelMatch {
  if (match.createdBy !== userId) throw new Error("Only the organiser can answer requests.");
  const request = (match.requests ?? []).find((r) => r.id === requestId);
  if (!request) throw new Error("This request no longer exists.");
  if (request.status !== "pending") throw new Error("This request was already answered.");
  const answered = {
    ...match,
    requests: (match.requests ?? []).map((r) =>
      r.id === requestId
        ? { ...r, status: accept ? ("accepted" as const) : ("declined" as const) }
        : r,
    ),
  };
  return accept ? { ...joinMatch(match, request.userId), requests: answered.requests } : answered;
}
