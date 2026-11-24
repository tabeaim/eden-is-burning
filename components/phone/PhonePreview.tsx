"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";
import { resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { ContactList } from "./ContactList";
import { PhoneFrame } from "./PhoneFrame";
import { PhoneHome } from "./PhoneHome";

type View = "home" | "contacts" | "notizen" | "fotos";
const TITLES: Record<Exclude<View, "home">, string> = { contacts: "Kontakte", notizen: "Notizen", fotos: "Fotos" };

// Das Handy eines Charakters zum Ansehen (Charakterprofil, „Andere Handys"): sein
// Look, sein Startbildschirm, Kontakte, Notizen und Fotos – ohne Bearbeiten.
export function PhonePreview({ character }: { character: Character }) {
  const [view, setView] = useState<View>("home");
  const [note, setNote] = useState<string | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const burner = resolvePhone(character).burner;
  const notes = character.phone?.notes ?? [];
  const photos = character.phone?.photos ?? [];
  const openNote = notes.find((n) => n.id === note);

  const back = () => {
    if (note) setNote(null);
    else setView("home");
  };
  const empty = (text: string) => <p className="px-8 pt-16 text-center text-[0.875rem] text-text-tertiary">{text}</p>;

  return (
    <PhoneFrame owner={character.id} tone={view === "home" && !burner ? "home" : "app"} preview>
      {view === "home" ? (
        <PhoneHome
          character={character}
          readOnly
          onOpenContacts={() => setView("contacts")}
          onOpenApp={(key) => setView(key)}
        />
      ) : (
        <>
          <div className="flex min-h-[52px] shrink-0 items-center gap-1.5 border-b border-border-subtle bg-bg-surface px-2 py-1.5">
            <button onClick={back} aria-label="Zurück" className="flex h-9 w-7 shrink-0 items-center justify-center text-accent">
              <Icon name="chevron-right" size={22} className="rotate-180" />
            </button>
            <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">{TITLES[view]}</div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {view === "contacts" && <ContactList owner={character} />}

            {view === "notizen" &&
              (openNote ? (
                <div className="px-4 py-3">
                  <div className="text-[1.25rem] font-bold text-text-primary">{openNote.title || "Neue Notiz"}</div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-text-primary">
                    {openNote.text}
                  </p>
                </div>
              ) : notes.length === 0 ? (
                empty("Keine Notizen.")
              ) : (
                notes.map((n) => {
                  const lines = n.text.split("\n").filter((l) => l.trim());
                  return (
                    <button
                      key={n.id}
                      onClick={() => setNote(n.id)}
                      className="block w-full border-b border-border-subtle px-3 py-2.5 text-left hover:bg-white/[0.03]"
                    >
                      <span className="block truncate text-[0.9375rem] font-semibold text-text-primary">
                        {n.title.trim() || lines[0] || "Neue Notiz"}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-text-tertiary">
                        {(n.title.trim() ? lines[0] : lines[1]) || "Kein weiterer Text"}
                      </span>
                    </button>
                  );
                })
              ))}

            {view === "fotos" &&
              (photos.length === 0 ? (
                empty("Keine Fotos.")
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {photos.map((p, i) => (
                    <button key={p.id} onClick={() => setPhoto(i)} className="aspect-square bg-bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ))}
          </div>

          {/* Großansicht eines Fotos: ‹ › blättern, Bildunterschrift darunter */}
          {view === "fotos" && photo !== null && photos[photo] && (
            <div className="absolute inset-0 z-20 flex flex-col bg-black">
              <div className="flex shrink-0 items-center px-2 py-2">
                <button onClick={() => setPhoto(null)} className="flex items-center gap-0.5 text-[0.9375rem] text-accent">
                  <Icon name="chevron-right" size={22} className="rotate-180" />
                  Fotos
                </button>
                <span className="flex-1 text-center text-[0.8125rem] tabular-nums text-white/70">
                  {photo + 1} / {photos.length}
                </span>
                <span className="w-16" />
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[photo].url} alt="" className="max-h-full max-w-full object-contain" />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhoto((photo - 1 + photos.length) % photos.length)}
                      aria-label="Voriges Foto"
                      className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <Icon name="chevron-right" size={20} className="rotate-180" />
                    </button>
                    <button
                      onClick={() => setPhoto((photo + 1) % photos.length)}
                      aria-label="Nächstes Foto"
                      className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <Icon name="chevron-right" size={20} />
                    </button>
                  </>
                )}
              </div>
              {photos[photo].caption && (
                <p className="shrink-0 px-3 pb-3 pt-2 text-center text-[0.875rem] text-white/85">{photos[photo].caption}</p>
              )}
            </div>
          )}
        </>
      )}
    </PhoneFrame>
  );
}
