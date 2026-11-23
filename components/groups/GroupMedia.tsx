"use client";

import { ChevronRight, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/timetable/Sheet";
import { formatFileSize } from "@/lib/messages/attachments";
import { formatMessageTime } from "@/lib/messages/messages";
import { linkHref, sharedMedia } from "@/lib/messages/search";
import type { GroupMessage } from "@/types/groups";

const TABS = { media: "Media", docs: "Docs", links: "Links" } as const;
type Tab = keyof typeof TABS;

interface GroupMediaProps {
  groupId: string;
  messages: GroupMessage[];
  /** "Anna", "You" … for the line under a document or link. */
  senderName: (userId: string) => string;
}

/**
 * "Media, links and docs" in group info, like WhatsApp: a row with the count and the latest
 * pictures; tapping it opens everything shared, sorted into Media, Docs and Links.
 */
export function GroupMedia({ groupId, messages, senderName }: GroupMediaProps) {
  const [tab, setTab] = useState<Tab | null>(null);
  const { photos, files, links } = sharedMedia(messages);
  const total = photos.length + files.length + links.length;
  const at = (m: GroupMessage) => `/friends/group?id=${groupId}&m=${m.id}`;
  const now = new Date();

  return (
    <>
      <button
        type="button"
        onClick={() => setTab(photos.length ? "media" : files.length ? "docs" : "links")}
        disabled={total === 0}
        className="bg-surface flex flex-col gap-3 rounded-3xl p-4 text-left transition active:scale-[0.99] disabled:active:scale-100"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-semibold">Media, links and docs</span>
          <span className="text-muted flex items-center gap-1 text-[15px] tabular-nums">
            {total}
            {total > 0 && <ChevronRight className="size-4" aria-hidden />}
          </span>
        </span>
        {total === 0 ? (
          <span className="text-muted text-sm">
            Pictures, documents and links sent here show up in this place.
          </span>
        ) : (
          <span className="grid grid-cols-4 gap-1.5">
            {[
              ...photos.map((m) => ({ key: m.id, photo: m.imageUrl, icon: null })),
              ...files.map((m) => ({ key: m.id, photo: null, icon: FileText })),
              ...links.map((l, i) => ({ key: `${l.item.id}-${i}`, photo: null, icon: Link2 })),
            ]
              .slice(0, 4)
              .map(({ key, photo, icon: Icon }) =>
                photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed/data URL thumbnail
                  <img
                    key={key}
                    src={photo}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ) : (
                  <span
                    key={key}
                    className="bg-brand/10 text-brand flex aspect-square items-center justify-center rounded-xl"
                  >
                    {Icon && <Icon className="size-6" aria-hidden />}
                  </span>
                ),
              )}
          </span>
        )}
      </button>

      {tab && (
        <Sheet title="Media, links and docs" onClose={() => setTab(null)}>
          <div role="tablist" className="bg-muted/10 mb-4 flex gap-1 rounded-xl p-1">
            {(Object.entries(TABS) as [Tab, string][]).map(([value, label]) => {
              const count = { media: photos, docs: files, links }[value].length;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`h-9 flex-1 rounded-lg text-sm font-medium transition ${
                    tab === value ? "bg-surface text-foreground shadow-sm" : "text-muted"
                  }`}
                >
                  {label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {tab === "media" &&
            (photos.length === 0 ? (
              <Empty text="No pictures yet." />
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {photos.map((m) => (
                  <Link key={m.id} href={at(m)} aria-label="Show in chat">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed/data URL */}
                    <img
                      src={m.imageUrl!}
                      alt=""
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  </Link>
                ))}
              </div>
            ))}

          {tab === "docs" &&
            (files.length === 0 ? (
              <Empty text="No documents yet." />
            ) : (
              <ul className="divide-border divide-y">
                {files.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <a
                      href={m.file!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={m.file!.name}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="bg-brand/10 text-brand flex size-11 shrink-0 items-center justify-center rounded-lg">
                        <FileText className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">
                          {m.file!.name}
                        </span>
                        <span className="text-muted block text-[13px]">
                          {formatFileSize(m.file!.size)} · {senderName(m.senderId)} ·{" "}
                          {formatMessageTime(m.createdAt, now)}
                        </span>
                      </span>
                    </a>
                    <ShowInChat href={at(m)} />
                  </li>
                ))}
              </ul>
            ))}

          {tab === "links" &&
            (links.length === 0 ? (
              <Empty text="No links yet." />
            ) : (
              <ul className="divide-border divide-y">
                {links.map(({ url, item }, i) => (
                  <li key={`${item.id}-${i}`} className="flex items-center gap-3 py-2.5">
                    <a
                      href={linkHref(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="bg-brand/10 text-brand flex size-11 shrink-0 items-center justify-center rounded-lg">
                        <Link2 className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-brand block truncate text-[15px] font-medium">
                          {url.replace(/^https?:\/\//i, "")}
                        </span>
                        <span className="text-muted block text-[13px]">
                          {senderName(item.senderId)} · {formatMessageTime(item.createdAt, now)}
                        </span>
                      </span>
                    </a>
                    <ShowInChat href={at(item)} />
                  </li>
                ))}
              </ul>
            ))}
        </Sheet>
      )}
    </>
  );
}

function ShowInChat({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-brand hover:bg-brand/5 shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium"
    >
      Show in chat
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted py-8 text-center text-sm">{text}</p>;
}
