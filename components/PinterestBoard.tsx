"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

declare global {
  interface Window {
    PinUtils?: { build: (el?: Element) => void };
  }
}

const SCRIPT_ID = "pinterest-pinit";

// Bindet ein öffentliches Pinterest-Board direkt ein (Reiter „Moodboard"). Das
// macht Pinterests eigenes Einbett-Skript: Es ersetzt den Link unten durch die
// Pin-Wand. Geladen wird es erst, wenn der Reiter geöffnet ist – vorher geht
// nichts an Pinterest. Klappt nur mit Board-Adressen (pinterest.com/<name>/<board>/)
// und öffentlichen Boards; sonst bleibt der Link stehen.
export function PinterestBoard({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const build = () => window.PinUtils?.build(box.current ?? undefined);
    if (document.getElementById(SCRIPT_ID)) {
      build();
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = "https://assets.pinterest.com/js/pinit.js";
    script.setAttribute("data-pin-build", "doBuild");
    script.onload = build;
    document.body.appendChild(script);
  }, [url]);

  return (
    <div>
      {/* key: bei anderem Board den von Pinterest umgebauten Inhalt verwerfen */}
      <div ref={box} key={url} className="overflow-hidden rounded-lg">
        <a
          data-pin-do="embedBoard"
          data-pin-board-width="900"
          data-pin-scale-height="420"
          data-pin-scale-width="115"
          href={url}
        >
          Pinterest-Board
        </a>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
      >
        <Icon name="pinterest" size={14} /> Auf Pinterest öffnen
      </a>
    </div>
  );
}
