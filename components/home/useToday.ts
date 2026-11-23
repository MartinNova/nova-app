"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { checkDashboardStorage, latestRequest, watchDashboard } from "@/lib/home/refresh";
import { dueTodos, nextLecture, nowInLisbon, openMatches } from "@/lib/home/today";
import { padelService } from "@/lib/services/padel.service";
import { timetableService } from "@/lib/services/timetable.service";
import { todoService } from "@/lib/services/todo.service";
import { STORAGE_CHANGED } from "@/lib/storage";
import { todayInLisbon } from "@/lib/timetable/dates";
import { eventsBetween } from "@/lib/timetable/schedule";
import type { PadelMatch } from "@/types/padel";
import type { TimetableData, TimetableEvent } from "@/types/timetable";
import type { Todo } from "@/types/todo";

export type SourceStatus = "loading" | "ok" | "error" | "auth";
export interface Today {
  time: string;
  lecture: TimetableEvent | null;
  matches: PadelMatch[];
  todos: Todo[];
  status: { lecture: SourceStatus; padel: SourceStatus; todos: SourceStatus };
}

export function useToday(): Today | null {
  const { user, ready, mode } = useCurrentUser();
  const owner = `${mode}:${user?.id ?? "guest"}`;
  const [snapshot, setSnapshot] = useState<{ owner: string; value: Today } | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let timetable: TimetableData | null = null;
    let matches: PadelMatch[] = [];
    let todos: Todo[] = [];
    const status: Today["status"] = {
      lecture: "loading",
      padel: mode === "accounts" && !user?.id ? "auth" : "loading",
      todos: "loading",
    };
    let lastClock = "";
    function publish() {
      if (!alive) return;
      const date = todayInLisbon();
      const time = nowInLisbon();
      lastClock = `${date} ${time}`;
      setSnapshot({
        owner,
        value: {
          time,
          status: { ...status },
          lecture:
            status.lecture === "ok" && timetable
              ? nextLecture(eventsBetween(timetable, date, date), time)
              : null,
          matches:
            status.padel === "ok"
              ? openMatches(
                  matches.filter((m) => m.date === date),
                  time,
                )
              : [],
          todos: status.todos === "ok" ? dueTodos(todos, date) : [],
        },
      });
    }
    const lectureRequest = latestRequest<TimetableData>(
      (value) => {
        timetable = value;
        status.lecture = "ok";
        publish();
      },
      () => {
        status.lecture = "error";
        publish();
      },
    );
    const padelRequest = latestRequest<PadelMatch[]>(
      (value) => {
        matches = value;
        status.padel = "ok";
        publish();
      },
      () => {
        status.padel = "error";
        publish();
      },
    );
    const todoRequest = latestRequest<Todo[]>(
      (value) => {
        todos = value;
        status.todos = "ok";
        publish();
      },
      () => {
        status.todos = "error";
        publish();
      },
    );
    function reload() {
      // Old data is hidden until verified, and each source resolves independently.
      status.lecture = "loading";
      status.todos = "loading";
      void lectureRequest.run(() => {
        checkDashboardStorage(["timetable"]);
        return timetableService.load();
      });
      void todoRequest.run(() => {
        checkDashboardStorage(["todo-lists-v2", "todo-labels-v2", "todo-todos-v2"]);
        return todoService.listTodos();
      });
      if (status.padel !== "auth") {
        status.padel = "loading";
        void padelRequest.run(() => padelService.listMatches({ date: todayInLisbon() }));
      }
      publish();
    }
    const watcher = watchDashboard(reload, () => {
      if (`${todayInLisbon()} ${nowInLisbon()}` !== lastClock) publish();
    });
    function storageChanged(event: Event) {
      const key = event instanceof StorageEvent ? event.key : (event as CustomEvent<string>).detail;
      if (
        key === null ||
        key === "campus-match:timetable" ||
        key?.startsWith("campus-match:todo-") ||
        key === "campus-match:padel-matches"
      )
        watcher.request();
    }
    window.addEventListener("storage", storageChanged);
    window.addEventListener(STORAGE_CHANGED, storageChanged);
    let unsubscribe = () => {};
    if (status.padel !== "auth") {
      try {
        unsubscribe = padelService.onChange(watcher.request);
      } catch {
        /* Five-minute/focus refresh remains available if Realtime cannot connect. */
      }
    }
    reload();
    return () => {
      alive = false;
      lectureRequest.cancel();
      padelRequest.cancel();
      todoRequest.cancel();
      watcher.stop();
      unsubscribe();
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener(STORAGE_CHANGED, storageChanged);
    };
  }, [owner, ready, mode, user?.id]);

  return ready && snapshot?.owner === owner ? snapshot.value : null;
}
