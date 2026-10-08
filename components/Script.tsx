"use client";

import type { Character } from "@/lib/types";
import type { ScriptLine } from "@/lib/script";
import { useStore } from "@/lib/store";
import { characterImage } from "@/lib/avatar";
import { PHONE_AREA, contactShortName } from "@/lib/phone";
import { ContactAvatar, useMyPhone } from "./phone/PhoneFrame";
import { CharacterSelect } from "./CharacterSelect";
import { Icon } from "./Icon";

// Wer spricht: für Mitlesende mit eigenem Charakter in der Szene (`viewer`) so,
// wie die Person in dessen Handy steht (Kontaktname, Kontakt- bzw. Messenger-
// Foto); für alle anderen mit normalem Profilbild und Vornamen.
export function useSpeaker(viewer: Character | undefined) {
  const { character } = useStore();
  return (line: ScriptLine & { k: "line" }) => {
    const who = line.who ? character(line.who) : undefined;
    const name = who
      ? viewer
        ? contactShortName(viewer, who)
        : who.name.split(" ")[0]
      : line.name?.trim() || "Jemand";
    return { who, name };
  };
}

// Aus wessen Sicht ich die Szene lese: mein Charakter in der Szene (bei mehreren
// der, dessen Handy gerade gewählt ist). Nur am Telefon – dort sieht man, wie
// das Gegenüber im eigenen Handy steht. In Szenen mit Ort (und ohne eigenen
// Charakter) niemand: dann stehen Vornamen und normale Profilbilder da.
export function useScriptViewer(sceneId: string): Character | undefined {
  const { scenes } = useStore();
  const { myChars, stored } = useMyPhone();
  const scene = scenes.find((s) => s.id === sceneId);
  const ids = scene?.location_area === PHONE_AREA ? scene.participant_ids : [];
  const here = myChars.filter((c) => ids.includes(c.id));
  return here.find((c) => c.id === stored) ?? here[0];
}

// Ein Post im Drehbuch-Format: Regieanweisungen kursiv, Dialog als
// „[Bild] Name: Text".
export function ScriptView({ lines, viewer }: { lines: ScriptLine[]; viewer?: Character }) {
  const speaker = useSpeaker(viewer);
  if (lines.length === 0) return <span className="opacity-50">(noch nichts geschrieben)</span>;
  return (
    <div className="flex flex-col gap-2.5 text-[0.9375rem] leading-relaxed text-text-primary">
      {lines.map((l, i) => {
        if (l.k === "dir") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words italic text-text-tertiary">
              {l.text}
            </p>
          );
        }
        const { who, name } = speaker(l);
        return (
          <div key={i} className="flex items-start gap-2.5">
            {who && viewer ? (
              <ContactAvatar owner={viewer} character={who} size={28} />
            ) : who ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={characterImage(who)} alt="" className="h-7 w-7 shrink-0 rounded-full bg-bg-surface-2 object-cover" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive-soft text-[0.75rem] uppercase text-text-primary">
                {name.charAt(0)}
              </span>
            )}
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5">
              <span className="font-semibold">{name}:</span> {l.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const field =
  "w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] leading-relaxed text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]";
const addBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary";

// Editor fürs Drehbuch-Format: Zeile für Zeile Regie oder Dialog. Dialog spricht
// standardmäßig der schreibende Charakter (`self`); wählbar sind außerdem die
// eigenen Charaktere, jede Nebenfigur (auch ohne Teil der Szene zu sein) oder
// ein frei eingetragener Name.
export function ScriptEditor({
  lines,
  onChange,
  self,
  mine,
}: {
  lines: ScriptLine[];
  onChange: (lines: ScriptLine[]) => void;
  self: Character | undefined;
  mine: Character[]; // eigene Charaktere (Liste); Nebenfiguren über die Suche
}) {
  const { npcs } = useStore();
  const set = (i: number, patch: Partial<ScriptLine>) =>
    onChange(lines.map((l, j) => (j === i ? ({ ...l, ...patch } as ScriptLine) : l)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...lines];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const moveBtn =
    "rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent";
  const listed = self && !mine.some((c) => c.id === self.id) ? [self, ...mine] : mine;

  return (
    <div className="flex flex-col gap-2.5">
      {lines.map((l, i) => (
        <div key={i} className="rounded-md border border-border-subtle bg-bg-primary/40 p-2.5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[0.75rem] uppercase tracking-wider text-text-tertiary">
              {l.k === "dir" ? "Regie" : "Dialog"}
            </span>
            {l.k === "line" &&
              (l.who !== undefined && l.who !== null ? (
                <>
                  <CharacterSelect
                    characters={listed}
                    value={l.who}
                    onChange={(id) => set(i, { who: id })}
                    search={{ placeholder: "SC oder Statist*in …", characters: npcs.filter((c) => !c.deleted_at) }}
                  />
                  <button
                    type="button"
                    onClick={() => set(i, { who: null, name: "" })}
                    className="text-[0.8125rem] text-text-tertiary underline hover:text-text-primary"
                  >
                    freier Name
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={l.name ?? ""}
                    onChange={(e) => set(i, { name: e.target.value })}
                    placeholder="Name (z. B. Kellnerin)"
                    className={`${field} !w-48 !py-1`}
                  />
                  {self && (
                    <button
                      type="button"
                      onClick={() => set(i, { who: self.id, name: null })}
                      className="text-[0.8125rem] text-text-tertiary underline hover:text-text-primary"
                    >
                      Charakter wählen
                    </button>
                  )}
                </>
              ))}
            {/* Reihenfolge: Zeile nach oben / unten schieben */}
            <span className="ml-auto flex items-center">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                title="Nach oben"
                aria-label="Zeile nach oben"
                className={moveBtn}
              >
                <Icon name="chevron-right" size={14} className="-rotate-90" />
              </button>
              <button
                type="button"
                disabled={i === lines.length - 1}
                onClick={() => move(i, 1)}
                title="Nach unten"
                aria-label="Zeile nach unten"
                className={moveBtn}
              >
                <Icon name="chevron-right" size={14} className="rotate-90" />
              </button>
            </span>
            <button
              type="button"
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              title="Zeile entfernen"
              aria-label="Zeile entfernen"
              className="rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-red-400"
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
          <textarea
            value={l.text}
            onChange={(e) => set(i, { text: e.target.value })}
            rows={l.k === "dir" ? 2 : 1}
            lang="de"
            spellCheck
            autoFocus={i === lines.length - 1 && !l.text}
            placeholder={l.k === "dir" ? "Was passiert? (Charakter x macht so und so)" : "Was wird gesagt?"}
            className={`${field} resize-y ${l.k === "dir" ? "italic" : ""}`}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...lines, { k: "line", who: self?.id ?? null, name: self ? null : "", text: "" }])}
          className={addBtn}
        >
          <Icon name="plus" size={13} /> Dialog
        </button>
        <button type="button" onClick={() => onChange([...lines, { k: "dir", text: "" }])} className={addBtn}>
          <Icon name="plus" size={13} /> Regie
        </button>
      </div>
    </div>
  );
}
