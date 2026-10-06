"use client";

import { Fragment, useMemo } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { capticHandle } from "@/lib/captic";
import { PhoneAvatar } from "../PhoneFrame";

// Alle Profile, die sich verlinken lassen (Charaktere mit Captic)
export function useCapticProfiles() {
  const { characters, npcs } = useStore();
  return useMemo(() => {
    const list = [...characters, ...npcs].filter((c) => !c.deleted_at && resolvePhone(c).captic);
    const byHandle = new Map(list.map((c) => [capticHandle(c).toLowerCase(), c]));
    return { list, byHandle };
  }, [characters, npcs]);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// „@Reece Malone" oder „@Reece" → „@reecemalone": Wer den Namen statt des
// Nutzernamens tippt, bekommt trotzdem eine funktionierende Verlinkung.
export function normalizeMentions(text: string, profiles: Character[]): string {
  if (!text.includes("@")) return text;
  let out = text;
  const handles = new Set(profiles.map((c) => capticHandle(c).toLowerCase()));
  // volle Namen zuerst (längste zuerst), dann eindeutige Vornamen
  for (const c of [...profiles].sort((a, b) => b.name.length - a.name.length)) {
    out = out.replace(new RegExp(`@${escape(c.name)}(?![\\p{L}\\p{N}_.])`, "giu"), `@${capticHandle(c)}`);
  }
  const firsts = new Map<string, Character[]>();
  for (const c of profiles) {
    const first = c.name.split(" ")[0].toLowerCase();
    firsts.set(first, [...(firsts.get(first) ?? []), c]);
  }
  for (const [first, who] of firsts) {
    if (who.length !== 1 || handles.has(first)) continue;
    out = out.replace(new RegExp(`@${escape(first)}(?![\\p{L}\\p{N}_.])`, "giu"), `@${capticHandle(who[0])}`);
  }
  return out;
}

// Text mit anklickbaren Verlinkungen: „@nutzername" führt aufs Profil.
export function MentionText({ text, onProfile }: { text: string; onProfile: (characterId: string) => void }) {
  const { byHandle } = useCapticProfiles();
  return (
    <>
      {text.split(/(@[A-Za-z0-9._]+)/).map((part, i) => {
        if (!part.startsWith("@")) return <Fragment key={i}>{part}</Fragment>;
        // Satzzeichen am Ende („@riley.") gehören nicht zum Namen
        const handle = part.slice(1).replace(/[._]+$/, "");
        const who = byHandle.get(handle.toLowerCase()) ?? byHandle.get(part.slice(1).toLowerCase());
        if (!who) return <Fragment key={i}>{part}</Fragment>;
        const shown = `@${capticHandle(who)}`;
        return (
          <Fragment key={i}>
            <button onClick={() => onProfile(who.id)} className="font-medium text-accent hover:underline">
              {shown}
            </button>
            {part.slice(shown.length)}
          </Fragment>
        );
      })}
    </>
  );
}

// Vorschläge, während man „@…" tippt (Nutzername oder Charaktername). Die Auswahl
// setzt den Nutzernamen ein. `caret` ist die Schreibposition im Text.
export function MentionSuggest({
  value,
  caret,
  onPick,
}: {
  value: string;
  caret: number;
  onPick: (value: string, caret: number) => void;
}) {
  const { list } = useCapticProfiles();
  const before = value.slice(0, caret);
  // nach dem @ höchstens ein Leerzeichen – so findet auch „@reece mal" jemanden
  const m = before.match(/(^|\s)@([^\s@]*(?: [^\s@]*)?)$/);
  if (!m) return null;
  const q = m[2].toLowerCase();
  const hits = list
    .filter((c) => !q || capticHandle(c).toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    .sort((a, b) => capticHandle(a).localeCompare(capticHandle(b)))
    .slice(0, 5);
  if (hits.length === 0) return null;
  const at = before.length - m[2].length - 1; // Position des @

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface-2">
      {hits.map((c) => (
        <button
          key={c.id}
          type="button"
          // mousedown statt click: das Eingabefeld behält den Fokus
          onMouseDown={(e) => {
            e.preventDefault();
            const insert = `@${capticHandle(c)} `;
            onPick(value.slice(0, at) + insert + value.slice(caret), at + insert.length);
          }}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/[0.06]"
        >
          <PhoneAvatar character={c} size={28} link={false} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-semibold text-text-primary">
              {capticHandle(c)}
            </span>
            <span className="block truncate text-[0.75rem] text-text-tertiary">{c.name}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
