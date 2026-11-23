"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { validatePassword } from "@/lib/profile/profile-rules";
import { authService } from "@/lib/services/auth.service";
import { Section, fieldClass } from "./fields";

type Message = { tone: "good" | "bad"; text: string } | null;

function Feedback({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role={message.tone === "bad" ? "alert" : "status"}
      className={`text-sm ${message.tone === "good" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
    >
      {message.text}
    </p>
  );
}

/** E-mail, password, sign out and delete. Only shown for real accounts. */
export function AccountSection({ email }: { email: string }) {
  const router = useRouter();
  const { signOut, refresh } = useCurrentUser();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!authService) return null;
  const auth = authService;

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "good", text: success });
    } catch (err) {
      setMessage({
        tone: "bad",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Account" description={`Signed in as ${email}`}>
      <form
        className="grid grid-cols-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await auth.changeEmail(newEmail);
            setNewEmail("");
          }, "Check both inboxes: confirm the change with the link we sent.");
        }}
      >
        <label className="text-sm font-medium">
          New e-mail
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={fieldClass}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy} className="justify-self-start">
          Change e-mail
        </Button>
      </form>

      <form
        className="grid grid-cols-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const problem = validatePassword(newPassword);
          if (problem) return setMessage({ tone: "bad", text: problem });
          void run(async () => {
            await auth.changePassword(newPassword);
            setNewPassword("");
          }, "Password changed.");
        }}
      >
        <label className="text-sm font-medium">
          New password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy} className="justify-self-start">
          Change password
        </Button>
      </form>

      <Feedback message={message} />

      <div className="border-border flex flex-wrap gap-2 border-t pt-4">
        <Button
          variant="secondary"
          onClick={() =>
            void signOut().then(() => {
              router.push("/");
            })
          }
        >
          Sign out
        </Button>
        {confirmDelete ? (
          <>
            <Button
              disabled={busy}
              className="bg-red-600 text-white"
              onClick={() =>
                void run(async () => {
                  await auth.deleteAccount();
                  await refresh();
                  router.push("/");
                }, "Account deleted.")
              }
            >
              Yes, delete everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            className="text-red-700 dark:text-red-400"
            onClick={() => setConfirmDelete(true)}
          >
            Delete account
          </Button>
        )}
      </div>
      {confirmDelete && (
        <p className="text-muted text-sm">
          This deletes your login, profile and picture for good. It can&apos;t be undone.
        </p>
      )}
    </Section>
  );
}
