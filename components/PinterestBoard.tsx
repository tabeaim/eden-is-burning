"use client";

import { useEffect, useRef, useState } from "react";

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
// und öffentlichen Boards; sonst bleibt der Link stehen. Oben steht das
// Pinterest-Konto – der Weg zum Board. Das Aussehen (durchsichtiger Hintergrund,
// helle Schrift im Kopf) regelt `.pinterest-board` in globals.css.
export function PinterestBoard({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // Breite der Pin-Wand = Breite des Platzes (Pinterest rechnet daraus die Spalten)
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const measure = () => setWidth(Math.max(280, Math.floor(wrap.current?.clientWidth ?? 0)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!width) return;
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
  }, [url, width]);

  return (
    <div ref={wrap} className="w-full">
      {/* key: bei anderem Board oder anderer Breite den von Pinterest umgebauten Inhalt verwerfen */}
      {width > 0 && (
        <div ref={box} key={`${url}-${width}`} className="pinterest-board overflow-hidden rounded-lg">
          <a
            data-pin-do="embedBoard"
            data-pin-board-width={width}
            data-pin-scale-height="900"
            data-pin-scale-width={width < 520 ? 110 : 190}
            href={url}
          >
            Pinterest-Board
          </a>
        </div>
      )}
    </div>
  );
}
