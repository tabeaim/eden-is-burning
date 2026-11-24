"use client";

import Link from "next/link";
import { useState } from "react";
import type { Character, ChatScene } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatInplayDateShort } from "@/lib/format";
import { smsSceneTitle } from "@/lib/chats";
import { AuNameField, auNames } from "@/components/AuNameField";
import { DatePicker } from "@/components/DatePicker";
import { Toggle } from "@/components/Toggle";
import { Sheet, SheetButton, SheetList } from "./Sheet";
import { plainText } from "@/lib/html";

// Bausteine für SMS-Szenen im Chat (siehe DESIGN.md → Messenger): Formular,
// Szenen-Auswahl über dem Eingabefeld und das Verzeichnis hinter der Kopfzeile.

export type SmsSceneData = Pick<ChatScene, "title" | "inplay_date" | "summary" | "au" | "au_name">;

const field =
  "w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]";

// SMS-Szene anlegen oder bearbeiten: Titel, Inplay-Datum, Zusammenfassung, AU.
// Sitzt oben im Handy, damit der aufklappende Kalender darunter Platz hat.
export function SmsSceneForm({
  scene,
  people,
  defaultDate,
  hint,
  onSave,
  onCancel,
}: {
  scene?: ChatScene; // bearbeiten (sonst: neu)
  people: Character[]; // die Beteiligten – für den Standardtitel
  defaultDate: string;
  hint?: string;
  onSave: (data: SmsSceneData) => void;
  onCancel: () => void;
}) {
  const { scenes, smsScenes } = useStore();
  const [title, setTitle] = useState(scene?.title ?? "");
  const [date, setDate] = useState(scene?.inplay_date ?? defaultDate);
  const [summary, setSummary] = useState(scene?.summary ?? "");
  const [au, setAu] = useState(!!scene?.au);
  const [auName, setAuName] = useState(scene?.au_name ?? "");
  const fallback = smsSceneTitle(people);
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-black/55 p-3 pt-12" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border-subtle bg-bg-surface-2 p-4"
      >
        <div className="text-[0.9375rem] font-semibold text-text-primary">
          {scene ? "SMS-Szene bearbeiten" : "Neue SMS-Szene"}
        </div>
        {hint && <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">{hint}</p>}
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Titel: ${fallback}`}
          className={`${field} mt-3`}
        />
        <div className="mt-3 text-[0.8125rem] text-text-secondary">
          Wann spielt sie? <span className="text-accent">*</span>
        </div>
        <DatePicker value={date} onChange={setDate} className="mt-1" />
        <textarea
          value={summary}
          rows={2}
          maxLength={300}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Zusammenfassung in einem Satz (optional)"
          className={`${field} mt-3 resize-none`}
        />
        <Toggle checked={au} onChange={setAu} className="mt-3">
          Alternate Universe
        </Toggle>
        {au && (
          <div className="mt-2">
            <AuNameField value={auName} onChange={setAuName} names={auNames([...scenes, ...smsScenes])} />
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            disabled={!date}
            onClick={() =>
              onSave({
                title: title.trim() || fallback,
                inplay_date: date,
                summary: summary.trim() || null,
                au,
                au_name: au ? auName.trim() || null : null,
              })
            }
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
          >
            {scene ? "Speichern" : "Szene anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

const OPEN_KEY = "eden:sms-scenes-open";

// Über dem Eingabefeld: wohin die nächste Nachricht geht. Eingeklappt eine Zeile
// (Szene bzw. „lose" + Inplay-Tag), aufgeklappt alle aktiven Szenen als Chips –
// die, in denen man dran ist, zuerst und mit Punkt – plus „lose" und „+ Szene".
export function SceneBar({
  scenes,
  dran,
  targetId,
  day,
  onPick,
  onNew,
  onDay,
}: {
  scenes: ChatScene[]; // aktive Szenen dieses Chats, in Anzeige-Reihenfolge
  dran: Set<string>; // Stränge, in denen man am Zug ist (Szenen-ID bzw. "" für lose)
  targetId: string | null;
  day: string;
  onPick: (sceneId: string | null) => void;
  onNew: () => void;
  onDay: () => void;
}) {
  const [open, setOpenState] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setOpen = (v: boolean) => {
    setOpenState(v);
    try {
      localStorage.setItem(OPEN_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  const target = scenes.find((s) => s.id === targetId);
  const waiting = [...dran].filter((id) => id !== (targetId ?? "")).length;
  const chip = (active: boolean) =>
    `flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${
      active ? "bg-accent text-black" : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12]"
    }`;
  const dot = <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />;

  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-1.5 text-[0.75rem] text-text-tertiary">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title={open ? "Szenen-Auswahl einklappen" : "Szenen-Auswahl aufklappen"}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left"
        >
          <span className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
          <span className="min-w-0 truncate">
            {target ? (
              <>
                Szene: <span className="font-semibold text-text-primary">{target.title.toLowerCase()}</span>
              </>
            ) : (
              "Lose Nachrichten"
            )}
          </span>
          {!open && waiting > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              {dot}
              {waiting} offen
            </span>
          )}
        </button>
        {/* der Inplay-Tag, an dem die nächste Nachricht spielt */}
        <button
          type="button"
          onClick={onDay}
          title="Inplay-Datum der nächsten Nachricht ändern"
          className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 font-semibold text-text-secondary hover:bg-white/[0.12]"
        >
          {day ? formatInplayDateShort(day) : "Datum"}
        </button>
      </div>
      {open && (
        <div className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {scenes.map((s) => (
            <button key={s.id} type="button" onClick={() => onPick(s.id)} className={chip(s.id === targetId)}>
              {dran.has(s.id) && s.id !== targetId && dot}
              <span className="truncate">{s.title.toLowerCase()}</span>
            </button>
          ))}
          <button type="button" onClick={() => onPick(null)} className={chip(targetId === null)}>
            {dran.has("") && targetId !== null && dot}
            lose
          </button>
          <button type="button" onClick={onNew} className={chip(false)}>
            + Szene
          </button>
        </div>
      )}
    </div>
  );
}

export interface DirectoryEntry {
  key: string;
  anchor: string; // Element-ID im Chat
  title: string;
  day: string;
  scene: ChatScene | null; // null: lose Nachrichten
}

// Verzeichnis des Chats (Tipp auf die Kopfzeile): alle SMS-Szenen und die
// Abschnitte loser Nachrichten in Lesereihenfolge – ein Tipp springt hin.
export function SceneDirectory({
  entries,
  people,
  onJump,
  onClose,
}: {
  entries: DirectoryEntry[];
  people: Character[];
  onJump: (entry: DirectoryEntry) => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-[0.8125rem] text-text-tertiary">Im Chat springen</span>
        <span className="flex gap-3">
          {people.map((p) => (
            <Link key={p.id} href={`/charaktere/${p.id}`} className="text-[0.8125rem] text-accent">
              Profil von {p.name.split(" ")[0]} ›
            </Link>
          ))}
        </span>
      </div>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl">
        <SheetList>
          {entries.length === 0 && (
            <div className="px-4 py-3 text-text-tertiary">Noch keine Nachrichten.</div>
          )}
          {entries.map((e) => (
            <button
              key={e.key}
              onClick={() => onJump(e)}
              className="flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.05]"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  e.scene?.status === "active" ? "bg-accent" : e.scene ? "bg-text-tertiary" : "bg-transparent"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate ${e.scene ? "text-text-primary" : "text-text-secondary"}`}
                >
                  {e.title}
                </span>
                {e.scene?.summary && (
                  <span className="block truncate text-[0.75rem] italic text-text-tertiary">
                    {plainText(e.scene.summary)}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[0.75rem] text-text-tertiary">
                {e.day ? formatInplayDateShort(e.day) : ""}
              </span>
            </button>
          ))}
        </SheetList>
      </div>
      <div className="mt-2">
        <SheetList>
          <SheetButton onClick={onClose}>Schließen</SheetButton>
        </SheetList>
      </div>
    </Sheet>
  );
}
