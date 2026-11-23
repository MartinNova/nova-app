"use client";

import { MessageCircle, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Segmented } from "@/components/transport/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { friendIds, incomingRequests, otherPerson, outgoingRequests } from "@/lib/friends/friends";
import { searchPeople } from "@/lib/friends/search";
import { flagEmoji, studyProgress } from "@/lib/profile/profile-rules";
import { profileService } from "@/lib/services/profile.service";
import type { Friendship } from "@/types/friends";
import { NOVA_PROGRAMS, SPORT_INTERESTS, type Profile } from "@/types/profile";
import { FriendButton } from "./FriendButton";
import { Invitations } from "./Invitations";
import { useFriendships } from "./useFriendships";

const fieldClass =
  "border-border bg-surface focus-visible:outline-brand h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-2";

type Tab = "friends" | "find";

/** One person in a list: picture, name and programme, with an optional button on the right. */
function PersonRow({
  p,
  today,
  online,
  trailing,
}: {
  p: Profile;
  today: string;
  online: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="group flex min-h-[68px] items-center gap-3 pl-4">
      <Link href={`/friends/profile?u=${p.username}`} className="shrink-0">
        <Avatar
          firstName={p.firstName}
          lastName={p.lastName}
          username={p.username}
          url={p.avatarUrl}
          size={44}
          online={online}
        />
      </Link>
      <div className="border-border flex min-h-[68px] min-w-0 flex-1 items-center gap-2 self-stretch border-b py-2 pr-3 group-last:border-b-0">
        <Link href={`/friends/profile?u=${p.username}`} className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">
            {[p.firstName, p.lastName].filter(Boolean).join(" ") || `@${p.username}`}{" "}
            {flagEmoji(p.country)}
          </span>
          <span className="text-muted block truncate text-[14px]">
            {[p.program, studyProgress(p.studyStart, p.studyEnd, today)]
              .filter(Boolean)
              .join(" · ") || `@${p.username}`}
          </span>
        </Link>
        {trailing}
      </div>
    </li>
  );
}

/**
 * The Friends module: incoming requests ("Invitations") on top, then your friends,
 * and "Find people" to search every student with a public profile and add them.
 */
