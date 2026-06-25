"use client";

// Seitentitel/-untertitel fließen von der jeweiligen Seite (via PageHeader) in den
// globalen Banner-Header der AppShell. `path` stellt sicher, dass beim Navigieren
// nicht kurz der Titel der vorherigen Seite stehen bleibt.

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type PageMeta = { title: string; subtitle?: string; path?: string };

type Ctx = { meta: PageMeta; setMeta: (m: PageMeta) => void };
const PageMetaCtx = createContext<Ctx | null>(null);

export function PageMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: "" });
  return <PageMetaCtx.Provider value={{ meta, setMeta }}>{children}</PageMetaCtx.Provider>;
}

export function usePageMeta(): PageMeta {
  return useContext(PageMetaCtx)?.meta ?? { title: "" };
}

export function useSetPageMeta(title: string, subtitle?: string) {
  const setMeta = useContext(PageMetaCtx)?.setMeta;
  const pathname = usePathname();
  useEffect(() => {
    setMeta?.({ title, subtitle, path: pathname });
  }, [setMeta, title, subtitle, pathname]);
}
