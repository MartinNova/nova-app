"use client";

import { ImageOff, LogOut, Pencil, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { usePresence } from "@/components/providers/PresenceProvider";
import { Sheet } from "@/components/timetable/Sheet";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAdmin } from "@/lib/groups/groups";
import { groupService } from "@/lib/services/group.service";
import {
  MAX_GROUP_DESCRIPTION_LENGTH,
  MAX_GROUP_NAME_LENGTH,
  type GroupMember,
  type GroupMessage,
} from "@/types/groups";
import type { User } from "@/types/user";
import { GroupAvatar } from "./GroupAvatar";
import { GroupMedia } from "./GroupMedia";
import { GroupPhotoPicker } from "./GroupPhotoPicker";
import { useFriendIds } from "@/components/friends/useFriendships";
import { GroupSearchSheet } from "./GroupSearchSheet";
import { fullName, MemberPicker } from "./MemberPicker";
import { useGroup } from "./useGroup";

const ROW =
  "active:bg-brand/5 flex min-h-14 w-full items-center gap-3 pl-4 text-left transition-colors";
const ROW_INNER =
  "border-border flex min-h-14 flex-1 items-center gap-3 border-b pr-4 group-last:border-b-0";
const SHEET_ACTION =
  "bg-background active:bg-brand/10 flex h-12 w-full items-center justify-center rounded-2xl text-[17px] font-medium transition";

/**
 * Group info (?id=…) like WhatsApp's: picture, name, description, search, media/links/docs,
 * members and admin actions.
 */
