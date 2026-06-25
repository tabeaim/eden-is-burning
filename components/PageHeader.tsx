"use client";

import { useSetPageMeta } from "@/lib/page-meta";

// Titel + Untertitel werden im globalen Banner-Header (AppShell) angezeigt.
// PageHeader meldet sie nur an den Context und rendert ggf. seitenspezifische
// Action-Buttons (children) rechtsbündig über dem Seiteninhalt.
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  useSetPageMeta(title, subtitle);
  if (!children) return null;
  return <div className="flex justify-end -mt-1 mb-5">{children}</div>;
}
