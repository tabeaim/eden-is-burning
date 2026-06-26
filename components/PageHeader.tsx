"use client";

import { useSetPageMeta } from "@/lib/page-meta";

// Titel + Untertitel werden im globalen Banner-Header (AppShell) angezeigt.
// PageHeader meldet sie nur an den Context und rendert ggf. seitenspezifische
// Action-Buttons (children) rechtsbündig über dem Seiteninhalt.
export function PageHeader({
  title,
  subtitle,
  width,
  children,
}: {
  title: string;
  subtitle?: string;
  // Tailwind max-w-Klasse des Seiten-Containers — damit der Banner-Titel auf
  // derselben Breite zentriert wird und bündig mit dem Inhalt startet.
  width?: string;
  children?: React.ReactNode;
}) {
  useSetPageMeta(title, subtitle, undefined, width);
  if (!children) return null;
  return <div className="flex justify-end -mt-1 mb-5">{children}</div>;
}
