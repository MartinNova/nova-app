"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageTitle } from "@/components/providers/PageTitleProvider";
import { APP_SHORT_NAME } from "@/lib/config/app";
import { labelForHref } from "@/lib/config/navigation";
import { AccountSwitcher } from "./AccountSwitcher";

/**
 * iOS-style navigation bar: "‹ Back" on the left, the small page title in the middle
 * once the large title has scrolled away, account on the right. Glass only when collapsed.
 */
export function Header() {
  const pathname = usePathname();
  const { pageTitle } = usePageTitle();
  const isHome = pathname === "/";
  const collapsed = pageTitle !== null && !pageTitle.largeTitleVisible;
  // Over a page photo the bar is see-through and its buttons float as glass capsules (iOS 26).
  const overPhoto = Boolean(pageTitle?.immersive) && !collapsed;
  const capsule = overPhoto ? "glass rounded-full shadow-sm" : "";
  const backHref = pageTitle?.backHref;

  return (
    <header
      className={`sticky top-0 z-20 pt-[env(safe-area-inset-top)] transition-colors ${
        collapsed
          ? "glass border-x-0 border-t-0"
          : overPhoto
            ? "border-b border-transparent bg-transparent"
            : "bg-background border-b border-transparent"
      }`}
    >
      {/* Over a photo the capsules sit a little lower, so they float instead of touching the top edge.
          A transform, so the bar keeps its height and the photo underneath doesn't move. */}
      <div
        className={`mx-auto grid h-12 max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 transition-transform duration-200 ${overPhoto ? "translate-y-2" : ""}`}
      >
        <div className="flex min-w-0 items-center">
          {backHref ? (
            <Link
              href={backHref}
              className={`text-brand focus-visible:outline-brand flex min-w-0 items-center text-[17px] focus-visible:outline-2 active:opacity-60 ${overPhoto ? `${capsule} h-9 pr-3 pl-1` : "h-11 rounded-lg pr-2"}`}
            >
              <ChevronLeft className="size-7 shrink-0" strokeWidth={2.2} aria-hidden />
              <span className="truncate">{labelForHref(backHref)}</span>
            </Link>
          ) : (
            isHome && (
              <Link href="/" aria-label={APP_SHORT_NAME} className="flex items-center px-2">
                {/* White background blends away in light mode; inverted + screen in dark mode. */}
                <Image
                  priority
                  src="/nova-logo.png"
                  alt="Nova School of Business & Economics"
                  width={840}
                  height={160}
                  className="h-7 w-[147px] max-w-none shrink-0 mix-blend-multiply dark:mix-blend-screen dark:invert"
                />
              </Link>
            )
          )}
        </div>

        <p
          aria-hidden={!collapsed}
          // Takes no width until it shows, so the back label isn't cut short for long titles.
          className={`truncate text-[17px] font-semibold transition-opacity duration-200 ${
            collapsed ? "max-w-[45vw] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          {pageTitle?.title}
        </p>

        <div className="flex justify-end">
          <div
            className={`flex items-center transition-colors ${capsule} ${overPhoto ? "p-0.5 pl-1.5" : ""}`}
          >
            <AccountSwitcher compact={!isHome} />
          </div>
        </div>
      </div>
    </header>
  );
}
