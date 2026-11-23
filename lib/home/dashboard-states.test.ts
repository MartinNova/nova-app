import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Widget } from "@/components/home/widgets";
import type { Today } from "@/components/home/useToday";
import { openMatches } from "./today";
import type { PadelMatch } from "@/types/padel";

const empty: Today = {
  time: "12:00",
  lecture: null,
  matches: [],
  todos: [],
  status: { lecture: "ok", padel: "ok", todos: "ok" },
};
describe("dashboard empty and failure states", () => {
  it.each(["lecture", "padel", "todos"] as const)(
    "does not display a successful empty state when %s failed",
    (id) => {
      const key = id === "lecture" ? "lecture" : id;
      const html = renderToStaticMarkup(
        createElement(Widget, {
          id,
          today: { ...empty, status: { ...empty.status, [key]: "error" } },
        }),
      );
      expect(html).toContain("Unavailable");
      expect(html).not.toContain("Free for today");
      expect(html).not.toContain("No open matches");
      expect(html).not.toContain("Nothing due");
    },
  );
  it("shows authentication required instead of no matches when signed out", () => {
    const html = renderToStaticMarkup(
      createElement(Widget, {
        id: "padel",
        today: { ...empty, status: { ...empty.status, padel: "auth" } },
      }),
    );
    expect(html).toContain("Sign in to view");
    expect(html).not.toContain("No open matches");
  });
  it("does not claim all tasks are complete when there are none due", () => {
    const html = renderToStaticMarkup(createElement(Widget, { id: "todos", today: empty }));
    expect(html).toContain("Nothing due");
    expect(html).not.toContain("All done");
  });
});
describe("available Padel snapshots", () => {
  const match: PadelMatch = {
    id: "test",
    date: "2026-11-23",
    time: "14:00",
    durationMinutes: 90,
    location: "Test",
    level: 2.5,
    maxPlayers: 4,
    playerIds: ["one", "two"],
    guestCount: 1,
    description: "",
    createdBy: "one",
    createdAt: "2026-11-23T10:00:00Z",
  };
  it("updates the count and places after a player joins, expires or cancels", () => {
    const matches = openMatches([match], "13:00");
    const html = renderToStaticMarkup(
      createElement(Widget, { id: "padel", today: { ...empty, matches } }),
    );
    expect(html).toContain("1 open");
    expect(html).toContain("1 spot");
    expect(
      openMatches([{ ...match, playerIds: [...match.playerIds, "three"] }], "13:00"),
    ).toHaveLength(0);
    expect(openMatches([match], "14:01")).toHaveLength(0);
    expect(openMatches([], "13:00")).toHaveLength(0);
  });
});
