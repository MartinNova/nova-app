/**
 * Searching all your chats at once (direct and groups), like WhatsApp's search in the chat list.
 * Pure functions: the inbox hands in the messages it already has.
 */
import type { MessageFile } from "@/types/messages";

/** Chips under the search field. "All" needs a search word; the others also list everything. */
export const SEARCH_FILTERS = {
  all: "All",
  files: "Documents",
  photos: "Photos",
  links: "Links",
} as const;
export type SearchFilter = keyof typeof SEARCH_FILTERS;

/** One message from any chat, with where it was sent. */
export interface SearchItem {
  id: string;
  chat: { kind: "direct" | "group"; id: string; name: string };
  senderId: string;
  body: string;
  imageUrl: string | null;
  file: MessageFile | null;
  createdAt: string;
}

/** A found message and the bit of text to show, split around the match for highlighting. */
export interface SearchHit {
  item: SearchItem;
  snippet: { before: string; match: string; after: string };
}

const LINK = /(https?:\/\/|www\.)\S+/i;

/** Lower case without accents, so "joao" finds "João" and "cafe" finds "Café". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesFilter(item: SearchItem, filter: SearchFilter): boolean {
  if (filter === "files") return Boolean(item.file);
  if (filter === "photos") return Boolean(item.imageUrl);
  if (filter === "links") return LINK.test(item.body);
  return true;
}

/**
 * Cuts `text` around the first match of `query` (about `around` characters on each side), so a
 * long message still shows the part that matched. Accent-free matching keeps the original text.
 */
export function snippetOf(text: string, query: string, around = 40): SearchHit["snippet"] {
  const flat = text.replace(/\s+/g, " ").trim();
  const q = normalize(query.trim());
  // NFD can change lengths, so find the match position letter by letter in the original.
  const at = q ? normalize(flat).indexOf(q) : -1;
  if (at < 0 || normalize(flat).length !== flat.length) {
    const short = flat.length > around * 2 ? `${flat.slice(0, around * 2)}…` : flat;
    return { before: short, match: "", after: "" };
  }
  const start = Math.max(0, at - around);
  const end = Math.min(flat.length, at + q.length + around);
  return {
    before: `${start > 0 ? "…" : ""}${flat.slice(start, at)}`,
    match: flat.slice(at, at + q.length),
    after: `${flat.slice(at + q.length, end)}${end < flat.length ? "…" : ""}`,
  };
}

/**
 * Messages whose text or file name contains the query, newest first.
 * With a filter chip and no query, lists all documents / photos / links.
 */
export function searchMessages(
  items: SearchItem[],
  query: string,
  filter: SearchFilter = "all",
): SearchHit[] {
  const q = normalize(query.trim());
  if (!q && filter === "all") return [];
  return items
    .filter((item) => matchesFilter(item, filter))
    .filter(
      (item) =>
        !q ||
        normalize(item.body).includes(q) ||
        (item.file !== null && normalize(item.file.name).includes(q)),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((item) => {
      const inBody = q && normalize(item.body).includes(q);
      const text = inBody || !item.file ? item.body : item.file.name;
      return { item, snippet: snippetOf(text || (item.imageUrl ? "Photo" : ""), q) };
    });
}

/** Chats whose name contains the query (shown above the messages, like WhatsApp). */
export function matchingChats<T extends { name: string }>(chats: T[], query: string): T[] {
  const q = normalize(query.trim());
  return q ? chats.filter((c) => normalize(c.name).includes(q)) : [];
}

const URLS = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** All links in a message, without trailing punctuation ("see https://x.pt." → "https://x.pt"). */
export function extractLinks(text: string): string[] {
  return (text.match(URLS) ?? []).map((url) => url.replace(/[.,;:!?)\]]+$/, ""));
}

/** "www.x.pt" needs a scheme to open as a link. */
export const linkHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** What a chat shared, newest first, for "Media, links and docs" (like WhatsApp). */
export function sharedMedia<T extends Pick<SearchItem, "body" | "imageUrl" | "file" | "createdAt">>(
  items: T[],
): { photos: T[]; files: T[]; links: { url: string; item: T }[] } {
  const newest = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    photos: newest.filter((m) => m.imageUrl),
    files: newest.filter((m) => m.file),
    links: newest.flatMap((item) => extractLinks(item.body).map((url) => ({ url, item }))),
  };
}
