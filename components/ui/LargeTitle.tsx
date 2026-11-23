"use client";

import { useEffect, useRef } from "react";
import { usePageTitle } from "@/components/providers/PageTitleProvider";

interface LargeTitleProps {
  title: string;
  backHref?: string;
  /** Small line above the title, e.g. today's date on the home page. */
  eyebrow?: string;
  /** Sits on a photo that reaches under the top bar (see HubHero). */
  immersive?: boolean;
  /** Only for screen readers: the tab bar already says which page this is. */
  hideTitle?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * iOS large title (34px bold). Tells the top bar about the page so it can show
 * "‹ Back" and, once this title scrolls away, the small centred title.
 */
export function LargeTitle({
  title,
  backHref,
  eyebrow,
  immersive,
  hideTitle = false,
  className = "mb-6",
  children,
}: LargeTitleProps) {
  const { setPageTitle } = usePageTitle();
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setPageTitle({ title, backHref, largeTitleVisible: true, immersive });
    const heading = ref.current;
    if (!heading || typeof IntersectionObserver === "undefined") return () => setPageTitle(null);

    // The top bar is 48px high; the title counts as gone once it is under it.
    const observer = new IntersectionObserver(
      ([entry]) =>
        setPageTitle({ title, backHref, largeTitleVisible: entry.isIntersecting, immersive }),
      { rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(heading);
    return () => {
      observer.disconnect();
      setPageTitle(null);
    };
  }, [title, backHref, immersive, setPageTitle]);

  return (
    <div className={className}>
      {eyebrow && (
        <p className="text-muted text-[13px] font-semibold tracking-wide uppercase">{eyebrow}</p>
      )}
      <h1
        ref={ref}
        className={hideTitle ? "sr-only" : "text-[34px] leading-[41px] font-bold tracking-tight"}
      >
        {title}
      </h1>
      {children}
    </div>
  );
}
