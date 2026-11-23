"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/components/providers/PageTitleProvider";
import { APP_SHORT_NAME } from "@/lib/config/app";
import { MAIN_NAV, labelForHref } from "@/lib/config/navigation";
import { AccountSwitcher } from "./AccountSwitcher";

/** Overview pages whose photo reaches up under the bar: the logo is white there. */
const PHOTO_PAGES = ["/study", "/campus", "/sport"];

/**
 * iOS-style navigation bar: "‹ Back" on the left, the small page title in the middle
 * once the large title has scrolled away, account on the right. Glass once the page is scrolled.
 */
export function Header() {
  const pathname = usePathname();
  const { pageTitle } = usePageTitle();
  const isHome = pathname === "/";
  // The logo sits top left on every main tab page (the others show "‹ Back" there).
  const showLogo = MAIN_NAV.some((item) => item.href === pathname);
  const collapsed = pageTitle !== null && !pageTitle.largeTitleVisible;
  // As soon as the page is scrolled a little the bar turns to glass (also on short pages
  // where the large title never fully scrolls away).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);
  const glass = collapsed || scrolled;
  // Over a page photo the bar is see-through and its buttons float as glass capsules (iOS 26).
  const overPhoto = Boolean(pageTitle?.immersive) && !glass;
  const capsule = overPhoto ? "glass rounded-full shadow-sm" : "";
  const backHref = pageTitle?.backHref;
  // White over the photo; black (white in dark mode) on plain pages and once the bar turns to glass.
  const whiteLogo = PHOTO_PAGES.includes(pathname) && !glass;
  // The home artwork is light (cream), so over it the logo stays black, also in dark mode.
  const overLightArt = pathname === "/" && overPhoto;
  // The small title in the middle shows only once the page's large title has scrolled away;
  // at the top of a page (also the main tabs: Study, Campus, Sport, Friends) the bar stays clear.
  const titleVisible = collapsed && !overLightArt;
  const centerTitle = pageTitle?.title ?? (showLogo ? labelForHref(pathname) : null);

  return (
    <header
      className={`sticky top-0 z-20 pt-[env(safe-area-inset-top)] transition-colors ${
        glass
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
            showLogo && (
              <Link href="/" aria-label={APP_SHORT_NAME} className="flex items-center px-2">
                {/* Transparent black logo: `invert` turns it white (photos, dark mode). */}
                <Image
                  priority
                  src="/nova-logo.png"
                  alt="Nova School of Business & Economics"
                  width={572}
                  height={80}
                  className={`h-[22px] w-auto max-w-none shrink-0 ${whiteLogo ? "invert" : overLightArt ? "" : "dark:invert"}`}
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