export function FriendsView() {
  const { user, ready, mode } = useCurrentUser();
  const { presence } = usePresence();
  const userId = user?.id;
  const friendships = useFriendships(userId);
  const [loaded, setLoaded] = useState<{ profiles: Profile[]; today: string } | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");
  const [sport, setSport] = useState("");

  useEffect(() => {
    if (!userId) return;
    profileService
      .listProfiles()
      .catch(() => [])
      .then((profiles) => setLoaded({ profiles, today: new Date().toISOString().slice(0, 7) }));
  }, [userId]);

  const others = useMemo(
    () => (loaded?.profiles ?? []).filter((p) => p.userId !== userId),
    [loaded, userId],
  );
  const byId = useMemo(() => new Map(others.map((p) => [p.userId, p])), [others]);
  const mine: Friendship[] = friendships ?? [];
  const friends = userId ? friendIds(mine, userId) : new Set<string>();
  const friendList = others.filter((p) => friends.has(p.userId));
  const incoming = userId ? incomingRequests(mine, userId) : [];
  const sent = (userId ? outgoingRequests(mine, userId) : []).flatMap((f) => {
    const p = byId.get(otherPerson(f, userId ?? ""));
    return p ? [p] : [];
  });
  // Until you pick a tab: your friends if you have any, otherwise "Find people".
  const activeTab: Tab = tab ?? (friends.size > 0 ? "friends" : "find");
  // Search everyone first, so "fits exactly one student ID" doesn't depend on the filters.
  const shown = searchPeople(others, search).filter(
    (p) => (!program || p.program === program) && (!sport || p.sports.includes(sport)),
  );

  if (!ready) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  if (!user) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="bg-brand text-brand-foreground flex size-14 items-center justify-center rounded-2xl">
          <Users className="size-7" aria-hidden />
        </span>
        <p className="font-semibold">Meet other Nova students</p>
        <p className="text-muted max-w-xs text-sm">
          Sign in to see who else is on the app and get in touch.
        </p>
        <Link
          href="/login"
          className="bg-brand text-brand-foreground inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium hover:opacity-90"
        >
          Sign in or create account
        </Link>
      </Card>
    );
  }

  if (!loaded || !friendships)
    return <div className="bg-border h-40 animate-pulse rounded-2xl" aria-busy="true" />;

  return (
    <>
      {incoming.length > 0 && (
        <Invitations me={user.id} requests={incoming} profiles={byId} today={loaded.today} />
      )}

      <div className="mb-4">
        <Segmented
          label="Show"
          value={activeTab}
          onChange={setTab}
          options={[
            { id: "friends", label: friends.size > 0 ? `Friends (${friends.size})` : "Friends" },
            { id: "find", label: "Find people" },
          ]}
        />
      </div>

      {activeTab === "friends" ? (
        <div className="flex flex-col gap-6">
          {friendList.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="font-semibold">No friends yet</p>
              <p className="text-muted max-w-xs text-sm">
                Find classmates and send them a friend request. Once they accept, they show up here.
              </p>
              <button
                type="button"
                onClick={() => setTab("find")}
                className="bg-brand text-brand-foreground mt-2 inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium hover:opacity-90"
              >
                Find people
              </button>
            </Card>
          ) : (
            <ul className="bg-surface overflow-hidden rounded-3xl">
              {friendList.map((p) => (
                <PersonRow
                  key={p.userId}
                  p={p}
                  today={loaded.today}
                  online={presence.online.has(p.userId)}
                  trailing={
                    <Link
                      href={`/friends/chat?u=${p.username}`}
                      aria-label={`Message ${p.firstName || `@${p.username}`}`}
                      className="bg-brand/10 text-brand hover:bg-brand/15 focus-visible:outline-brand flex size-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 active:scale-90"
                    >
                      <MessageCircle className="size-5" aria-hidden />
                    </Link>
                  }
                />
              ))}
            </ul>
          )}

          {sent.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="mx-1 text-[22px] leading-7 font-bold">Sent</h2>
              <ul className="bg-surface overflow-hidden rounded-3xl">
                {sent.map((p) => (
                  <PersonRow
                    key={p.userId}
                    p={p}
                    today={loaded.today}
                    online={false}
                    trailing={<FriendButton me={user.id} person={p} friendships={mine} />}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <>
          {mode === "demo" && (
            <p className="text-muted mb-4 text-sm">
              Demo mode: these are the demo accounts. Switch accounts to answer a request.
            </p>
          )}

          <div className="mb-4 grid gap-2">
            <label className="relative">
              <span className="sr-only">Search by name, username or student ID</span>
              <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, username or student ID"
                className={`${fieldClass} pl-9`}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Programme"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className={fieldClass}
              >
                <option value="">All programmes</option>
                {Object.entries(NOVA_PROGRAMS).map(([group, programs]) => (
                  <optgroup key={group} label={group}>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                aria-label="Sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className={fieldClass}
              >
                <option value="">All sports</option>
                {SPORT_INTERESTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {shown.length === 0 ? (
            <Card className="py-8 text-center">
              <p className="font-semibold">
                {others.length === 0 ? "You're the first one here" : "Nobody matches these filters"}
              </p>
              <p className="text-muted mt-1 text-sm">
                {others.length === 0
                  ? "Invite your classmates to create an account."
                  : search.trim()
                    ? "Try a first or last name, @username or the full student ID."
                    : "Try another programme or sport."}
              </p>
            </Card>
          ) : (
            <ul className="bg-surface overflow-hidden rounded-3xl">
              {shown.map((p) => (
                <PersonRow
                  key={p.userId}
                  p={p}
                  today={loaded.today}
                  // Online status only for friends.
                  online={friends.has(p.userId) && presence.online.has(p.userId)}
                  trailing={<FriendButton me={user.id} person={p} friendships={mine} />}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
