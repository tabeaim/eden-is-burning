"use client";

import Link from "next/link";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { AppIcon, CAPTIC_BG, CapticGlyph, MESSENGER_BG, MessengerGlyph } from "./AppIcon";

// Ein Ziel auf dem Handy: echter Link; in der Vorschau nur Deko bzw. ein Knopf
function Go({
  readOnly,
  href,
  onClick,
  className,
  children,
}: {
  readOnly: boolean;
  href: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!readOnly) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return onClick ? (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ) : (
    <span aria-hidden className={className}>
      {children}
    </span>
  );
}

// Inhalt des Startbildschirms (gehört in einen `PhoneFrame`): angedeutete Apps und
// unten im Dock die echten – Telefon, Kontakte, Nachrichten und (wenn aktiviert)
// Captic. Beim Burner Phone stattdessen das Menü eines Tastenhandys.
// `readOnly` (Charakterprofil): nichts führt irgendwohin, nur die Kontakte lassen
// sich über `onOpenContacts` ansehen.
export function PhoneHome({
  character,
  readOnly = false,
  onOpenContacts,
}: {
  character: Character;
  readOnly?: boolean;
  onOpenContacts?: () => void;
}) {
  const { chats, calls, isChatNew } = useStore();
  const phone = resolvePhone(character);
  const unread = readOnly
    ? 0
    : chats.filter((c) => c.participant_ids.includes(character.id) && isChatNew(c.id)).length;
  const ringing = readOnly
    ? 0
    : calls.filter((c) => c.status === "ringing" && c.callee_id === character.id).length;

  if (phone.burner) {
    const item = "flex items-center justify-between px-3 py-3 text-left text-[1rem] font-bold text-text-primary";
    return (
      <div className="flex flex-1 flex-col px-3 py-3">
        <div className="border-b-2 border-border-strong pb-1 text-center text-[0.875rem] font-bold uppercase tracking-widest text-text-primary">
          Menü
        </div>
        <Go readOnly={readOnly} href="/handy/nachrichten" className={`${item} mt-3 bg-accent !text-black`}>
          <span>✉ Nachrichten</span>
          <span>{unread > 0 ? `${unread} neu` : "›"}</span>
        </Go>
        <Go readOnly={readOnly} href="/handy/telefon" className={item}>
          <span>☎ Anrufliste</span>
          <span>{ringing > 0 ? `${ringing} klingelt` : "›"}</span>
        </Go>
        <Go readOnly={readOnly} href="/handy/kontakte" onClick={onOpenContacts} className={item}>
          <span>☺ Kontakte</span>
          <span>›</span>
        </Go>
        <Go readOnly={readOnly} href={`/einstellungen#handy-${character.id}`} className={item}>
          <span>⚙ Einstellungen</span>
          <span>›</span>
        </Go>
        <div className="flex-1" />
        <div className="text-center text-[0.75rem] text-text-tertiary">Prepaid · kein Internet</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-black/15 px-4 pb-2 pt-5">
      {/* Angedeutete Apps – nicht anklickbar (außer „Einstellungen") */}
      <div className="grid grid-cols-4 justify-items-center gap-y-5">
        {phone.apps.map((a) => {
          const icon = (
            <AppIcon label={a.label} bg={a.bg} icon={a.icon}>
              {a.glyph}
            </AppIcon>
          );
          return a.href && !readOnly ? (
            <Link key={a.key} href={`${a.href}#handy-${character.id}`}>
              {icon}
            </Link>
          ) : (
            <span key={a.key} aria-hidden>
              {icon}
            </span>
          );
        })}
      </div>

      <div className="min-h-6 flex-1" />

      {/* Dock: die echten Apps */}
      <div className="flex justify-center rounded-[1.75rem] bg-white/15 px-1 pb-2 pt-3 backdrop-blur-md">
        <Go readOnly={readOnly} href="/handy/telefon">
          <AppIcon label="Telefon" bg="linear-gradient(#5fd66b, #2aa63a)" badge={ringing}>
            <span className={ringing > 0 ? "phone-ring" : ""}>📞</span>
          </AppIcon>
        </Go>
        <Go readOnly={readOnly} href="/handy/kontakte" onClick={onOpenContacts}>
          <AppIcon label="Kontakte" bg="linear-gradient(#b9bcc4, #7d8089)">
            👤
          </AppIcon>
        </Go>
        <Go readOnly={readOnly} href="/handy/nachrichten">
          <AppIcon label="Nachrichten" bg={MESSENGER_BG} badge={unread}>
            <MessengerGlyph />
          </AppIcon>
        </Go>
        {phone.captic && (
          <Go readOnly={readOnly} href="/handy/captic">
            <AppIcon label="Captic" bg={CAPTIC_BG}>
              <CapticGlyph />
            </AppIcon>
          </Go>
        )}
      </div>
    </div>
  );
}
