"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThingItem } from "@/lib/types";
import { loadImageFile, removeBackground, toCanvas, uploadCanvas } from "@/lib/cutout";
import { Icon } from "./Icon";
import { Toggle } from "./Toggle";
import { CropDialog } from "./CropDialog";

const MAX_THINGS = 12;
// Eingefügte Bilder (Strg/Cmd+V) gehen an das Whiteboard, das zuletzt berührt
// wurde – im Bearbeiten-Formular stehen zwei (Outfit und Pockets).
let pasteTarget: symbol | null = null;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// „Pockets": Gegenstände, die der Charakter bei sich hat, als Collage.
// Ansicht: die Bilder liegen frei auf durchsichtigem Grund. Bearbeiten (im
// „Bearbeiten"-Formular des Profils): ein kleines Whiteboard – Bilder hinzufügen
// (auf Wunsch mit entferntem Hintergrund), mit Maus oder Finger verschieben,
// Größe und Drehung direkt am Objekt einstellen.
// Positionen sind Prozente der Fläche, damit die Collage auf jedem Bildschirm
// gleich aussieht.
// Die Fläche ist 4:3 quer (Pockets: 16:15, siehe unten). Collagen, die noch auf der früheren Hochformat-Fläche
// (3:4) angelegt wurden, werden dafür verkleinert und mittig gesetzt (gleiche
// Anordnung, nur kleiner) – erkennbar am fehlenden Merker `l`. Danach gelten sie
// als umgerechnet, ein erneutes Anwenden ändert nichts mehr.
const LEGACY_SCALE = (3 / 4) / (4 / 3);
// Pockets liegen auf einer höheren Fläche (16:15), damit sie so hoch ist wie das
// Handy daneben. Collagen von der 4:3-Fläche behalten Breite und Lage, nur die
// Höhe der Fläche wächst: y rückt zur Mitte (Merker `p`).
export const POCKETS_ASPECT = 16 / 15;
const POCKETS_SCALE = (3 / 4) / (1 / POCKETS_ASPECT);
const round1 = (n: number) => Math.round(n * 10) / 10;
export function fitBoard(items: ThingItem[], pockets = false): ThingItem[] {
  return items.map((t) => {
    const u = t.l ? t : { ...t, x: round1(50 + (t.x - 50) * LEGACY_SCALE), w: round1(t.w * LEGACY_SCALE), l: true };
    return !pockets || u.p ? u : { ...u, y: round1(50 + (u.y - 50) * POCKETS_SCALE), p: true };
  });
}

