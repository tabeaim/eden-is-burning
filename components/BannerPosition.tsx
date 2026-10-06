"use client";

import { bannerY, withBannerY } from "@/lib/headers";

// Regler unter der Vorschau eines Header-Bilds: schiebt den sichtbaren
// Ausschnitt nach oben oder unten (siehe `bannerStyle` in lib/headers.ts).
// `onCommit` meldet das Loslassen – für Formulare, die sofort speichern.
export function BannerPosition({
  url,
  onChange,
  onCommit,
}: {
  url: string;
  onChange: (url: string) => void;
  onCommit?: (url: string) => void;
}) {
  const commit = () => onCommit?.(url);
  return (
    <label className="mt-2 flex items-center gap-3 text-[0.8125rem] text-text-secondary">
      <span className="shrink-0">Ausschnitt</span>
      <span className="text-text-tertiary">oben</span>
      <input
        type="range"
        min={0}
        max={100}
        value={bannerY(url)}
        onChange={(e) => onChange(withBannerY(url, parseInt(e.target.value, 10)))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Bildausschnitt nach oben oder unten schieben"
        className="min-w-0 flex-1 accent-[var(--accent)]"
      />
      <span className="text-text-tertiary">unten</span>
    </label>
  );
}
