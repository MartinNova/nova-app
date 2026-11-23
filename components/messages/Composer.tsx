"use client";

import {
  Camera,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Reply,
  SendHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  FILE_ACCEPT,
  formatFileSize,
  MAX_DEMO_FILE_BYTES,
  MAX_FILE_BYTES,
  validateFile,
} from "@/lib/messages/attachments";
import { TYPING_IDLE_MS } from "@/lib/presence/presence";
import { resizePhoto } from "@/lib/rooms/photos";
import { AUTH_MODE } from "@/lib/supabase/config";
import { MAX_MESSAGE_LENGTH, type Attachment, type ListingRef } from "@/types/messages";
import { ListingThumb } from "./ListingCard";

/** Demo mode keeps attachments in the browser's small storage, so they are kept smaller there. */
const MAX_IMAGE_SIDE = AUTH_MODE === "accounts" ? 1600 : 1024;
const MAX_BYTES = AUTH_MODE === "accounts" ? MAX_FILE_BYTES : MAX_DEMO_FILE_BYTES;

/** What's waiting to be sent: a resized picture (with preview link) or a file. */
type Pending = { kind: "image"; blob: Blob; url: string } | { kind: "file"; file: File };

interface ComposerProps {
  placeholder: string;
  /** Throws to show an error; the draft is kept then. */
  onSend: (body: string, attachment?: Attachment) => Promise<void>;
  /** Called with true while you type and false once you stop or send ("typing…" for others). */
  onTyping?: (typing: boolean) => void;
  /** The message you're answering (shown above the field), like WhatsApp's reply. */
  replyTo?: { name: string; preview: string } | null;
  onCancelReply?: () => void;
  /** The room listing the next message is about (coming from "Message" on a listing). */
  listing?: ListingRef | null;
  onCancelListing?: () => void;
}

/** The attach menu, like WhatsApp: photo library, camera, or a document. */
const ATTACH_OPTIONS = [
  { id: "photos", label: "Photos", icon: ImageIcon, tile: "bg-[#0b6e78]" },
  { id: "camera", label: "Camera", icon: Camera, tile: "bg-[#0b2a4a]" },
  { id: "document", label: "Document", icon: FileText, tile: "bg-[#7b3fa0]" },
] as const;

/**
 * Message field with one paperclip (photos, camera, document), fixed to the bottom of the screen
 * (pages using it hide the tab bar, like WhatsApp and iMessage do in a chat).
 */
