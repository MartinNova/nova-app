import { describe, expect, it } from "vitest";
import {
  extractLinks,
  linkHref,
  matchingChats,
  normalize,
  searchMessages,
  sharedMedia,
  snippetOf,
  type SearchItem,
} from "./search";

const item = (id: string, changes: Partial<SearchItem> = {}): SearchItem => ({
  id,
  chat: { kind: "direct", id: "u2", name: "Sofia Almeida" },
  senderId: "u2",
  body: "",
  imageUrl: null,
  file: null,
  createdAt: `2026-11-2${id}T10:00:00Z`,
  ...changes,
});

const pdf = { url: "x", name: "Corporate Finance notes.pdf", size: 1000, type: "application/pdf" };

const all = [
  item("1", { body: "See you at the Café later" }),
  item("2", {
    body: "",
    file: pdf,
    chat: { kind: "group", id: "g1", name: "Programming" },
  }),
  item("3", { body: "", imageUrl: "data:image/jpeg;base64,x" }),
  item("4", { body: "Slides are on https://moodle.novasbe.pt/course/42" }),
  item("5", { body: "Finance exam is on Friday" }),
];

describe("searchMessages", () => {
  it("finds text in any chat, newest first, ignoring case and accents", () => {
    expect(searchMessages(all, "cafe").map((h) => h.item.id)).toEqual(["1"]);
    expect(searchMessages(all, "FINANCE").map((h) => h.item.id)).toEqual(["5", "2"]);
  });

  it("finds documents by their file name", () => {
    const [hit] = searchMessages(all, "notes");
    expect(hit.item.id).toBe("2");
    expect(hit.snippet.match).toBe("notes");
  });

  it("shows nothing without a search word on All", () => {
    expect(searchMessages(all, "  ")).toEqual([]);
  });

  it("lists all documents, photos or links with a filter and no word", () => {
    expect(searchMessages(all, "", "files").map((h) => h.item.id)).toEqual(["2"]);
    expect(searchMessages(all, "", "photos").map((h) => h.item.id)).toEqual(["3"]);
    expect(searchMessages(all, "", "links").map((h) => h.item.id)).toEqual(["4"]);
  });

  it("combines a filter with a word", () => {
    expect(searchMessages(all, "finance", "files").map((h) => h.item.id)).toEqual(["2"]);
    expect(searchMessages(all, "exam", "links")).toEqual([]);
  });
});

describe("snippetOf", () => {
  it("keeps the matching part and its original spelling", () => {
    expect(snippetOf("See you at the Café later", "cafe")).toEqual({
      before: "See you at the ",
      match: "Café",
      after: " later",
    });
  });

  it("cuts long messages around the match", () => {
    const long = `${"a".repeat(100)} needle ${"b".repeat(100)}`;
    const s = snippetOf(long, "needle", 10);
    expect(s.before.startsWith("…")).toBe(true);
    expect(s.match).toBe("needle");
    expect(s.after.endsWith("…")).toBe(true);
  });
});

describe("matchingChats", () => {
  it("finds chats by name", () => {
    const chats = [{ name: "João Silva" }, { name: "Programming" }];
    expect(matchingChats(chats, "joao")).toEqual([{ name: "João Silva" }]);
    expect(matchingChats(chats, "")).toEqual([]);
  });

  it("normalizes accents", () => {
    expect(normalize("São João")).toBe("sao joao");
  });
});

describe("media, links and docs", () => {
  it("finds every link in a message, without trailing punctuation", () => {
    expect(extractLinks("Slides: https://moodle.pt/a, and www.novasbe.pt.")).toEqual([
      "https://moodle.pt/a",
      "www.novasbe.pt",
    ]);
    expect(extractLinks("no links here")).toEqual([]);
    expect(linkHref("www.novasbe.pt")).toBe("https://www.novasbe.pt");
    expect(linkHref("https://x.pt")).toBe("https://x.pt");
  });

  it("splits a chat into photos, documents and links, newest first", () => {
    const media = sharedMedia(all);
    expect(media.photos.map((m) => m.id)).toEqual(["3"]);
    expect(media.files.map((m) => m.id)).toEqual(["2"]);
    expect(media.links.map((l) => l.url)).toEqual(["https://moodle.novasbe.pt/course/42"]);
  });
});
