"use client";

import { createContext, useContext, useState } from "react";

/**
 * What the top bar shows for the current page (iOS navigation bar):
 * a "‹ Back" button, and the small title once the large title has scrolled away.
 * Pages set it through <PageHeader> or <Greeting>; nothing else needs to touch it.
 */
export interface PageTitle {
  title: string;
  backHref?: string;
  /** False once the page's large title has scrolled under the top bar. */
  largeTitleVisible: boolean;
  /** The page starts with a photo under the top bar (HubHero): bar see-through until scrolled. */
  immersive?: boolean;
}

type Setter = (title: PageTitle | null) => void;

const PageTitleContext = createContext<{ pageTitle: PageTitle | null; setPageTitle: Setter }>({
  pageTitle: null,
  setPageTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [pageTitle, setPageTitle] = useState<PageTitle | null>(null);
  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
