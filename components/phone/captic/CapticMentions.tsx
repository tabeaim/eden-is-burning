"use client";

import { Fragment, useMemo } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { capticHandle } from "@/lib/captic";
import { hasHtml, signatureHtml } from "@/lib/html";
import { CapticAvatar } from "./CapticAvatar";

// Alle Profile, die sich verlinken lassen (Charaktere mit Captic)
export function useCapticProfiles() {
  const { characters, npcs } = useStore();
  return useMemo(() => {
    const list = [...characters, ...npcs].filter((c) => !c.deleted_at && resolvePhone(c).captic);
    const byHandle = new Map(list.map((c) => [capticHandle(c).toLowerCase(), c]));
    return { list, byHandle };
  }, [characters, npcs]);
}

// Ende eines Namens: kein Buchstabe/Ziffer mehr – ein Punkt nur, wenn danach
// nichts weitergeht („@Irina." ja, „@irina.k" nein)
const END = "(?![\\p{L}\\p{N}_]|\\.[\\p{L}\\p{N}_])";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// „@Reece Malone" oder „@Reece" → „@reecemalone": Wer den Namen statt des
// Nutzernamens tippt, bekommt trotzdem eine funktionierende Verlinkung.
export function normalizeMentions(text: string, profiles: Character[]): string {
  if (!text.includes("@")) return text;
  let out = text;
  const handles = new Set(profiles.map((c) => capticHandle(c).toLowerCase()));
  // volle Namen zuerst (längste zuerst), dann eindeutige Vornamen
  for (const c of [...profiles].sort((a, b) => b.name.length - a.name.length)) {
    out = out.replace(new RegExp(`@${escape(c.name)}${END}`, "giu"), `@${capticHandle(c)}`);
  }
  const firsts = new Map<string, Character[]>();
  for (const c of profiles) {
    const first = c.name.split(" ")[0].toLowerCase();
    firsts.set(first, [...(firsts.get(first) ?? []), c]);
  }
  for (const [first, who] of firsts) {
    if (who.length !== 1 || handles.has(first)) continue;
    out = out.replace(new RegExp(`@${escape(first)}${END}`, "giu"), `@${capticHandle(who[0])}`);
  }
  return out;
}

// Text mit anklickbaren Verlinkungen: „@nutzername" führt aufs Profil.
// Mit HTML wird der Text erst entschärft, dann werden die Erwähnungen in den
// Textknoten markiert (ein Klick darauf führt ebenfalls aufs Profil).
export function MentionText({ text, onProfile }: { text: string; onProfile: (characterId: string) => void }) {
  const { byHandle } = useCapticProfiles();
  const html = useMemo(() => (hasHtml(text) ? mentionHtml(signatureHtml(text), byHandle) : null), [text, byHandle]);
  if (html !== null)
    return (
      <span
        className="rich-text [&_a]:underline [&_img]:inline-block [&_img]:max-w-full"
        onClick={(e) => {
          const id = (e.target as HTMLElement).closest<HTMLElement>("[data-mention]")?.dataset.mention;
          if (id) onProfile(id);
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
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

function mentionHtml(html: string, byHandle: Map<string, Character>): string {
  if (!html.includes("@") || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (!node.data.includes("@") || node.parentElement?.closest("a")) continue;
    const parts = node.data.split(/(@[A-Za-z0-9._]+)/);
    const out: Node[] = [];
    for (const part of parts) {
      const handle = part.slice(1).replace(/[._]+$/, "");
      const who = part.startsWith("@")
        ? (byHandle.get(handle.toLowerCase()) ?? byHandle.get(part.slice(1).toLowerCase()))
        : undefined;
      if (!who) {
        if (part) out.push(doc.createTextNode(part));
        continue;
      }
      const shown = `@${capticHandle(who)}`;
      const el = doc.createElement("span");
      el.dataset.mention = who.id;
      el.setAttribute("role", "button");
      el.className = "cursor-pointer font-medium text-accent hover:underline";
      el.textContent = shown;
      out.push(el);
      if (part.length > shown.length) out.push(doc.createTextNode(part.slice(shown.length)));
    }
    node.replaceWith(...out);
  }
  return doc.body.innerHTML;
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
          <CapticAvatar character={c} size={28} />
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
