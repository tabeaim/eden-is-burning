"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Profilbild, das sich per Klick groß zeigt (Handy, Drehbuch). Kein <button>,
// damit es auch in Zeilen funktioniert, die selbst schon Link oder Knopf sind.
export function PhotoZoom({
  src,
  name,
  children,
}: {
  src: string;
  name?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const show = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title="Profilbild vergrößern"
        aria-label={name ? `Profilbild von ${name} vergrößern` : "Profilbild vergrößern"}
        onClick={show}
        onKeyDown={(e) => e.key === "Enter" && show(e)}
        className="shrink-0 cursor-zoom-in rounded-full"
      >
        {children}
      </span>
      {open &&
        // außerhalb des (teils verkleinerten) Handys, damit das Bild die Seite füllt
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={name ? `Profilbild von ${name}` : "Profilbild"}
            className="fixed inset-0 z-[70] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/80 p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl shadow-black/70" />
            {name && <div className="text-[0.875rem] text-text-secondary">{name}</div>}
          </div>,
          document.body,
        )}
    </>
  );
}
