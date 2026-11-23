"use client";

import { ListChecks, Trophy, UtensilsCrossed } from "lucide-react";
import { GroupedList, ListRow } from "@/components/ui/GroupedList";
import { TILE_COLORS } from "@/components/ui/Tile";
import { FOOD_VENUES } from "@/data/food-options";
import "./home-visual.css";
import type { Today } from "./useToday";

const ICON = "size-[19px]";

/** "Up next" and "Today on campus": one glance at the day, built from the other modules. */
export function TodayView({ today }: { today: Today | null }) {
  if (!today) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <div className="bg-surface h-[168px] animate-pulse rounded-3xl" />
      </div>
    );
  }

  const { matches, todos, status } = today;

  return (
    <div className="home-campus-icons flex flex-col gap-6">
      <GroupedList title="Today on campus">
        <ListRow
          href="/canteen"
          tone="food"
          icon={
            <span
              className={`${TILE_COLORS.orange} flex size-8 items-center justify-center rounded-lg text-white`}
            >
              <UtensilsCrossed className="size-6" aria-hidden />
            </span>
          }
          title="Food Options"
          detail={`${FOOD_VENUES.length} places`}
        />
        <ListRow
          href="/sport/padel"
          tone="sport"
          icon={<Trophy className={ICON} strokeWidth={2} aria-hidden />}
          title="Padel"
          detail={
            status.padel === "loading"
              ? "Loading…"
              : status.padel === "auth"
                ? "Sign in"
                : status.padel === "error"
                  ? "Unavailable"
                  : matches.length > 0
                    ? `${matches.length} open`
                    : "None available"
          }
        />
        <ListRow
          href="/study/todos"
          tone="task"
          icon={
            <span
              className={`${TILE_COLORS.amber} flex size-8 items-center justify-center rounded-lg text-white`}
            >
              <ListChecks className="size-6" aria-hidden />
            </span>
          }
          title="To-dos due"
          detail={
            status.todos === "loading"
              ? "Loading…"
              : status.todos === "error"
                ? "Unavailable"
                : todos.length > 0
                  ? String(todos.length)
                  : "Nothing due"
          }
        />
      </GroupedList>
    </div>
  );
}
