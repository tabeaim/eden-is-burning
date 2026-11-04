"use client";

import { useState } from "react";
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
  return (
    <>
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
            <ContactList owner={character} />
          </div>
        </>
      )}
    </PhoneFrame>
    </>
  );
}
