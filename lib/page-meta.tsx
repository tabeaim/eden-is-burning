"use client";

// Seitentitel/-untertitel fließen von der jeweiligen Seite (via PageHeader) in den
// globalen Banner-Header der AppShell. `path` stellt sicher, dass beim Navigieren
// nicht kurz der Titel der vorherigen Seite stehen bleibt.

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type PageMeta = {
  title: string;
  subtitle?: string;
  statusBadge?: "active" | "closed"; // optionaler Status-Badge hinter dem Untertitel
  path?: string;
  bannerImage?: string; // überschreibt den Seed-Banner (z.B. Szenen-Header)
  width?: string; // Tailwind max-w-Klasse der Seite — Banner-Titel nutzt dieselbe
};

type Ctx = { meta: PageMeta; setMeta: (m: PageMeta) => void };
const PageMetaCtx = createContext<Ctx | null>(null);

export function PageMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: "" });
  return <PageMetaCtx.Provider value={{ meta, setMeta }}>{children}</PageMetaCtx.Provider>;
}

export function usePageMeta(): PageMeta {
  return useContext(PageMetaCtx)?.meta ?? { title: "" };
}

export function useSetPageMeta(
  title: string,
  subtitle?: string,
  bannerImage?: string,
  width?: string,
  statusBadge?: "active" | "closed",
) {
  const setMeta = useContext(PageMetaCtx)?.setMeta;
  const pathname = usePathname();
  useEffect(() => {
    setMeta?.({ title, subtitle, statusBadge, path: pathname, bannerImage, width });
  }, [setMeta, title, subtitle, statusBadge, bannerImage, width, pathname]);
}
