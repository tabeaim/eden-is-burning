"use client";

import { useSetPageMeta } from "@/lib/page-meta";

// Titel + Untertitel werden im globalen Banner-Header (AppShell) angezeigt.
// PageHeader meldet sie nur an den Context und rendert ggf. seitenspezifische
// Action-Buttons (children) rechtsbündig über dem Seiteninhalt.
export function PageHeader({
  title,
  subtitle,
  width,
  bannerImage,
  titleEvent,
  noBanner,
  children,
}: {
  title: string;
  subtitle?: string;
  // Tailwind max-w-Klasse des Seiten-Containers – damit der Banner-Titel auf
  // derselben Breite zentriert wird und bündig mit dem Inhalt startet.
  width?: string;
  bannerImage?: string; // überschreibt das Standard-Titelbild der Seite
  titleEvent?: string; // Titel anklickbar: Fenster-Ereignis, auf das die Seite hört
  noBanner?: boolean; // nur der Titel, kein Titelbild
  children?: React.ReactNode;
}) {
  useSetPageMeta(title, subtitle, bannerImage, width, undefined, undefined, undefined, titleEvent, undefined, noBanner);
  if (!children) return null;
  return <div className="flex justify-end -mt-1 mb-5">{children}</div>;
}
