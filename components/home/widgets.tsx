"use client";

import { GraduationCap, ListChecks, Trophy, Waves, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  forecastForToday,
  latestRequest,
  upcomingSurfTime,
  watchDashboard,
} from "@/lib/home/refresh";
import { nowInLisbon, startsIn } from "@/lib/home/today";
import type { WidgetId } from "@/lib/home/widgets";
import { getSurfForecast } from "@/lib/surf/forecast";
import { DEFAULT_SPOT_ID, getSpot } from "@/lib/surf/spots";
import type { SurfForecastDay, SurfRating } from "@/types/surf";
import { todayInLisbon } from "@/lib/timetable/dates";
import type { Today, SourceStatus } from "./useToday";

/** Homepage-only palette inspired by the NOVA Students banner. */
export const WIDGET_TONE = {
  ocean: "bg-[#78b6d8] text-white",
  brand: "bg-[#76b9a5] text-white",
  sport: "bg-[#cd79a1] text-white",
  task: "bg-[#c8a344] text-white",
} as const;

export const WIDGET_META: Record<WidgetId, { icon: LucideIcon; tone: keyof typeof WIDGET_TONE }> = {
  surf: { icon: Waves, tone: "ocean" },
  lecture: { icon: GraduationCap, tone: "brand" },
  padel: { icon: Trophy, tone: "sport" },
  todos: { icon: ListChecks, tone: "task" },
};

interface FrameProps {
  id: WidgetId;
  href: string;
  label: string;
  children: React.ReactNode;
  decoration?: React.ReactNode;
}

