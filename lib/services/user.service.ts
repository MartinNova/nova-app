import { DEMO_USERS, TEAM_PLACEHOLDERS } from "@/data/users.mock";
import { splitName, studentIdFromEmail } from "@/lib/auth/nova-account";
import { readJSON, writeJSON } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import { AUTH_MODE } from "@/lib/supabase/config";
import { PROFILES_VIEW, USER_COLUMNS, rowToUser, type ProfileRow } from "@/lib/supabase/profiles";
import type { User, UserService } from "@/types/user";

const CURRENT_USER_KEY = "current-user-id";

/**
 * Parses NEXT_PUBLIC_TEAM_MEMBERS, e.g. "Jane Doe:12345,John Smith:67890".
 * Everything before the last space is the first name(s); invalid entries are skipped.
 */
export function parseTeamMembers(raw: string | undefined): User[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry, i) => {
      const [name, studentId] = entry.split(":").map((s) => s?.trim());
      if (!name || !studentId) return [];
      const parts = name.split(/\s+/);
      const lastName = parts.length > 1 ? parts.pop()! : "";
      return [
        {
          id: `team-${i + 1}`,
          firstName: parts.join(" "),
          lastName,
          studentId,
          role: "team" as const,
        },
      ];
    });
}

/** Same default handle as the demo profile ("sofia.almeida"), so links like ?u=... work. */
const demoUsername = (u: User) =>
  `${u.firstName}.${u.lastName}`.toLowerCase().replace(/[^a-z0-9_.]/g, "");

function allUsers(): User[] {
  const team = parseTeamMembers(process.env.NEXT_PUBLIC_TEAM_MEMBERS);
  return [...(team.length > 0 ? team : TEAM_PLACEHOLDERS), ...DEMO_USERS].map((u) => ({
    ...u,
    username: u.username ?? demoUsername(u),
  }));
}

/** Demo login: mock users, the chosen account is remembered in localStorage. */
const demoUserService: UserService = {
  async listUsers() {
    return allUsers();
  },
  async getCurrentUser() {
    const users = allUsers();
    const id = readJSON<string | null>(CURRENT_USER_KEY, null);
    return users.find((u) => u.id === id) ?? users[0] ?? null;
  },
  async setCurrentUser(userId) {
    writeJSON(CURRENT_USER_KEY, userId);
  },
};

/** Reads the stored session locally (no network), so signed-out visitors cause no requests. */
export async function hasSession(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  return data.session !== null;
}

/** Real accounts: the signed-in Supabase user and everyone's (visible) profile. */
const supabaseUserService: UserService = {
  async listUsers() {
    // Profiles are only visible when signed in; skip the request otherwise.
    if (!(await hasSession())) return [];
    const { data, error } = await getSupabase().from(PROFILES_VIEW).select(USER_COLUMNS);
    if (error) throw error;
    return (data as ProfileRow[]).map((row) => rowToUser(row));
  },
  async getCurrentUser() {
    if (!(await hasSession())) return null;
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from(PROFILES_VIEW)
      .select(USER_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    if (data) return rowToUser(data as ProfileRow, user.email);
    // Profile row not there yet (e.g. migration not run): fall back to the login data.
    const email = user.email ?? "";
    return {
      id: user.id,
      ...splitName(user.user_metadata?.full_name ?? user.user_metadata?.username ?? ""),
      studentId: studentIdFromEmail(email),
      role: "student",
      email,
    };
  },
  async setCurrentUser() {
    // Real accounts can't be switched; sign out and in again instead.
  },
};

export const userService: UserService =
  AUTH_MODE === "accounts" ? supabaseUserService : demoUserService;
