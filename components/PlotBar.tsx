"use client";

import { useState } from "react";
import type { Plot } from "@/lib/types";
import { Icon } from "./Icon";

// Plot-Zeile in den Filterleisten (Timeline und Szenen-Übersicht): Plots öffnen/
// schließen und die aktuellen Filter als neuen Plot speichern.
export function PlotBar({
  plots,
  activeId,
  onToggle,
  onSave,
}: {
  plots: Plot[]; // nur die für mich sichtbaren
  activeId: string | null;
  onToggle: (plot: Plot) => void;
  onSave: (name: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  function save() {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    setNaming(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
      <span className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">Plots</span>
      {plots.length === 0 && !naming && (
        <span className="text-[0.875rem] text-text-tertiary">— noch keine</span>
      )}
      {plots.map((p) => (
        <button
          key={p.id}
          onClick={() => onToggle(p)}
          title={activeId === p.id ? "Plot schließen" : "Plot öffnen"}
          className={`rounded-full border px-2.5 py-0.5 text-[0.8125rem] transition-colors ${
            activeId === p.id
              ? "border-accent/60 bg-accent-soft text-text-primary"
              : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
          }`}
        >
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
            }}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
          >
            Abbrechen
          </button>
        </span>
      ) : (
        <button
          onClick={() => setNaming(true)}
          title="Aktuelle Filter (Charaktere, AU, Gegend) als neuen Plot speichern"
          className="flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.8125rem] text-text-tertiary hover:text-accent hover:border-accent/50"
        >
          <Icon name="plus" size={11} /> Als Plot speichern
        </button>
      )}
    </div>
  );
}
