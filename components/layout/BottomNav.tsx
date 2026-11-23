"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFriendRequestCount } from "@/components/friends/useFriendships";
import { useUnreadMessages } from "@/components/messages/useUnreadMessages";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { MAIN_NAV, isActive } from "@/lib/config/navigation";

/** Full-screen pages with their own bottom bar (a chat's message field): no tab bar there. */
const HIDDEN_ON = ["/friends/chat", "/friends/group"];

/**
 * Floating glass tab bar (modern iOS). Content scrolls underneath; a soft fade
 * keeps text from running straight into the bar. Items come from lib/config/navigation.ts.
 * Home is the centre tab: a slightly larger navy circle, still inside the bar
 * (no floating button sticking out), so the bar keeps one height and one tap row.
 */
export function BottomNav() {
  const pathname = usePathname();
  // Friends tab badge: unread messages plus friend requests waiting for an answer.
  const unread = useUnreadMessages();
  const requests = useFriendRequestCount();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <>
      <div
        aria-hidden
        className="from-background pointer-events-none fixed inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t to-transparent"
      />
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 mx-auto max-w-md"
      >
        <ul className="glass flex h-16 rounded-full p-1 shadow-[0_10px_30px_rgb(15_27_42/0.14)]">
          {MAIN_NAV.map(({ href, label, icon: Icon, alsoActiveFor }) => {
            const active = isActive(pathname, href, alsoActiveFor);
            if (href === "/") {
              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={`focus-visible:outline-brand flex size-[52px] items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90 ${
                      active
                        ? "bg-brand text-brand-foreground shadow-[0_6px_16px_rgb(11_42_74/0.35)]"
                        : "bg-brand/10 text-brand hover:bg-brand/15"
                    }`}
                  >
                    <Icon className="size-7" strokeWidth={active ? 2.3 : 2} aria-hidden />
                  </Link>
                </li>
              );
            }
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-visible:outline-brand flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition focus-visible:outline-2 active:scale-95 ${
                    active
                      ? "bg-brand/10 text-brand font-semibold"
                      : "text-foreground/75 hover:text-foreground font-medium"
                  }`}
                >
                  <span className="relative">
                    <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {href === "/friends" && (
                      <UnreadBadge count={unread + requests} className="ring-0" />
                    )}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
