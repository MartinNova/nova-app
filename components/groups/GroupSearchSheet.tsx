"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { MessageSearchResults } from "@/components/messages/MessageSearch";
import { Sheet } from "@/components/timetable/Sheet";
import type { SearchItem } from "@/lib/messages/search";
import type { GroupMessage } from "@/types/groups";

interface GroupSearchSheetProps {
  groupId: string;
  groupName: string;
  messages: GroupMessage[];
  /** Full name, or "You". */
  senderName: (userId: string) => string;
  onClose: () => void;
}

/** "Search" in group info: messages and documents of this group; a hit opens the chat there. */
export function GroupSearchSheet({
  groupId,
  groupName,
  messages,
  senderName,
  onClose,
}: GroupSearchSheetProps) {
  const [query, setQuery] = useState("");
  // Each result is titled with who sent it (the group is the same for all of them).
  const items: SearchItem[] = messages.map((m) => ({
    ...m,
    chat: { kind: "direct", id: groupId, name: senderName(m.senderId) },
  }));

  return (
    <Sheet title="Search" subtitle={groupName} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search this group</span>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Messages and documents"
            className="bg-background focus-visible:outline-brand h-11 w-full rounded-xl pr-3 pl-9 text-base focus-visible:outline-2"
          />
        </label>
        {query.trim() ? (
          <MessageSearchResults
            query={query}
            filter="all"
            chats={[]}
            items={items}
            senderName={() => ""}
            hrefFor={(item) => `/friends/group?id=${groupId}&m=${item.id}`}
          />
        ) : (
          <p className="text-muted py-6 text-center text-sm">
            Type a word to find it in this group&apos;s messages and document names.
          </p>
        )}
      </div>
    </Sheet>
  );
}
