"use client";

import { useState } from "react";
import type { Plot } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";

// Plot-Zeile in den Filterleisten (Timeline und Szenen-Übersicht): Plots öffnen/
// schließen und die aktuellen Filter als neuen Plot speichern.
export function PlotBar({
  plots,
  activeId,
  onToggle,
  onSave,
  canSave,
}: {
  plots: Plot[]; // nur die für mich sichtbaren
  activeId: string | null;
  onToggle: (plot: Plot) => void;
  onSave: (name: string, isPrivate: boolean) => void;
  canSave: boolean; // ein Plot speichert Filter – ohne Filter gibt es nichts zu speichern
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  // Neuer Plot: mit den betroffenen Spieler*innen teilen (Standard) oder privat
  const [priv, setPriv] = useState(false);

  function save() {
    if (!name.trim()) return;
    onSave(name.trim(), priv);
    setName("");
    setPriv(false);
    setNaming(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
      <span className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">Plots</span>
      {plots.length === 0 && !naming && (
        <span className="text-[0.875rem] text-text-tertiary">– noch keine</span>
      )}
      {plots.map((p) => (
        <button
          key={p.id}
          onClick={() => onToggle(p)}
          title={`${activeId === p.id ? "Plot schließen" : "Plot öffnen"}${p.private ? " · privat, nur für dich sichtbar" : ""}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.8125rem] transition-colors ${
            activeId === p.id
              ? "border-accent/60 bg-accent-soft text-text-primary"
              : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
          }`}
        >
          {p.private && <Icon name="lock" size={11} className="text-text-tertiary" />}
          {p.name}
        </button>
      ))}
      {naming ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Name des Plots…"
            autoFocus
            className="w-44 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
          <PlotPrivacy value={priv} onChange={setPriv} />
          <button
            onClick={save}
            disabled={!name.trim()}
            className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
          >
            Speichern
          </button>
          <button
            onClick={() => {
              setNaming(false);
              setName("");
              setPriv(false);
            }}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
          >
            Abbrechen
          </button>
        </span>
      ) : (
        <button
          onClick={() => setNaming(true)}
          disabled={!canSave}
          title={
            canSave
              ? "Aktuelle Filter (Charaktere, AU, Gegend) als neuen Plot speichern"
              : "Wähle zuerst Filter (Charaktere, AU oder Gegend) – ein Plot speichert die aktuellen Filter"
          }
          className="flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.8125rem] text-text-tertiary enabled:hover:text-accent enabled:hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" size={11} /> Als Plot speichern
        </button>
      )}
    </div>
  );
}

// Umschalter: Plot mit den betroffenen Spieler*innen teilen oder privat halten
function PlotPrivacy({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const opt = (on: boolean, label: string, title: string) => (
    <button
      type="button"
      onClick={() => onChange(on)}
      aria-pressed={value === on}
      title={title}
      className={`px-2 py-1 text-[0.8125rem] transition-colors ${
        value === on ? "bg-accent-soft text-text-primary" : "text-text-tertiary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex overflow-hidden rounded-md border border-border-subtle bg-bg-primary">
      {opt(false, "Mit Betroffenen teilen", "Sichtbar für alle Spieler*innen, deren Charaktere im Plot vorkommen")}
      <span className="w-px bg-border-subtle" />
      {opt(true, "Privat", "Nur für dich sichtbar")}
    </span>
  );
}

export const plotToolBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";

// Werkzeuge für den geöffneten Plot (Timeline und Szenen-Übersicht): umbenennen,
// privat/geteilt umstellen und löschen. Nur zeigen, wenn der Plot bearbeitet werden darf (`canEditPlot`).
export function PlotTools({ plot, onDeleted }: { plot: Plot; onDeleted: () => void }) {
  const { updatePlot, deletePlot } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function rename() {
    if (!name.trim()) return;
    updatePlot(plot.id, { name: name.trim() });
    setRenaming(false);
  }

  return (
    <>
      {renaming ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
            aria-label="Neuer Name des Plots"
            className="w-44 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
          <button
            onClick={rename}
            disabled={!name.trim()}
            className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
          >
            Speichern
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
            setName(plot.name);
            setRenaming(true);
          }}
          className={plotToolBtn}
        >
          <Icon name="edit" size={13} /> Umbenennen
        </button>
      )}
      <button
        onClick={() => updatePlot(plot.id, { private: !plot.private })}
        title={
          plot.private
            ? "Nur für dich sichtbar – klicken, um ihn mit den betroffenen Spieler*innen zu teilen"
            : "Für die betroffenen Spieler*innen sichtbar – klicken, um ihn privat zu stellen"
        }
        className={plotToolBtn}
      >
        <Icon name="lock" size={13} /> {plot.private ? "Privat" : "Geteilt"}
      </button>
      <button onClick={() => setConfirmDelete(true)} className={plotToolBtn}>
        <Icon name="trash" size={13} /> Plot löschen
      </button>
      {confirmDelete && (
        <ConfirmDialog
          title={`Plot „${plot.name}“ löschen?`}
          text="Der Plot mit seinen Off-Szenen wird endgültig gelöscht. Die gespielten Szenen selbst bleiben erhalten."
          confirmLabel="Plot löschen"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            deletePlot(plot.id);
            onDeleted();
          }}
        />
      )}
    </>
  );
}
