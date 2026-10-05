"use client";

import { useMemo, useRef, useState } from "react";
import type { Character, ThingItem } from "@/lib/types";
import { useStore } from "@/lib/store";
import { loadImageFile, removeBackground, toCanvas, uploadCanvas } from "@/lib/cutout";
import { Icon } from "./Icon";
import { Toggle } from "./Toggle";

const MAX_THINGS = 12;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// „Personal Things": Gegenstände, die der Charakter bei sich hat, als Collage.
// Ansicht: die Bilder liegen frei auf durchsichtigem Grund. Bearbeiten: ein
// kleines Whiteboard – Bilder hinzufügen (auf Wunsch mit entferntem Hintergrund),
// mit Maus oder Finger verschieben, Größe und Drehung einstellen, speichern.
// Positionen sind Prozente der Fläche, damit die Collage auf jedem Bildschirm
// gleich aussieht.
export function ThingsBoard({ character, canEdit }: { character: Character; canEdit: boolean }) {
  const { updateCharacter } = useStore();
  const saved = character.profile?.things ?? [];
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<ThingItem[]>(saved);
  const [selected, setSelected] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // --- Bild hinzufügen (mit Vorschau fürs Freistellen) ---
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<HTMLImageElement | null>(null);
  const [cut, setCut] = useState(true);
  const [tolerance, setTolerance] = useState(30);
  const [busy, setBusy] = useState(false);

  // kleine Vorschau – das eigentliche Bild wird erst beim Hinzufügen gerechnet
  const preview = useMemo(() => {
    if (!pending) return null;
    const small = toCanvas(pending, 360);
    return (cut ? removeBackground(small, tolerance) : small).toDataURL("image/png");
  }, [pending, cut, tolerance]);

  async function addPending() {
    if (!pending) return;
    setBusy(true);
    try {
      const full = toCanvas(pending, 800);
      const src = await uploadCanvas(cut ? removeBackground(full, tolerance) : full, "things");
      const id = `thing_${Math.random().toString(36).slice(2, 9)}`;
      setItems((list) => [...list, { id, src, x: 50, y: 50, w: 34, r: 0 }]);
      setSelected(id);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  const patch = (id: string, change: Partial<ThingItem>) =>
    setItems((list) => list.map((t) => (t.id === id ? { ...t, ...change } : t)));

  function pointerPos(e: React.PointerEvent) {
    const rect = board.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function start() {
    setItems(saved);
    setSelected(null);
    setEditing(true);
  }
  function save() {
    updateCharacter(character.id, { profile: { ...(character.profile ?? {}), things: items } });
    setEditing(false);
    setPending(null);
  }

  const shown = editing ? items : saved;
  const active = items.find((t) => t.id === selected);
  if (!editing && saved.length === 0 && !canEdit) return null;

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-40";
  const range = "w-full accent-[var(--accent)]";

  return (
    <div className="min-w-0 flex-1">
      {/* Die Fläche: fester Rahmen 3:4; in der Ansicht durchsichtig */}
      <div
        ref={board}
        onPointerDown={() => editing && setSelected(null)}
        className={`relative aspect-[3/4] w-full max-w-[26rem] overflow-hidden ${
          editing
            ? "touch-none rounded-xl border border-dashed border-border-strong bg-white/[0.04] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:10%_7.5%]"
            : ""
        }`}
      >
        {shown.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[0.8125rem] text-text-tertiary">
            {editing
              ? "Füge unten ein Bild hinzu und schieb es an seinen Platz."
              : "Noch keine Gegenstände – was hat der Charakter immer dabei?"}
          </div>
        )}
        {shown.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.id}
            src={t.src}
            alt=""
            draggable={false}
            onPointerDown={(e) => {
              if (!editing) return;
              e.preventDefault();
              e.stopPropagation();
              const p = pointerPos(e);
              drag.current = { id: t.id, dx: p.x - t.x, dy: p.y - t.y };
              setSelected(t.id);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current?.id !== t.id) return;
              const p = pointerPos(e);
              patch(t.id, { x: clamp(p.x - drag.current.dx, 0, 100), y: clamp(p.y - drag.current.dy, 0, 100) });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: `${t.w}%`,
              transform: `translate(-50%, -50%) rotate(${t.r}deg)`,
            }}
            className={`absolute select-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)] ${
              editing ? "cursor-grab touch-none active:cursor-grabbing" : ""
            } ${editing && selected === t.id ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
          />
        ))}
      </div>

      {!editing && canEdit && (
        <button onClick={start} className={`${btn} mt-3`}>
          <Icon name="edit" size={14} /> Gegenstände bearbeiten
        </button>
      )}

      {editing && (
        <div className="mt-3 flex max-w-[26rem] flex-col gap-3">
          {/* Gewählter Gegenstand: Größe, Drehung, Stapel, entfernen */}
          {active ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3 text-[0.8125rem] text-text-secondary">
              <label className="flex items-center gap-3">
                <span className="w-16 shrink-0">Größe</span>
                <input
                  type="range"
                  min={8}
                  max={95}
                  value={active.w}
                  onChange={(e) => patch(active.id, { w: parseInt(e.target.value, 10) })}
                  className={range}
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="w-16 shrink-0">Drehung</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={active.r}
                  onChange={(e) => patch(active.id, { r: parseInt(e.target.value, 10) })}
                  className={range}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setItems((list) => [...list.filter((t) => t.id !== active.id), active])}
                  className={btn}
                >
                  Nach vorn
                </button>
                <button
                  onClick={() => setItems((list) => [active, ...list.filter((t) => t.id !== active.id)])}
                  className={btn}
                >
                  Nach hinten
                </button>
                <button
                  onClick={() => {
                    setItems((list) => list.filter((t) => t.id !== active.id));
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
                >
                  <Icon name="trash" size={14} /> Entfernen
                </button>
              </div>
            </div>
          ) : (
            items.length > 0 && (
              <p className="text-[0.8125rem] text-text-tertiary">
                Tippe einen Gegenstand an, um ihn zu verschieben, zu drehen oder die Größe zu ändern.
              </p>
            )
          )}

          {/* Neues Bild: Vorschau, Hintergrund entfernen, hinzufügen */}
          {pending ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md [background-color:#2a2a2e] [background-image:linear-gradient(45deg,#3a3a40_25%,transparent_25%,transparent_75%,#3a3a40_75%),linear-gradient(45deg,#3a3a40_25%,transparent_25%,transparent_75%,#3a3a40_75%)] [background-position:0_0,8px_8px] [background-size:16px_16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview && <img src={preview} alt="Vorschau" className="max-h-full max-w-full" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Toggle checked={cut} onChange={setCut}>
                    Hintergrund entfernen
                  </Toggle>
                  {cut && (
                    <label className="text-[0.8125rem] text-text-secondary">
                      Wie viel wegnehmen
                      <input
                        type="range"
                        min={2}
                        max={90}
                        value={tolerance}
                        onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                        className={`mt-1 block ${range}`}
                      />
                    </label>
                  )}
                  <p className="text-[0.75rem] leading-snug text-text-tertiary">
                    Klappt am besten bei einem Gegenstand vor einfarbigem Hintergrund. Schon
                    freigestellte Bilder (PNG) brauchen den Schalter nicht.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setPending(null)} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
                  Verwerfen
                </button>
                <button
                  onClick={() => void addPending()}
                  disabled={busy}
                  className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
                >
                  {busy ? "Lädt…" : "Aufs Whiteboard legen"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => file.current?.click()}
              disabled={items.length >= MAX_THINGS}
              className="flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent disabled:opacity-40"
            >
              <Icon name="plus" size={12} /> Bild hinzufügen ({items.length}/{MAX_THINGS})
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void loadImageFile(f).then(setPending).catch(() => setPending(null));
            }}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-3">
            <button
              onClick={() => {
                setEditing(false);
                setPending(null);
              }}
              className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Abbrechen
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
            >
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
