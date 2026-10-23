"use client";

import { capFirst } from "@/lib/format";
import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { contactName, contactPhoto, hasPhone } from "@/lib/phone";
import { characterImage } from "@/lib/avatar";
import { tierLabel } from "@/lib/characters";
import { Icon } from "@/components/Icon";
import { ContactAvatar } from "./PhoneFrame";
import { Sheet, SheetButton, SheetList } from "./Sheet";
import { useLongPress } from "./useLongPress";

// Kontaktliste eines Handys: oben die Favoriten (von Hand gesetzt), darunter alphabetisch die relevanten
// Kontakte – alle, mit denen der Besitzer schon zu tun hatte (gemeinsame Szene,
// Chat, Anruf, eigener Kontakt-Eintrag) oder die von Hand als relevant markiert
// sind. Namen und Fotos nach den Kontakt-Einträgen dieses Handys.
// Ohne die on…-Handler nur zum Ansehen (Charakterprofil).
export function ContactList({
  owner,
  onPick,
  onMessage,
  onEdit,
  onMark,
  onAvatar,
}: {
  owner: Character;
  onPick?: (c: Character) => void; // anrufen
  onMessage?: (c: Character) => void; // Nachricht schreiben
  onEdit?: (c: Character) => void;
  // Favoriten / von Hand als relevant markierte Kontakte ändern (Rechtsklick
  // bzw. langes Drücken auf einen Kontakt)
  onMark?: (patch: { favorites?: string[]; relevant?: string[]; not_relevant?: string[] }) => void;
  // Vorschau im Profil: Klick aufs Profilbild zeigt es groß (statt aufs Profil zu führen)
  onAvatar?: (src: string, c: Character) => void;
}) {
  const { characters, npcs, scenes, posts, chats, chatMessages, calls, currentPlayer } = useStore();
  // „Relevante": mit wem der Besitzer schon Kontakt hatte · „Alle": wirklich alle
  const [scope, setScope] = useState<"relevant" | "all">("relevant");
  const [menuFor, setMenuFor] = useState<Character | null>(null);
  const longPress = useLongPress<Character>((c) => onMark && setMenuFor(c));
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Wie viel hat der Besitzer mit wem geschrieben?
  const shared = useMemo(() => {
    const count = new Map<string, number>();
    const add = (ids: string[], n: number) => {
      if (!ids.includes(owner.id) || n === 0) return;
      for (const id of ids) if (id !== owner.id) count.set(id, (count.get(id) ?? 0) + n);
    };
    const perScene = new Map<string, number>();
    for (const p of posts) perScene.set(p.scene_id, (perScene.get(p.scene_id) ?? 0) + 1);
    for (const s of scenes) add(s.participant_ids, perScene.get(s.id) ?? 0);
    const perChat = new Map<string, number>();
    for (const m of chatMessages) {
      if (m.kind !== "date") perChat.set(m.chat_id, (perChat.get(m.chat_id) ?? 0) + 1);
    }
    for (const c of chats) add(c.participant_ids, perChat.get(c.id) ?? 0);
    return count;
  }, [owner.id, scenes, posts, chats, chatMessages]);

  // wer kein Handy hat, steht in keiner Kontaktliste
  const everyone = [...characters, ...npcs].filter((c) => c.id !== owner.id && hasPhone(c));
  // Kontakt gehabt: gemeinsame Szene oder Chat, ein Anruf, oder ein eigener
  // Kontakt-Eintrag (umbenannt / mit Foto)
  const known = (c: Character) =>
    (shared.get(c.id) ?? 0) > 0 ||
    !!owner.phone?.contacts?.[c.id] ||
    calls.some(
      (x) =>
        (x.caller_id === owner.id && x.callee_id === c.id) ||
        (x.callee_id === owner.id && x.caller_id === c.id),
    );
  const name = (c: Character) => contactName(owner, c);
  const byName = (a: Character, b: Character) => name(a).localeCompare(name(b), "de");
  // Favoriten: nur, was von Hand markiert wurde
  const favoriteIds = owner.phone?.favorites ?? [];
  const manualRelevant = owner.phone?.relevant ?? [];
  const excluded = owner.phone?.not_relevant ?? [];
  // relevant: von Hand hinzugefügt, oder es gab Kontakt und niemand hat ihn entfernt
  const isRelevant = (c: Character) =>
    manualRelevant.includes(c.id) || (known(c) && !excluded.includes(c.id));
  const top = everyone.filter((c) => favoriteIds.includes(c.id)).sort(byName);
  const matches = everyone
    .filter(
      (c) => !query || name(c).toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
    )
    .sort(byName);
  // Bei einer Suche eine einzige Liste über alle (auch wer sonst nicht auftaucht);
  // sonst die Favoriten oben und darunter die Relevanten bzw. alle
  const rest = query
    ? matches
    : matches.filter(
        (c) => !top.includes(c) && (scope === "all" || isRelevant(c)),
      );

  const row = (c: Character) => {
    const renamed = name(c) !== c.name;
    const body = (
      <>
        {onAvatar ? (
          <button
            onClick={() => onAvatar(contactPhoto(owner, c) || c.phone?.avatar || characterImage(c), c)}
            title="Profilbild vergrößern"
            aria-label={`Profilbild von ${name(c)} vergrößern`}
            className="shrink-0 cursor-zoom-in rounded-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={contactPhoto(owner, c) || c.phone?.avatar || characterImage(c)}
              alt=""
              className="h-10 w-10 rounded-full bg-bg-surface-2 object-cover"
            />
          </button>
        ) : (
          <ContactAvatar owner={owner} character={c} size={40} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] text-text-primary">
            {name(c)}
            {c.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                {tierLabel(c)}
              </span>
            )}
          </span>
          <span className="block truncate text-[0.75rem] text-text-tertiary">
            {[renamed ? c.name : capFirst(c.role), c.player_id === currentPlayer?.id ? "du" : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </>
    );
    return (
      <div
        key={c.id}
        {...(onMark ? longPress(c) : {})}
        onContextMenu={(e) => {
          if (!onMark) return;
          e.preventDefault();
          setMenuFor(c);
        }}
        className="flex select-none items-center gap-1 pr-2 [-webkit-touch-callout:none] hover:bg-white/[0.03]"
      >
        {onPick ? (
          <button
            onClick={() => onPick(c)}
            title="Anrufen"
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-white/[0.06]"
          >
            {body}
            <Icon name="call" size={17} className="shrink-0 text-accent" />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">{body}</div>
        )}
        {onMessage && (
          <button
            onClick={() => onMessage(c)}
            aria-label={`Nachricht an ${name(c)}`}
            title="Nachricht schreiben"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-white/[0.06]"
          >
            <Icon name="message" size={17} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(c)}
            aria-label={`${name(c)} bearbeiten`}
            title="Kontakt bearbeiten"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary"
          >
            <Icon name="edit" size={16} />
          </button>
        )}
      </div>
    );
  };
  const heading = "px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-tertiary";

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary">
          <Icon name="search" size={15} className="shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kontakt suchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
          />
        </label>
        {/* Umschalter: nur Relevante oder alle Charaktere */}
        <button
          onClick={() => setScope((v) => (v === "relevant" ? "all" : "relevant"))}
          title={scope === "relevant" ? "Zeigt nur Kontakte, mit denen es schon Kontakt gab – klicken für alle" : "Zeigt alle – klicken für nur relevante"}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
            scope === "all" ? "bg-accent text-black" : "bg-white/[0.06] text-text-secondary hover:text-text-primary"
          }`}
        >
          {scope === "relevant" ? "Relevante" : "Alle"}
        </button>
      </div>
      {!query && top.length > 0 && (
        <>
          <div className={heading}>Favoriten</div>
          {top.map((c) => row(c))}
          <div className={heading}>{scope === "all" ? "Alle Kontakte" : "Weitere Kontakte"}</div>
        </>
      )}
      {rest.map((c) => row(c))}
      {rest.length === 0 && (query || top.length === 0) && (
        <p className="p-6 text-center text-[0.875rem] text-text-tertiary">
          {query
            ? "Niemand gefunden."
            : "Noch keine Kontakte – such oben nach einem Namen oder schalte auf „Alle“."}
        </p>
      )}

      {/* Rechtsklick / langes Drücken: Favorit und „relevant" von Hand setzen */}
      {menuFor && onMark && (
        <Sheet onClose={() => setMenuFor(null)}>
          <div className="mb-2 truncate px-1 text-[0.8125rem] text-text-tertiary">{name(menuFor)}</div>
          <SheetList>
            <SheetButton
              onClick={() => {
                const on = favoriteIds.includes(menuFor.id);
                onMark({
                  favorites: on ? favoriteIds.filter((id) => id !== menuFor.id) : [...favoriteIds, menuFor.id],
                });
                setMenuFor(null);
              }}
            >
              {favoriteIds.includes(menuFor.id) ? "Aus den Favoriten entfernen" : "Als Favorit markieren"}
            </SheetButton>
            {/* zu „Relevante" hinzufügen bzw. daraus entfernen – auch wer schon
                Kontakt hatte, lässt sich ausblenden (z. B. Nummer noch nicht bekannt) */}
            <SheetButton
              onClick={() => {
                const id = menuFor.id;
                if (isRelevant(menuFor)) {
                  onMark({
                    relevant: manualRelevant.filter((x) => x !== id),
                    not_relevant: known(menuFor) ? [...excluded.filter((x) => x !== id), id] : excluded,
                  });
                } else {
                  onMark({
                    relevant: known(menuFor) ? manualRelevant : [...manualRelevant, id],
                    not_relevant: excluded.filter((x) => x !== id),
                  });
                }
                setMenuFor(null);
              }}
            >
              {isRelevant(menuFor) ? "Aus „Relevante“ entfernen" : "Zu „Relevante“ hinzufügen"}
            </SheetButton>
            <SheetButton onClick={() => setMenuFor(null)}>Abbrechen</SheetButton>
          </SheetList>
        </Sheet>
      )}
    </>
  );
}
