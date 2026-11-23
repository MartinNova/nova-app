"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { friendIds, incomingRequests } from "@/lib/friends/friends";
import { friendService } from "@/lib/services/friend.service";
import type { Friendship } from "@/types/friends";

/** Your friend requests and friendships, kept up to date live. null while loading. */
export function useFriendships(userId: string | undefined): Friendship[] | null {
  const [loaded, setLoaded] = useState<{ userId: string; friendships: Friendship[] } | null>(null);

  const reload = useCallback(() => {
    if (!userId) return;
    void friendService
      .listMine(userId)
      .catch(() => [])
      .then((friendships) => setLoaded({ userId, friendships }));
  }, [userId]);

  useEffect(reload, [reload]);
  useEffect(() => (userId ? friendService.onChange(userId, reload) : undefined), [userId, reload]);

  return loaded && loaded.userId === userId ? loaded.friendships : null;
}

/** Ids of the signed-in user's friends (accepted only). Empty while loading or signed out. */
export function useFriendIds(): Set<string> {
  const { user } = useCurrentUser();
  const friendships = useFriendships(user?.id);
  return user && friendships ? friendIds(friendships, user.id) : new Set();
}

/** Open requests waiting for the signed-in user, for the tab bar badge. */
export function useFriendRequestCount(): number {
  const { user } = useCurrentUser();
  const friendships = useFriendships(user?.id);
  return user && friendships ? incomingRequests(friendships, user.id).length : 0;
}
