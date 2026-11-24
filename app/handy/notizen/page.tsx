"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { PhoneNote } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

const newId = () => `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Notizen-App des eigenen Handys: Notizen direkt im Handy anlegen und schreiben.
// „Ordnen" verschiebt (↑ ↓) und löscht (✕); so wie sortiert, wird angezeigt.
// Gespeichert wird im Handy des Charakters (`phone.notes`), eine leere Notiz
// verschwindet beim Schließen von selbst.
export default function NotesPage() {
  const { updateCharacter } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PhoneNote | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PhoneNote | null>(null);
  // Beim Tippen wird laufend gespeichert (kurz verzögert) – so geht nichts verloren,
  // auch wenn man das Handy über die Home-Leiste verlässt.
  const saveTimer = useRef<number | null>(null);

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Notizen gibt es nur auf dem Handy eines eigenen Charakters.
        </p>
      </PhoneFrame>
    );
  }

  const notes = me.phone?.notes ?? [];
  const save = (next: PhoneNote[]) => updateCharacter(me.id, { phone: { ...me.phone, notes: next } });
  const empty = (n: PhoneNote) => !n.title.trim() && !n.text.trim();

  function openNote(n: PhoneNote) {
    setDraft(n);
    setOpenId(n.id);
  }
  function newNote() {
    openNote({ id: newId(), title: "", text: "" });
  }
  // Notiz in die Liste übernehmen (neu: oben); eine leere verschwindet
  function store(d: PhoneNote) {
    const exists = notes.some((n) => n.id === d.id);
    if (empty(d)) {
      if (exists) save(notes.filter((n) => n.id !== d.id));
    } else {
      save(exists ? notes.map((n) => (n.id === d.id ? d : n)) : [d, ...notes]);
    }
  }
  function edit(d: PhoneNote) {
    setDraft(d);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (!empty(d)) saveTimer.current = window.setTimeout(() => store(d), 600);
  }
  function close() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (draft) store(draft);
    setDraft(null);
    setOpenId(null);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= notes.length) return;
    const next = [...notes];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  }

  const frame = {
    owner: me.id,
    options: myChars.map((c) => c.id),
    onOwner: (id: string) => {
      close();
      setOwner(id);
    },
  };
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary disabled:opacity-30";

  const confirmDialog = confirmDelete && (
    <ConfirmDialog
      title="Notiz löschen?"
      text={`„${confirmDelete.title.trim() || "Neue Notiz"}“ verschwindet vom Handy.`}
      confirmLabel="Löschen"
      onConfirm={() => {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        save(notes.filter((x) => x.id !== confirmDelete.id));
        if (draft?.id === confirmDelete.id) {
          setDraft(null);
          setOpenId(null);
        }
        setConfirmDelete(null);
      }}
      onCancel={() => setConfirmDelete(null)}
    />
  );

  if (openId && draft) {
    return (
      <PhoneFrame {...frame}>
        <div className="flex min-h-[52px] shrink-0 items-center gap-1.5 border-b border-border-subtle bg-bg-surface px-2 py-1.5">
          <button onClick={close} className="flex items-center gap-0.5 text-[0.9375rem] text-accent">
            <Icon name="chevron-right" size={22} className="rotate-180" />
            Notizen
          </button>
          <div className="flex-1" />
          {notes.some((n) => n.id === draft.id) && (
            <button
              onClick={() => setConfirmDelete(draft)}
              aria-label="Notiz löschen"
              title="Notiz löschen"
              className="flex h-9 w-9 items-center justify-center text-text-tertiary hover:text-red-300"
            >
              <Icon name="trash" size={18} />
            </button>
          )}
          <button onClick={close} className="px-2 text-[0.9375rem] font-semibold text-accent">
            Fertig
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          <input
            value={draft.title}
            autoFocus={!draft.title && !draft.text}
            onChange={(e) => edit({ ...draft, title: e.target.value })}
            placeholder="Titel"
            maxLength={120}
            className="bg-transparent text-[1.25rem] font-bold text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <textarea
            value={draft.text}
            onChange={(e) => edit({ ...draft, text: e.target.value })}
            placeholder="Notiz"
            maxLength={10000}
            className="min-h-[60vh] flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.9375rem]"
          />
        </div>
        {confirmDialog}
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame {...frame}>
      <PhoneHeader
        back="/handy"
        actions={
          <>
            {notes.length > 0 && (
              <button
                onClick={() => setOrdering((v) => !v)}
                className={`px-2 text-[0.875rem] ${ordering ? "font-semibold text-accent" : "text-text-secondary hover:text-text-primary"}`}
              >
                {ordering ? "Fertig" : "Ordnen"}
              </button>
            )}
            {!ordering && (
              <button onClick={newNote} aria-label="Neue Notiz" title="Neue Notiz" className="flex h-9 w-9 items-center justify-center text-accent">
                <Icon name="edit" size={20} />
              </button>
            )}
          </>
        }
      >
        <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">Notizen</div>
      </PhoneHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notes.length === 0 && (
          <p className="px-8 pt-16 text-center text-[0.875rem] text-text-tertiary">
            Noch keine Notizen. Mit dem Stift oben rechts legst du eine an.
          </p>
        )}
        {notes.map((n, i) => {
          const firstLine = n.text.split("\n").find((l) => l.trim()) ?? "";
          const body = (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-semibold text-text-primary">
                {n.title.trim() || firstLine || "Neue Notiz"}
              </span>
              <span className="block truncate text-[0.8125rem] text-text-tertiary">
                {(n.title.trim() ? firstLine : n.text.split("\n").filter((l) => l.trim())[1]) || "Kein weiterer Text"}
              </span>
            </span>
          );
          return ordering ? (
            <div key={n.id} className="flex items-center gap-1 border-b border-border-subtle px-3 py-2">
              {body}
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben" className={iconBtn}>
                ↑
              </button>
              <button onClick={() => move(i, 1)} disabled={i === notes.length - 1} aria-label="Nach unten" className={iconBtn}>
                ↓
              </button>
              <button
                onClick={() => setConfirmDelete(n)}
                aria-label="Löschen"
                className={`${iconBtn} hover:text-red-300`}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              key={n.id}
              onClick={() => openNote(n)}
              className="flex w-full items-center border-b border-border-subtle px-3 py-2.5 text-left hover:bg-white/[0.03]"
            >
              {body}
            </button>
          );
        })}
        {!ordering && (
          <button
            onClick={newNote}
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-[0.9375rem] font-medium text-accent hover:bg-white/[0.03]"
          >
            <Icon name="plus" size={18} />
            Neue Notiz
          </button>
        )}
      </div>
      {confirmDialog}
    </PhoneFrame>
  );
}