export function Composer({
  placeholder,
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  listing,
  onCancelListing,
}: ComposerProps) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // Choosing "Reply" puts the cursor in the field, ready to type.
  useEffect(() => {
    if (replyTo) field.current?.focus();
  }, [replyTo]);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onTypingRef = useRef(onTyping);
  useEffect(() => {
    onTypingRef.current = onTyping;
  });

  function stopTyping() {
    clearTimeout(typingTimer.current);
    onTypingRef.current?.(false);
  }

  function changeDraft(value: string) {
    setDraft(value);
    if (!value.trim()) return stopTyping();
    onTypingRef.current?.(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }

  // Leaving the chat stops "typing…".
  useEffect(() => stopTyping, []);

  // The menu closes with Escape or a tap anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  function choose(id: (typeof ATTACH_OPTIONS)[number]["id"]) {
    setMenuOpen(false);
    const input = { photos: imageInput, camera: cameraInput, document: fileInput }[id];
    input.current?.click();
  }

  // Free the preview's memory when it's replaced or removed.
  useEffect(
    () => (pending?.kind === "image" ? () => URL.revokeObjectURL(pending.url) : undefined),
    [pending],
  );

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same picture again still fires
    if (!file) return;
    setError(null);
    try {
      const blob = await resizePhoto(file, MAX_IMAGE_SIDE);
      setPending({ kind: "image", blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use this picture.");
    }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateFile(file, MAX_BYTES);
    setError(problem);
    if (!problem) setPending({ kind: "file", file });
  }

  const canSend = !sending && (Boolean(draft.trim()) || Boolean(pending));

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const attachment: Attachment | undefined =
        pending?.kind === "image"
          ? { kind: "image", blob: pending.blob }
          : pending?.kind === "file"
            ? { kind: "file", file: pending.file }
            : undefined;
      await onSend(draft, attachment);
      stopTyping();
      setDraft("");
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={send}
      className="glass fixed inset-x-0 bottom-0 z-20 border-x-0 border-b-0 pb-[calc(env(safe-area-inset-bottom)+8px)]"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 pt-2">
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        {listing && (
          <div className="bg-surface border-brand fade-in flex items-center gap-2.5 rounded-xl border-l-4 py-1.5 pr-1.5 pl-1.5">
            <ListingThumb listing={listing} />
            <span className="min-w-0 flex-1">
              <span className="text-brand block text-[13px] font-semibold">About this room</span>
              <span className="block truncate text-[13px] font-medium">{listing.title}</span>
              <span className="text-muted block truncate text-[13px]">{listing.subtitle}</span>
            </span>
            <button
              type="button"
              onClick={onCancelListing}
              aria-label="Don't attach the listing"
              className="text-muted hover:bg-border/60 flex size-8 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
        {replyTo && (
          <div className="bg-surface border-brand fade-in flex items-center gap-2 rounded-xl border-l-4 py-1.5 pr-1.5 pl-3">
            <Reply className="text-brand size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="text-brand block text-[13px] font-semibold">
                Replying to {replyTo.name}
              </span>
              <span className="text-muted block truncate text-[13px]">{replyTo.preview}</span>
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancel reply"
              className="text-muted hover:bg-border/60 flex size-8 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
        {pending && (
          <div className="relative w-fit max-w-full">
            {pending.kind === "image" ? (
              /* eslint-disable-next-line @next/next/no-img-element -- local preview */
              <img
                src={pending.url}
                alt="Picture to send"
                className="h-20 w-auto max-w-40 rounded-xl object-cover"
              />
            ) : (
              <span className="bg-surface flex min-w-0 items-center gap-2.5 rounded-xl py-2 pr-4 pl-2">
                <span className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <FileText className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    {pending.file.name}
                  </span>
                  <span className="text-muted block text-[13px]">
                    {formatFileSize(pending.file.size)}
                  </span>
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label={pending.kind === "image" ? "Remove picture" : "Remove file"}
              className="bg-foreground/80 text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1">
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            onChange={pickImage}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
          {/* On phones this opens the camera straight away; on computers it's a file picker. */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pickImage}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
          <input
            ref={fileInput}
            type="file"
            accept={FILE_ACCEPT}
            onChange={pickFile}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
          <div ref={menu} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Attach"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`text-brand flex size-11 items-center justify-center rounded-full transition active:scale-90 ${
                menuOpen ? "bg-brand/10" : ""
              }`}
            >
              <Paperclip
                className={`size-[22px] transition-transform duration-200 ${menuOpen ? "-rotate-45" : ""}`}
                aria-hidden
              />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Attach"
                className="menu-in bg-surface absolute bottom-full left-0 mb-3 w-56 overflow-hidden rounded-2xl shadow-[0_12px_40px_rgb(15_27_42/0.22)]"
              >
                {ATTACH_OPTIONS.map(({ id, label, icon: Icon, tile }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => choose(id)}
                    className="group active:bg-brand/5 flex w-full items-center gap-3 pl-3 text-left transition-colors"
                  >
                    <span
                      className={`${tile} flex size-8 shrink-0 items-center justify-center rounded-lg text-white`}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="border-border flex h-12 flex-1 items-center border-b text-[17px] group-last:border-b-0">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <textarea
            ref={field}
            id="message"
            value={draft}
            onChange={(e) => changeDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line (like WhatsApp Web).
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={placeholder}
            className="border-border bg-surface focus-visible:outline-brand mr-1 max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border px-4 py-2.5 text-base focus-visible:outline-2"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="bg-brand text-brand-foreground flex size-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40 disabled:active:scale-100"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </form>
  );
}
