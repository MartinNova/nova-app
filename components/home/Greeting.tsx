"use client";

import { useSyncExternalStore } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { dailyMessage, subscribeToLocalDay } from "@/lib/home/daily-message";

/** Today's date in Lisbon, e.g. "Tuesday 17 November". */
function todayLabel(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .replace(",", "");
}

const noSubscription = () => () => {};

/** Large title on the home page: date above, "Olá, <name>". */
export function Greeting() {
  const { user } = useCurrentUser();
  // Browser only, so server and browser render the same HTML (the server may be in another time zone).
  const date = useSyncExternalStore(noSubscription, todayLabel, () => "\u00a0");

  const message = useSyncExternalStore(subscribeToLocalDay, dailyMessage, () => "\u00a0");

  return (
    <LargeTitle title={user ? `Olá, ${user.firstName}` : "Olá"} eyebrow={date} immersive>
      <p className="text-muted mt-2 text-sm leading-relaxed">{message}</p>
    </LargeTitle>
  );
}
