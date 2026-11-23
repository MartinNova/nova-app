"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageTitle } from "@/components/providers/PageTitleProvider";
import { APP_SHORT_NAME } from "@/lib/config/app";
import { MAIN_NAV, labelForHref } from "@/lib/config/navigation";
import { AccountSwitcher } from "./AccountSwitcher";

/** Overview pages whose photo reaches up under the bar: the logo is white there. */
const PHOTO_PAGES = ["/study", "/campus", "/sport"];

/**
 * iOS-style navigation bar: "‹ Back" on the left, the small page title in the middle
 * once the large title has scrolled away, account on the right. Glass only when collapsed.
 */
export function Header() {
  const pathname = usePathname();
  const { pageTitle } = usePageTitle();
  const isHome = pathname === "/";
  // The logo sits top left on every main tab page (the others show "‹ Back" there).
  const showLogo = MAIN_NAV.some((item) => item.href === pathname);
  const collapsed = pageTitle !== null && !pageTitle.largeTitleVisible;
  // Over a page photo the bar is see-through and its buttons float as glass capsules (iOS 26).
  const overPhoto = Boolean(pageTitle?.immersive) && !collapsed;
  const capsule = overPhoto ? "glass rounded-full shadow-sm" : "";
  const backHref = pageTitle?.backHref;
  // White over the photo; black (white in dark mode) on plain pages and once the bar turns to glass.
  const whiteLogo = PHOTO_PAGES.includes(pathname) && !collapsed;
  // Main tab pages always show their own name in the middle; other pages show it once scrolled.
  const mainLabel = showLogo ? labelForHref(pathname) : null;
  const titleVisible = showLogo || collapsed;
  const centerTitle = mainLabel ?? pageTitle?.title;

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
      <div className="mx-auto grid h-12 max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
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
            showLogo && (
              <Link href="/" aria-label={APP_SHORT_NAME} className="flex items-center px-2">
                {/* Transparent black logo: `invert` turns it white (photos, dark mode). */}
                <Image
                  priority
                  src="/nova-logo.png"
                  alt="Nova School of Business & Economics"
                  width={572}
                  height={80}
                  className={`h-[22px] w-auto max-w-none shrink-0 ${whiteLogo ? "invert" : "dark:invert"}`}
                />
              </Link>
            )
          )}
        </div>

        <p
          aria-hidden={!titleVisible}
          // Takes no width until it shows, so the back label isn't cut short for long titles.
          className={`truncate text-[17px] font-semibold transition-opacity duration-200 ${
            whiteLogo ? "text-white drop-shadow-sm" : ""
          } ${titleVisible ? "max-w-[45vw] opacity-100" : "max-w-0 opacity-0"}`}
        >
          {centerTitle}
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
