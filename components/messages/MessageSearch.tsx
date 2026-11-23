"use client";

import { FileText, Link2, Search, X } from "lucide-react";
import Link from "next/link";
import { formatMessageTime } from "@/lib/messages/messages";
import {
  SEARCH_FILTERS,
  matchingChats,
  searchMessages,
  type SearchFilter,
  type SearchItem,
} from "@/lib/messages/search";

/** A chat that can show up under "Chats" in the results. */
export interface SearchChat {
  key: string;
  href: string;
  name: string;
  avatar: React.ReactNode;
}

interface SearchBarProps {
  query: string;
  filter: SearchFilter;
  onQuery: (query: string) => void;
  onFilter: (filter: SearchFilter) => void;
}

/** Search field over all chats, with filter chips (All, Documents, Photos, Links). */
export function MessageSearchBar({ query, filter, onQuery, onFilter }: SearchBarProps) {
  const active = Boolean(query) || filter !== "all";
  return (
    <div className="flex flex-col gap-2">
      <label className="relative block">
        <span className="sr-only">Search messages and documents</span>
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search messages and documents"
          className="bg-surface focus-visible:outline-brand h-10 w-full rounded-xl pr-9 pl-9 text-base focus-visible:outline-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {active && (
          <button
            type="button"
            onClick={() => {
              onQuery("");
              onFilter("all");
            }}
            aria-label="Clear search"
            className="text-muted hover:bg-border/60 absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </label>
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show only">
        {(Object.entries(SEARCH_FILTERS) as [SearchFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => onFilter(value)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors ${
              filter === value
                ? "bg-brand text-brand-foreground"
                : "bg-surface text-foreground hover:bg-brand/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ResultsProps {
  query: string;
  filter: SearchFilter;
  chats: SearchChat[];
  items: SearchItem[];
  /** "You", "Sofia" … */
  senderName: (userId: string) => string;
  /** Link that opens the chat at this message. */
  hrefFor: (item: SearchItem) => string;
}

/** "Chats" whose name matches, then "Messages" from every chat, newest first. */
export function MessageSearchResults({
  query,
  filter,
  chats,
  items,
  senderName,
  hrefFor,
}: ResultsProps) {
  const foundChats = filter === "all" ? matchingChats(chats, query) : [];
  const hits = searchMessages(items, query, filter);
  const now = new Date();

  if (foundChats.length === 0 && hits.length === 0) {
    return (
      <p className="text-muted py-10 text-center text-sm">
        {query.trim()
          ? `No chats or messages with “${query.trim()}”.`
          : `No ${SEARCH_FILTERS[filter].toLowerCase()} in your chats yet.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {foundChats.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-muted px-4 text-[13px]">Chats</h2>
          <ul className="bg-surface overflow-hidden rounded-3xl">
            {foundChats.map((chat) => (
              <li key={chat.key} className="group">
                <Link
                  href={chat.href}
                  className="active:bg-brand/5 flex items-center gap-3 pl-3 transition-colors"
                >
                  {chat.avatar}
                  <span className="border-border flex min-h-16 min-w-0 flex-1 items-center border-b pr-4 group-last:border-b-0">
                    <span className="truncate text-[17px] font-semibold">{chat.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hits.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-muted px-4 text-[13px]">
            {filter === "all" ? "Messages" : SEARCH_FILTERS[filter]} · {hits.length}
          </h2>
          <ul className="bg-surface overflow-hidden rounded-3xl">
            {hits.map(({ item, snippet }) => (
              <li key={`${item.chat.kind}:${item.id}`} className="group">
                <Link
                  href={hrefFor(item)}
                  className="active:bg-brand/5 flex items-center gap-3 px-4 transition-colors"
                >
                  <span className="border-border flex min-w-0 flex-1 items-center gap-3 border-b py-3 group-last:border-b-0">
                    <Thumb item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">{item.chat.name}</span>
                        <span className="text-muted shrink-0 text-xs">
                          {formatMessageTime(item.createdAt, now)}
                        </span>
                      </span>
                      <span className="text-muted line-clamp-2 text-[15px]">
                        {item.chat.kind === "group" || senderName(item.senderId) === "You"
                          ? `${senderName(item.senderId)}: `
                          : ""}
                        {snippet.before}
                        {snippet.match && (
                          <mark className="bg-brand/15 text-foreground rounded-sm px-0.5 font-medium">
                            {snippet.match}
                          </mark>
                        )}
                        {snippet.after}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Picture, document or link icon in front of a result (plain text gets none). */
function Thumb({ item }: { item: SearchItem }) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed/data URL thumbnail
      <img src={item.imageUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
    );
  }
  const Icon = item.file ? FileText : /(https?:\/\/|www\.)/i.test(item.body) ? Link2 : null;
  if (!Icon) return null;
  return (
    <span className="bg-brand/10 text-brand flex size-11 shrink-0 items-center justify-center rounded-lg">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