/** Shared widget shell: same size for every widget, so the stack doesn't jump while swiping. */
function WidgetFrame({ id, href, label, children, decoration }: FrameProps) {
  const { icon: Icon, tone } = WIDGET_META[id];
  return (
    <Link
      href={href}
      draggable={false}
      className={`${WIDGET_TONE[tone]} focus-visible:outline-brand relative flex h-[172px] flex-col overflow-hidden rounded-[26px] px-[18px] pt-4 pb-5 transition-transform duration-200 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]`}
    >
      <span className="flex items-center gap-1.5 text-[15px] font-semibold">
        <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
        {label}
      </span>
      <span className="relative mt-auto flex flex-col gap-1">{children}</span>
      {decoration ?? (
        <Icon
          className="pointer-events-none absolute -top-3 -right-4 size-32 opacity-[0.09]"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
    </Link>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate text-[40px] leading-[46px] font-bold tracking-tight">{children}</span>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <span className="line-clamp-2 text-[15px] leading-5">{children}</span>;
}

function Placeholder() {
  return (
    <>
      <span className="h-10 w-28 animate-pulse rounded-xl bg-white/20" />
      <span className="h-5 w-48 animate-pulse rounded-lg bg-white/20" />
    </>
  );
}

const RATING: Record<SurfRating, string> = {
  good: "Good conditions",
  medium: "OK conditions",
  bad: "Not great today",
};

type SurfState =
  { status: "loading" } | { status: "error" } | { status: "ok"; day: SurfForecastDay };

function SurfWidget() {
  const [state, setState] = useState<SurfState>({ status: "loading" });
  const spot = getSpot(DEFAULT_SPOT_ID)!;

  const [, setTime] = useState("");
  useEffect(() => {
    let controller: AbortController | undefined;
    const request = latestRequest<SurfForecastDay>(
      (day) => setState({ status: "ok", day }),
      () => setState({ status: "error" }),
    );
    const tick = () => setTime(nowInLisbon());
    function reload() {
      controller?.abort();
      controller = new AbortController();
      setState({ status: "loading" });
      tick();
      const signal = controller.signal;
      void request.run(async () => {
        const { days } = await getSurfForecast(spot, 1, signal);
        return forecastForToday(days);
      });
    }
    const watcher = watchDashboard(reload, tick, 15 * 60 * 1000);
    reload();
    return () => {
      request.cancel();
      controller?.abort();
      watcher.stop();
    };
  }, [spot]);

  return (
    <WidgetFrame id="surf" href="/sport/surf" label={spot.name} decoration={<WaveLines />}>
      {state.status === "loading" && <Placeholder />}
      {state.status === "error" && (
        <>
          <span className="text-[28px] leading-[46px] font-bold">Surf forecast</span>
          <Sub>Not available right now. Tap for details.</Sub>
        </>
      )}
      {state.status === "ok" && state.day.date === todayInLisbon() && (
        <>
          <Big>{state.day.conditions.waveHeightM.toFixed(1)} m</Big>
          <Sub>
            Daily avg · {RATING[state.day.rating]}
            {upcomingSurfTime(state.day) ? ` · best at ${state.day.bestTime}` : ""} · max{" "}
            {Math.round(state.day.conditions.temperatureC)} °C
          </Sub>
        </>
      )}
    </WidgetFrame>
  );
}

function WaveLines() {
  return (
    <svg
      viewBox="0 0 390 26"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[26px] w-full"
    >
      <path
        d="M0 14 C 32 4, 65 4, 97 14 S 162 24, 195 14 S 260 4, 292 14 S 357 24, 390 14 L 390 26 L 0 26 Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M0 19 C 40 11, 80 11, 120 19 S 200 27, 240 19 S 320 11, 390 19 L 390 26 L 0 26 Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

function SourceMessage({ status }: { status: SourceStatus }) {
  return (
    <>
      <span className="text-[28px] leading-[46px] font-bold">
        {status === "auth" ? "Sign in to view" : "Unavailable"}
      </span>
      <Sub>
        {status === "auth"
          ? "Sign in to see available matches."
          : "Could not load. Refreshes automatically."}
      </Sub>
    </>
  );
}

function LectureWidget({ today }: { today: Today | null }) {
  const lecture = today?.lecture;
  return (
    <WidgetFrame id="lecture" href="/timetable" label="Next lecture">
      {(!today || today.status.lecture === "loading") && <Placeholder />}
      {today && (today.status.lecture === "error" || today.status.lecture === "auth") && (
        <SourceMessage status={today.status.lecture} />
      )}
      {today && today.status.lecture === "ok" && lecture && (
        <>
          <span className="mb-1 w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-semibold">
            {startsIn(lecture.start!, today.time)}
          </span>
          <span className="line-clamp-2 text-[22px] leading-7 font-bold">{lecture.title}</span>
          <Sub>
            {[`${lecture.start}–${lecture.end}`, lecture.location].filter(Boolean).join(" · ")}
          </Sub>
        </>
      )}
      {today && today.status.lecture === "ok" && !lecture && (
        <>
          <span className="text-[28px] leading-[46px] font-bold">Free for today</span>
          <Sub>No more lectures. Open your timetable.</Sub>
        </>
      )}
    </WidgetFrame>
  );
}

function PadelWidget({ today }: { today: Today | null }) {
  const next = today?.matches[0];
  return (
    <WidgetFrame id="padel" href="/sport/padel" label="Padel today">
      {(!today || today.status.padel === "loading") && <Placeholder />}
      {today && (today.status.padel === "error" || today.status.padel === "auth") && (
        <SourceMessage status={today.status.padel} />
      )}
      {today && today.status.padel === "ok" && next && (
        <>
          <Big>{today.matches.length} open</Big>
          <Sub>
            Next at {next.time} · {next.maxPlayers - next.playerIds.length - next.guestCount} spot
            {next.maxPlayers - next.playerIds.length - next.guestCount === 1 ? "" : "s"} left
          </Sub>
        </>
      )}
      {today && today.status.padel === "ok" && !next && (
        <>
          <span className="text-[28px] leading-[46px] font-bold">No open matches</span>
          <Sub>Start one and find players.</Sub>
        </>
      )}
    </WidgetFrame>
  );
}

function TodosWidget({ today }: { today: Today | null }) {
  const todos = today?.todos ?? [];
  return (
    <WidgetFrame id="todos" href="/study/todos" label="To-dos">
      {(!today || today.status.todos === "loading") && <Placeholder />}
      {today && (today.status.todos === "error" || today.status.todos === "auth") && (
        <SourceMessage status={today.status.todos} />
      )}
      {today && today.status.todos === "ok" && todos.length > 0 && (
        <>
          <Big>{todos.length} due</Big>
          <Sub>{todos.map((t) => t.title).join(" · ")}</Sub>
        </>
      )}
      {today && today.status.todos === "ok" && todos.length === 0 && (
        <>
          <span className="text-[28px] leading-[46px] font-bold">Nothing due</span>
          <Sub>No unfinished tasks due today or overdue.</Sub>
        </>
      )}
    </WidgetFrame>
  );
}

/** Renders one widget by id. */
export function Widget({ id, today }: { id: WidgetId; today: Today | null }) {
  switch (id) {
    case "surf":
      return <SurfWidget />;
    case "lecture":
      return <LectureWidget today={today} />;
    case "padel":
      return <PadelWidget today={today} />;
    case "todos":
      return <TodosWidget today={today} />;
  }
}
