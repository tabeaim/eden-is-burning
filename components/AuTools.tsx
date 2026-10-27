"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";
import { plotToolBtn } from "./PlotBar";

// Werkzeuge für ein AU: umbenennen und löschen. Steht im AU-Filter von Timeline und
// Szenen-Übersicht (wenn genau ein AU gewählt ist) und in Admin → Szenen & Plots.
// Nur zeigen, wenn `canManageAu(name)` – die Datenbank prüft es noch einmal.
// Gibt es den neuen Namen schon, werden die beiden AUs zusammengelegt.
export function AuTools({
  name,
  names,
  onRenamed,
  onDeleted,
  btnClass = plotToolBtn,
  dangerClass = plotToolBtn,
}: {
  name: string;
  names: string[]; // alle vorhandenen AU-Namen (für den Hinweis aufs Zusammenlegen)
  onRenamed?: (newName: string) => void;
  onDeleted?: () => void;
  btnClass?: string;
  dangerClass?: string;
}) {
  const { renameAu, deleteAu } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [ask, setAsk] = useState<"merge" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = draft.trim();
  const target = names.find((n) => n !== name && n.toLowerCase() === next.toLowerCase());

  async function run(fn: () => Promise<{ error: string | null }>, done: () => void) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.error) return done();
    // Funktion fehlt: schema-au-manage.sql ist in dieser Datenbank noch nicht gelaufen
    setError(
      res.error.includes("Could not find the function")
        ? "Die Datenbank kennt das noch nicht (supabase/schema-au-manage.sql ausführen)."
        : res.error,
    );
  }

  function rename() {
    if (!next || next === name) return setRenaming(false);
    if (target) return setAsk("merge");
    void run(() => renameAu(name, next), () => {
      setRenaming(false);
      onRenamed?.(next);
    });
  }

  return (
    <>
      {renaming ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
            aria-label="Neuer Name des AUs"
            className="w-44 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
          <button
            onClick={rename}
            disabled={!next || busy}
            className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
          >
            {target ? "Zusammenlegen" : "Speichern"}
          </button>
          <button
            onClick={() => setRenaming(false)}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
          >
            Abbrechen
          </button>
        </span>
      ) : (
        <button
          onClick={() => {
            setDraft(name);
            setError(null);
            setRenaming(true);
          }}
          disabled={busy}
          className={btnClass}
        >
          <Icon name="edit" size={13} /> AU umbenennen
        </button>
      )}
      <button onClick={() => setAsk("delete")} disabled={busy} className={dangerClass}>
        <Icon name="trash" size={13} /> AU löschen
      </button>
      {error && <span className="text-[0.8125rem] text-red-400">{error}</span>}

      {ask === "merge" && target && (
        <ConfirmDialog
          title={`„${name}“ mit „${target}“ zusammenlegen?`}
          text={`Alle Szenen aus „${name}“ spielen danach in „${target}“. Plots mit „${name}“ im Filter zeigen dann „${target}“. Hat ein Charakter in beiden AUs eine eigene Version, bleibt die aus „${target}“.`}
          confirmLabel="Zusammenlegen"
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            setAsk(null);
            void run(() => renameAu(name, target), () => {
              setRenaming(false);
              onRenamed?.(target);
            });
          }}
        />
      )}
      {ask === "delete" && (
        <ConfirmDialog
          title={`AU „${name}“ löschen?`}
          text={`Die Szenen bleiben erhalten und bleiben AU, nur ohne Namen („Ohne Namen“ im Filter). Die Charakter-Versionen für „${name}“ werden gelöscht, Plots verlieren diesen AU-Filter.`}
          confirmLabel="AU löschen"
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            setAsk(null);
            void run(() => deleteAu(name), () => onDeleted?.());
          }}
        />
      )}
    </>
  );
}
