"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Character } from "@/lib/types";
import { resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { ContactList } from "./ContactList";
import { PhoneFrame } from "./PhoneFrame";
import { PhoneHome } from "./PhoneHome";

// Das Handy eines Charakters zum Ansehen (Charakterprofil): sein Look, sein
// Startbildschirm und seine Kontaktliste – ohne Funktionen und ohne Bearbeiten.
export function PhonePreview({ character }: { character: Character }) {
  const [view, setView] = useState<"home" | "contacts">("home");
  const burner = resolvePhone(character).burner;
  // Groß angezeigtes Profilbild eines Kontakts (Klick aufs Bild in der Kontaktliste)
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhoto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo]);
  return (
    <>
    {photo &&
      // außerhalb des verkleinerten Handys, damit das Bild die Seite füllt
      createPortal(
        <div
          onClick={() => setPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Profilbild von ${photo.name}`}
          className="fixed inset-0 z-[70] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl shadow-black/70" />
          <div className="text-[0.875rem] text-text-secondary">{photo.name}</div>
        </div>,
        document.body,
      )}
    <PhoneFrame owner={character.id} tone={view === "home" && !burner ? "home" : "app"} preview>
      {view === "home" ? (
        <PhoneHome character={character} readOnly onOpenContacts={() => setView("contacts")} />
      ) : (
        <>
          <div className="flex min-h-[52px] shrink-0 items-center gap-1.5 border-b border-border-subtle bg-bg-surface px-2 py-1.5">
            <button
              onClick={() => setView("home")}
              aria-label="Zurück"
              className="flex h-9 w-7 shrink-0 items-center justify-center text-accent"
            >
              <Icon name="chevron-right" size={22} className="rotate-180" />
            </button>
            <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">Kontakte</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ContactList owner={character} onAvatar={(src, c) => setPhoto({ src, name: c.name })} />
          </div>
        </>
      )}
    </PhoneFrame>
    </>
  );
}
