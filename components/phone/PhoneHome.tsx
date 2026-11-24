"use client";

import Link from "next/link";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { useDragSort } from "@/lib/useDragSort";
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
  onOpenApp,
}: {
  character: Character;
  readOnly?: boolean;
  onOpenContacts?: () => void;
  // nur ansehen (fremdes Handy): Notizen und Fotos lassen sich trotzdem öffnen
  onOpenApp?: (key: "notizen" | "fotos") => void;
}) {
  const { chats, calls, isChatNew, capticNews, updateCharacter } = useStore();
  const phone = resolvePhone(character);
  // Im Spiel versteckte Apps: für alle sichtbar, nur markiert
  const secret = character.phone?.secret_apps ?? [];
  // Apps per Ziehen ordnen (nur auf dem eigenen Handy)
  const sort = useDragSort(
    phone.apps,
    (a) => a.key,
    (next) => updateCharacter(character.id, { phone: { ...character.phone, app_order: next.map((a) => a.key) } }),
    !readOnly && !phone.burner,
  );
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
        <Go readOnly={readOnly} href="/handy/einstellungen" className={item}>
          <span>⚙ Einstellungen</span>
          <span>›</span>
        </Go>
        <div className="flex-1" />
        <div className="text-center text-[0.75rem] text-text-tertiary">Prepaid · kein Internet</div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-2 pt-5 ${
        phone.wallpaperLight ? "" : "bg-black/15"
      }`}
    >
      {/* Angedeutete Apps – nicht anklickbar (außer Einstellungen, Fotos und Notizen; Fotos zeigt das neueste Foto).
          Auf dem eigenen Handy lassen sie sich per Ziehen umsortieren. */}
      <div className="grid grid-cols-4 justify-items-center gap-y-5">
        {sort.list.map((a) => {
          // Fotos zeigt das zuletzt hinzugefügte Foto als Icon
          const lastPhoto = a.key === "fotos" ? character.phone?.photos?.[0]?.url : undefined;
          const icon = (
            <AppIcon label={a.label} bg={a.bg} icon={lastPhoto ?? a.icon} secret={secret.includes(a.key)}>
              {lastPhoto ? null : a.glyph}
            </AppIcon>
          );
          const key = a.key;
          const item =
            readOnly && onOpenApp && (key === "notizen" || key === "fotos") ? (
              <button onClick={() => onOpenApp(key)}>{icon}</button>
            ) : a.href && !readOnly ? (
              <Link href={`${a.href}#handy-${character.id}`}>{icon}</Link>
            ) : (
              <span aria-hidden>{icon}</span>
            );
          return (
            <div key={key} {...sort.itemProps(key)}>
              {item}
            </div>
          );
        })}
      </div>

      <div className="min-h-6 flex-1" />

      {/* Dock: die echten Apps */}
      <div className="flex justify-center rounded-[1.75rem] bg-[var(--phone-dock)] px-1 pb-2 pt-3 backdrop-blur-md">
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
            <AppIcon label="Captic" bg={CAPTIC_BG} badge={readOnly ? 0 : capticNews(character.id).length}>
              <CapticGlyph />
            </AppIcon>
          </Go>
        )}
      </div>
    </div>
  );
}
