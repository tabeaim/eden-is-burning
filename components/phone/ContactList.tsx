"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { contactName } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { ContactAvatar } from "./PhoneFrame";

// Kontaktliste eines Handys: oben hervorgehoben die fünf Charaktere, mit denen der
// Besitzer am meisten geschrieben hat (Posts in gemeinsamen Szenen + Nachrichten
// in gemeinsamen Chats), danach alle anderen alphabetisch. Namen und Fotos nach
// den Kontakt-Einträgen dieses Handys. Ohne `onPick`/`onEdit` nur zum Ansehen.
export function ContactList({
  owner,
  onPick,
  onEdit,
}: {
  owner: Character;
  onPick?: (c: Character) => void;
  onEdit?: (c: Character) => void;
}) {
  const { characters, npcs, scenes, posts, chats, chatMessages, currentPlayer } = useStore();
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

  const everyone = [...characters, ...npcs].filter((c) => c.id !== owner.id);
  const name = (c: Character) => contactName(owner, c);
  const byName = (a: Character, b: Character) => name(a).localeCompare(name(b), "de");
  const top = everyone
    .filter((c) => (shared.get(c.id) ?? 0) > 0)
    .sort((a, b) => (shared.get(b.id) ?? 0) - (shared.get(a.id) ?? 0) || byName(a, b))
    .slice(0, 5);
  const matches = everyone
    .filter(
      (c) => !query || name(c).toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
    )
    .sort(byName);
  // Bei einer Suche eine einzige Liste; sonst die Top 5 oben und der Rest darunter
  const rest = query ? matches : matches.filter((c) => !top.includes(c));

  const row = (c: Character, highlighted: boolean) => {
    const renamed = name(c) !== c.name;
    const body = (
      <>
        <ContactAvatar owner={owner} character={c} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] text-text-primary">
            {name(c)}
            {c.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">NPC</span>
            )}
          </span>
          <span className="block truncate text-[0.75rem] text-text-tertiary">
            {[renamed ? c.name : c.role, c.player_id === currentPlayer?.id ? "du" : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </>
    );
    return (
      <div
        key={c.id}
        className={`flex items-center gap-1 pr-2 ${highlighted ? "" : "hover:bg-white/[0.03]"}`}
      >
        {onPick ? (
          <button
            onClick={() => onPick(c)}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-white/[0.06]"
          >
            {body}
            <Icon name="phone" size={18} className="shrink-0 text-accent" />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">{body}</div>
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
      <div className="px-3 py-2">
        <label className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary">
          <Icon name="search" size={15} className="shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kontakt suchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
          />
        </label>
      </div>
      {!query && top.length > 0 && (
        <>
          <div className={heading}>Häufig</div>
          <div className="mx-3 overflow-hidden rounded-xl border border-accent/40 bg-accent-soft">
            {top.map((c) => row(c, true))}
          </div>
          <div className={heading}>Alle Kontakte</div>
        </>
      )}
      {rest.map((c) => row(c, false))}
      {rest.length === 0 && (query || top.length === 0) && (
        <p className="p-6 text-center text-[0.875rem] text-text-tertiary">Niemand gefunden.</p>
      )}
    </>
  );
}