export function ThingsBoard({
  items: rawItems,
  onChange,
  fill = false,
  pockets = false,
}: {
  items: ThingItem[];
  fill?: boolean; // Ansicht: die ganze Spalte füllen (Looks → Style)
  pockets?: boolean; // Pockets: Fläche im Handy-Format (16:15) statt 4:3
  // Mit onChange ist die Fläche ein Whiteboard zum Bearbeiten (steckt im
  // „Bearbeiten"-Formular des Profils, das auch speichert); ohne nur Ansicht.
  onChange?: (items: ThingItem[]) => void;
}) {
  const items = useMemo(() => fitBoard(rawItems, pockets), [rawItems, pockets]);
  const editing = !!onChange;
  const setItems = (next: ThingItem[] | ((list: ThingItem[]) => ThingItem[])) =>
    onChange?.(typeof next === "function" ? next(items) : next);
  const [selected, setSelected] = useState<string | null>(null);
  const [cropping, setCropping] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const [me] = useState(() => Symbol("board"));
  // Laufende Geste: verschieben, Größe ändern (Ecke) oder drehen (Griff oben)
  const drag = useRef<{
    id: string;
    mode: "move" | "resize" | "rotate";
    dx: number;
    dy: number;
    start: number; // Abstand zur Mitte beim Greifen (resize)
    w: number; // Breite beim Greifen (resize)
  } | null>(null);

  // --- Bild hinzufügen (mit Vorschau fürs Freistellen) ---
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<HTMLImageElement | null>(null);
  const [cut, setCut] = useState(true);
  const [tolerance, setTolerance] = useState(35);
  const [busy, setBusy] = useState(false);

  // kleine Vorschau – das eigentliche Bild wird erst beim Hinzufügen gerechnet
  const preview = useMemo(() => {
    if (!pending) return null;
    const small = toCanvas(pending, 360);
    const result = cut ? removeBackground(small, tolerance) : small;
    // removeBackground gibt das Original zurück, wenn sonst nichts übrig bliebe
    return { src: result.toDataURL("image/png"), tooMuch: cut && result === small };
  }, [pending, cut, tolerance]);

  // Bilder per Kopieren & Einfügen (Strg/Cmd+V) – solange das Whiteboard offen ist
  useEffect(() => {
    if (!editing) return;
    pasteTarget ??= me;
    const onPaste = (e: ClipboardEvent) => {
      if (pasteTarget !== me) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (!f) return;
      e.preventDefault();
      void loadImageFile(f).then(setPending).catch(() => setPending(null));
    };
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("paste", onPaste);
      if (pasteTarget === me) pasteTarget = null;
    };
  }, [editing, me]);

  async function addPending() {
    if (!pending) return;
    setBusy(true);
    try {
      const full = toCanvas(pending, 800);
      const src = await uploadCanvas(cut ? removeBackground(full, tolerance) : full, "things");
      const id = `thing_${Math.random().toString(36).slice(2, 9)}`;
      setItems((list) => [...list, { id, src, x: 50, y: 50, w: 30, r: 0, l: true, ...(pockets ? { p: true } : {}) }]);
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

  // Zeigerposition relativ zur Mitte eines Gegenstands, in Pixeln
  function fromCenter(e: React.PointerEvent, t: ThingItem) {
    const rect = board.current!.getBoundingClientRect();
    return {
      x: e.clientX - (rect.left + (t.x / 100) * rect.width),
      y: e.clientY - (rect.top + (t.y / 100) * rect.height),
    };
  }
  // Zeiger-Handler für einen Griff am gewählten Gegenstand
  const handle = (t: ThingItem, mode: "resize" | "rotate") => ({
    onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const c = fromCenter(e, t);
      drag.current = { id: t.id, mode, dx: 0, dy: 0, start: Math.hypot(c.x, c.y) || 1, w: t.w };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLSpanElement>) => {
      const d = drag.current;
      if (!d || d.id !== t.id || d.mode !== mode) return;
      e.stopPropagation();
      const c = fromCenter(e, t);
      if (mode === "resize") {
        patch(t.id, { w: clamp(Math.round(d.w * (Math.hypot(c.x, c.y) / d.start)), 5, 150) });
      } else {
        // Griff sitzt oben: 0° = Zeiger genau über der Mitte
        const deg = Math.round((Math.atan2(c.y, c.x) * 180) / Math.PI + 90);
        patch(t.id, { r: ((((deg + 180) % 360) + 360) % 360) - 180 }); // auf -180…180 bringen
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  });

  const shown = items;
  const active = items.find((t) => t.id === selected);
  if (!editing && items.length === 0) return null;

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-40";
  const range = "w-full accent-[var(--accent)]";

  return (
    // Bearbeiten: Fläche links, Werkzeuge daneben (mobil darunter). Ansicht: nur
    // die Fläche. Überall gleich breit (höchstens 28rem), damit das Whiteboard
    // beim Bearbeiten so aussieht wie im Profil.
    <div
      onPointerEnter={() => editing && (pasteTarget = me)}
      onPointerDownCapture={() => editing && (pasteTarget = me)}
      className={
        editing
          ? "grid items-start gap-4 md:grid-cols-[minmax(0,28rem)_minmax(15rem,24rem)]"
          : `w-full min-w-0 ${fill ? "" : "max-w-[28rem]"}`
      }
    >
      {/* Die Fläche: fester Rahmen 4:3 (Pockets 16:15); in der Ansicht durchsichtig */}
      <div
        ref={board}
        onPointerDown={() => editing && setSelected(null)}
        className={`relative ${pockets ? "aspect-[16/15]" : "aspect-[4/3]"} w-full ${fill && !editing ? "" : "max-w-[28rem]"} overflow-hidden ${
          editing
            ? "touch-none rounded-xl border border-dashed border-border-strong bg-white/[0.04] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:10%_7.5%]"
            : ""
        }`}
      >
        {editing && shown.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[0.8125rem] text-text-tertiary">
            Füge ein Bild hinzu (oder per Einfügen aus der Zwischenablage) und schieb es an
            seinen Platz.
          </div>
        )}
        {shown.map((t) => {
          const isActive = editing && selected === t.id;
          return (
            <div
              key={t.id}
              onPointerDown={(e) => {
                if (!editing) return;
                e.preventDefault();
                e.stopPropagation();
                const p = pointerPos(e);
                drag.current = { id: t.id, mode: "move", dx: p.x - t.x, dy: p.y - t.y, start: 0, w: t.w };
                setSelected(t.id);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d || d.id !== t.id || d.mode !== "move") return;
                const p = pointerPos(e);
                patch(t.id, { x: clamp(p.x - d.dx, 0, 100), y: clamp(p.y - d.dy, 0, 100) });
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `${t.w}%`,
                transform: `translate(-50%, -50%) rotate(${t.r}deg)`,
              }}
              className={`absolute select-none ${editing ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
                isActive ? "outline outline-1 outline-accent" : ""
              }`}
            >
              {t.crop ? (
                // zugeschnitten: Rahmen im Seitenverhältnis des Ausschnitts, das Bild dahinter verschoben
                <div className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]">
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ aspectRatio: `${t.crop.w * t.crop.ar} / ${t.crop.h}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.src}
                      alt=""
                      draggable={false}
                      style={{
                        width: `${100 / t.crop.w}%`,
                        height: `${100 / t.crop.h}%`,
                        left: `${(-t.crop.x / t.crop.w) * 100}%`,
                        top: `${(-t.crop.y / t.crop.h) * 100}%`,
                      }}
                      className="absolute max-w-none"
                    />
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.src}
                  alt=""
                  draggable={false}
                  className="block w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]"
                />
              )}
              {/* Griffe wie im Bildbearbeitungsprogramm: Ecke = Größe, oben = Drehung */}
              {isActive && (
                <>
                  <span className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-accent" />
                  <span
                    {...handle(t, "rotate")}
                    title="Drehen"
                    className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-[calc(100%+1.25rem)] cursor-grab touch-none rounded-full border-2 border-accent bg-bg-surface"
                  />
                  {(
                    [
                      ["left-0 top-0 -translate-x-1/2 -translate-y-1/2", "nwse-resize"],
                      ["right-0 top-0 translate-x-1/2 -translate-y-1/2", "nesw-resize"],
                      ["left-0 bottom-0 -translate-x-1/2 translate-y-1/2", "nesw-resize"],
                      ["right-0 bottom-0 translate-x-1/2 translate-y-1/2", "nwse-resize"],
                    ] as const
                  ).map(([pos, cursor]) => (
                    <span
                      key={pos}
                      {...handle(t, "resize")}
                      title="Größe ändern"
                      style={{ cursor }}
                      className={`absolute h-3.5 w-3.5 touch-none rounded-sm border-2 border-accent bg-bg-surface ${pos}`}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {editing && cropping && items.some((t) => t.id === cropping) && (
        <CropDialog
          src={items.find((t) => t.id === cropping)!.src}
          crop={items.find((t) => t.id === cropping)!.crop}
          onCancel={() => setCropping(null)}
          onDone={(crop) => {
            patch(cropping, { crop });
            setCropping(null);
          }}
        />
      )}
      {editing && (
        <div className="flex min-w-0 max-w-[28rem] flex-col gap-3">
          {/* Gewählter Gegenstand: Größe, Drehung, Stapel, entfernen */}
          {active ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3 text-[0.8125rem] text-text-secondary">
              <label className="flex items-center gap-3">
                <span className="w-16 shrink-0">Größe</span>
                <input
                  type="range"
                  min={8}
                  max={150}
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
              <div className="flex flex-wrap gap-1.5 [&>button]:flex-1 [&>button]:justify-center [&>button]:whitespace-nowrap [&>button]:px-2">
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
                <button onClick={() => setCropping(active.id)} className={btn}>
                  Zuschneiden
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
                Tippe ein Bild an: Dann lässt es sich verschieben, an den Ecken in der Größe ändern,
                am Griff oben drehen und zuschneiden.
              </p>
            )
          )}

          {/* Neues Bild: Vorschau, Hintergrund entfernen, hinzufügen */}
          {pending ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md [background-color:#2a2a2e] [background-image:linear-gradient(45deg,#3a3a40_25%,transparent_25%,transparent_75%,#3a3a40_75%),linear-gradient(45deg,#3a3a40_25%,transparent_25%,transparent_75%,#3a3a40_75%)] [background-position:0_0,8px_8px] [background-size:16px_16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview && <img src={preview.src} alt="Vorschau" className="max-h-full max-w-full" />}
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
                        min={0}
                        max={100}
                        step={0.5}
                        value={tolerance}
                        onChange={(e) => setTolerance(parseFloat(e.target.value))}
                        className={`mt-1 block ${range}`}
                      />
                    </label>
                  )}
                  {preview?.tooMuch && (
                    <p className="text-[0.75rem] leading-snug text-text-secondary">
                      So würde alles wegfallen – Regler etwas zurücknehmen.
                    </p>
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

        </div>
      )}
    </div>
  );
}