export function GroupInfoView() {
  const groupId = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { user, users, ready } = useCurrentUser();
  const { presence } = usePresence();
  const friends = useFriendIds();
  const toast = useToast();
  const { group, reload } = useGroup(groupId, user?.id);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [chat, setChat] = useState<{ groupId: string; messages: GroupMessage[] } | null>(null);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [adding, setAdding] = useState<string[] | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backHref = `/friends/group?id=${groupId}`;

  // The group's messages, for "Media, links and docs" and search.
  const memberId = group ? user?.id : undefined;
  useEffect(() => {
    if (!memberId || !groupId) return;
    let cancelled = false;
    groupService
      .listMessages(groupId)
      .catch(() => [])
      .then((messages) => !cancelled && setChat({ groupId, messages }));
    return () => {
      cancelled = true;
    };
  }, [groupId, memberId]);
  const messages = chat?.groupId === groupId ? chat.messages : [];

  if (!ready || (user && group === undefined)) {
    return <div className="bg-border mt-14 h-64 animate-pulse rounded-2xl" />;
  }
  if (!user || !group) {
    return (
      <>
        <PageHeader title="Group info" backHref="/friends/messages" />
        <Card className="text-center">
          <p className="font-semibold">You&apos;re not in this group</p>
          <p className="text-muted mt-1 text-sm">You left, were removed, or it was deleted.</p>
        </Card>
      </>
    );
  }

  const me = user;
  const admin = isAdmin(group, me.id);
  const userById = (id: string) => users.find((u) => u.id === id);
  const memberName = (id: string) => {
    const u = userById(id);
    return u ? fullName(u) : "Former member";
  };
  // Admins first, then by name; you at the top of your group (like WhatsApp).
  const members = [...group.members].sort(
    (a, b) =>
      Number(b.userId === me.id) - Number(a.userId === me.id) ||
      Number(b.role === "admin") - Number(a.role === "admin") ||
      memberName(a.userId).localeCompare(memberName(b.userId)),
  );
  // Anyone on the app can be added; your friends are listed first.
  const notInGroup = users.filter((u) => !group.members.some((m) => m.userId === u.id));

  /** Runs a change, shows errors, and refreshes. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (editingName === null) return;
    if (await run(() => groupService.updateGroup(group!.id, { name: editingName })))
      setEditingName(null);
  }

  async function saveDescription(e: React.FormEvent) {
    e.preventDefault();
    if (editingDescription === null) return;
    const description = editingDescription;
    if (await run(() => groupService.updateGroup(group!.id, { description })))
      setEditingDescription(null);
  }

  const creator = userById(group.createdBy);
  const createdLine = `Created by ${group.createdBy === me.id ? "you" : creator ? fullName(creator) : "a former member"}, ${new Date(
    group.createdAt,
  ).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  async function leave() {
    if (await run(() => groupService.removeMember(group!.id, me.id))) {
      router.replace("/friends/messages");
    }
  }

  const selectedUser: User | undefined = selectedMember
    ? userById(selectedMember.userId)
    : undefined;

  return (
    <>
      <PageHeader title="Group info" backHref={backHref} />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col items-center gap-3 py-6 text-center">
          {admin ? (
            <GroupPhotoPicker
              name={group.name}
              photoUrl={group.photoUrl}
              size={112}
              onPick={(photo) => void run(() => groupService.updateGroup(group.id, { photo }))}
              onError={setError}
            />
          ) : (
            <GroupAvatar name={group.name} photoUrl={group.photoUrl} size={112} />
          )}

          {editingName !== null ? (
            <form onSubmit={saveName} className="flex w-full max-w-sm items-center gap-2">
              <label className="sr-only" htmlFor="group-name">
                Group name
              </label>
              <input
                id="group-name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                maxLength={MAX_GROUP_NAME_LENGTH}
                autoFocus
                className="border-border bg-background focus-visible:outline-brand h-11 min-w-0 flex-1 rounded-xl border px-3 text-base focus-visible:outline-2"
              />
              <button
                type="submit"
                disabled={busy}
                className="bg-brand text-brand-foreground h-11 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-60"
              >
                Save
              </button>
            </form>
          ) : (
            <div>
              <h2 className="text-[24px] leading-7 font-bold">{group.name}</h2>
              <p className="text-muted mt-1 text-[15px]">
                Group · {group.members.length} member{group.members.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {/* Action tiles like WhatsApp: search for everyone; name, people, picture for admins. */}
          {editingName === null && (
            <div className="mt-1 flex w-full max-w-md gap-2">
              {[
                { label: "Search", icon: Search, run: () => setSearching(true), show: true },
                { label: "Add people", icon: UserPlus, run: () => setAdding([]), show: admin },
                {
                  label: "Edit name",
                  icon: Pencil,
                  run: () => setEditingName(group.name),
                  show: admin,
                },
                {
                  label: "Remove picture",
                  icon: ImageOff,
                  run: () => void run(() => groupService.updateGroup(group.id, { photo: null })),
                  show: admin && Boolean(group.photoUrl),
                },
              ]
                .filter((a) => a.show)
                .map(({ label, icon: Icon, run: action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="bg-background text-brand focus-visible:outline-brand flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[13px] font-semibold transition focus-visible:outline-2 active:scale-95"
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </button>
                ))}
            </div>
          )}
        </Card>

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Description, like WhatsApp: admins write it; everyone sees it and who made the group. */}
        <section className="bg-surface flex flex-col gap-2 rounded-3xl p-4">
          {editingDescription !== null ? (
            <form onSubmit={saveDescription} className="flex flex-col gap-2">
              <label htmlFor="group-description" className="text-[15px] font-semibold">
                Group description
              </label>
              <textarea
                id="group-description"
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                maxLength={MAX_GROUP_DESCRIPTION_LENGTH}
                rows={4}
                autoFocus
                placeholder="What is this group for? E.g. meeting times, rules, links."
                className="border-border bg-background focus-visible:outline-brand w-full rounded-xl border px-3 py-2 text-base focus-visible:outline-2"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted text-xs tabular-nums">
                  {editingDescription.length}/{MAX_GROUP_DESCRIPTION_LENGTH}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDescription(null)}
                    className="text-muted h-10 rounded-xl px-3 text-[15px] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-brand text-brand-foreground h-10 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-60"
                  >
                    Save
                  </button>
                </span>
              </div>
            </form>
          ) : group.description ? (
            <>
              <p className="text-[15px] break-words whitespace-pre-line">{group.description}</p>
              {admin && (
                <button
                  type="button"
                  onClick={() => setEditingDescription(group.description)}
                  className="text-brand self-start text-[15px] font-medium"
                >
                  Edit description
                </button>
              )}
            </>
          ) : admin ? (
            <button
              type="button"
              onClick={() => setEditingDescription("")}
              className="text-brand self-start text-[15px] font-medium"
            >
              Add group description
            </button>
          ) : (
            <p className="text-muted text-[15px]">No description yet.</p>
          )}
          {editingDescription === null && <p className="text-muted text-[13px]">{createdLine}</p>}
        </section>

        <GroupMedia
          groupId={group.id}
          messages={messages}
          senderName={(id) => (id === me.id ? "You" : memberName(id))}
        />

        <section className="flex flex-col gap-2">
          <h2 className="mx-1 text-[22px] leading-7 font-bold">
            {group.members.length} member{group.members.length === 1 ? "" : "s"}
          </h2>
          <ul className="bg-surface overflow-hidden rounded-3xl">
            {members.map((m) => {
              const u = userById(m.userId);
              const isMe = m.userId === me.id;
              return (
                <li key={m.userId} className="group">
                  <button
                    type="button"
                    onClick={() => !isMe && setSelectedMember(m)}
                    disabled={isMe}
                    className={`${ROW} disabled:active:bg-transparent`}
                  >
                    <Avatar
                      firstName={u?.firstName ?? "?"}
                      lastName={u?.lastName ?? ""}
                      username={u?.username}
                      url={u?.avatarUrl}
                      size={40}
                      online={!isMe && presence.online.has(m.userId)}
                    />
                    <span className={ROW_INNER}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px]">
                          {isMe ? "You" : memberName(m.userId)}
                        </span>
                        {u?.username && (
                          <span className="text-muted block truncate text-[13px]">
                            @{u.username}
                          </span>
                        )}
                      </span>
                      {m.role === "admin" && (
                        <span className="bg-brand/10 text-brand shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold">
                          Admin
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="bg-surface flex min-h-14 items-center gap-3 rounded-3xl px-4 text-[17px] font-medium text-red-700 transition active:bg-red-50 dark:text-red-400 dark:active:bg-red-950"
        >
          <LogOut className="size-5" aria-hidden />
          Leave group
        </button>
      </div>

      {selectedMember && (
        <Sheet
          title={memberName(selectedMember.userId)}
          subtitle={selectedMember.role === "admin" ? "Group admin" : "Member"}
          onClose={() => setSelectedMember(null)}
        >
          <div className="flex flex-col gap-2">
            {selectedUser?.username && (
              <Link href={`/friends/chat?u=${selectedUser.username}`} className={SHEET_ACTION}>
                Message {selectedUser.firstName || memberName(selectedMember.userId)}
              </Link>
            )}
            {selectedUser?.username && (
              <Link href={`/friends/profile?u=${selectedUser.username}`} className={SHEET_ACTION}>
                View profile
              </Link>
            )}
            {admin && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await run(() =>
                    groupService.setAdmin(
                      group.id,
                      selectedMember.userId,
                      selectedMember.role !== "admin",
                    ),
                  );
                  if (ok) setSelectedMember(null);
                }}
                className={`${SHEET_ACTION} text-brand`}
              >
                {selectedMember.role === "admin" ? "Dismiss as admin" : "Make group admin"}
              </button>
            )}
            {admin && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await run(() =>
                    groupService.removeMember(group.id, selectedMember.userId),
                  );
                  if (ok) setSelectedMember(null);
                }}
                className={`${SHEET_ACTION} text-red-700 dark:text-red-400`}
              >
                Remove from group
              </button>
            )}
          </div>
        </Sheet>
      )}

      {adding && admin && (
        <Sheet title="Add people" onClose={() => setAdding(null)}>
          <div className="flex flex-col gap-4">
            <MemberPicker
              people={notInGroup}
              friendIds={friends}
              selected={adding}
              onChange={setAdding}
              emptyText="Everyone on the app is already in this group."
            />
            <button
              type="button"
              disabled={busy || adding.length === 0}
              onClick={async () => {
                const ok = await run(() => groupService.addMembers(group.id, adding));
                if (!ok) return;
                toast(
                  `Added ${adding.length} ${adding.length === 1 ? "person" : "people"} to the group`,
                );
                setAdding(null);
              }}
              className="bg-brand text-brand-foreground h-12 rounded-2xl text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              {adding.length > 0
                ? `Add ${adding.length} ${adding.length === 1 ? "person" : "people"}`
                : "Add"}
            </button>
          </div>
        </Sheet>
      )}

      {searching && (
        <GroupSearchSheet
          groupId={group.id}
          groupName={group.name}
          messages={messages}
          senderName={(id) => (id === me.id ? "You" : memberName(id))}
          onClose={() => setSearching(false)}
        />
      )}

      {confirmLeave && (
        <Sheet
          title={`Leave "${group.name}"?`}
          subtitle={
            admin && group.members.filter((m) => m.role === "admin").length === 1
              ? "You're the only admin. The longest member becomes admin."
              : "You won't get its messages anymore."
          }
          onClose={() => setConfirmLeave(false)}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void leave()}
              className={`${SHEET_ACTION} text-red-700 dark:text-red-400`}
            >
              Leave group
            </button>
            <button type="button" onClick={() => setConfirmLeave(false)} className={SHEET_ACTION}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
