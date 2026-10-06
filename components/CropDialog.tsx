"use client";

import { useEffect, useRef, useState } from "react";
import type { ThingCrop } from "@/lib/types";

type Rect = { x: number; y: number; w: number; h: number };
const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.06; // kleinster Ausschnitt (Anteil der Bildkante)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Bild zuschneiden (Whiteboard): Rahmen verschieben oder an den Ecken ziehen.
// Das Bild selbst bleibt unverändert – gespeichert wird nur der Ausschnitt
// (Anteile des Originals), er lässt sich also jederzeit wieder ändern.
export function CropDialog({
  src,
  crop,
  onDone,
  onCancel,
}: {
  src: string;
  crop?: ThingCrop | null;
  onDone: (crop: ThingCrop | null) => void;
  onCancel: () => void;
}) {
  const [rect, setRect] = useState<Rect>(crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : FULL);
  const [ar, setAr] = useState(crop?.ar ?? 0);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: string; px: number; py: number; start: Rect } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  type Mode = "move" | "nw" | "ne" | "sw" | "se";
  function pos(e: React.PointerEvent) {
    const r = box.current!.getBoundingClientRect();
    return { px: (e.clientX - r.left) / r.width, py: (e.clientY - r.top) / r.height };
  }
  function down(mode: Mode, e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, ...pos(e), start: rect };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(mode: Mode, e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.mode !== mode) return;
    const p = pos(e);
    const dx = p.px - d.px;
    const dy = p.py - d.py;
    const s = d.start;
    if (mode === "move") {
      setRect({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    // Ecke ziehen: die gegenüberliegende Ecke bleibt stehen
    const left = mode === "nw" || mode === "sw" ? clamp(s.x + dx, 0, s.x + s.w - MIN) : s.x;
    const right = mode === "ne" || mode === "se" ? clamp(s.x + s.w + dx, s.x + MIN, 1) : s.x + s.w;
    const top = mode === "nw" || mode === "ne" ? clamp(s.y + dy, 0, s.y + s.h - MIN) : s.y;
    const bottom = mode === "sw" || mode === "se" ? clamp(s.y + s.h + dy, s.y + MIN, 1) : s.y + s.h;
    setRect({ x: left, y: top, w: right - left, h: bottom - top });
  }
  function up() {
    drag.current = null;
  }
  const corners: [Mode, string, string][] = [
    ["nw", "nwse-resize", "-left-2 -top-2"],
    ["ne", "nesw-resize", "-right-2 -top-2"],
    ["sw", "nesw-resize", "-bottom-2 -left-2"],
    ["se", "nwse-resize", "-bottom-2 -right-2"],
  ];

  const full = rect.w > 0.995 && rect.h > 0.995;
  const handle = "absolute h-4 w-4 touch-none rounded-sm border-2 border-accent bg-bg-surface";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bild zuschneiden"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-2xl shadow-black/70"
      >
        <div className="font-serif text-[1rem] text-text-primary">Bild zuschneiden</div>
        <div className="flex min-h-0 justify-center">
          <div ref={box} className="relative inline-block touch-none select-none overflow-hidden rounded-md [background-color:#2a2a2e]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setAr(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))}
              className="block max-h-[60vh] max-w-full"
            />
            {/* Rahmen: alles außerhalb ist abgedunkelt */}
            <div
              onPointerDown={(e) => down("move", e)}
              onPointerMove={(e) => move("move", e)}
              onPointerUp={up}
              onPointerCancel={up}
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
              }}
              className="absolute cursor-move touch-none outline outline-1 outline-accent [box-shadow:0_0_0_9999px_rgba(0,0,0,0.65)]"
            >
              {corners.map(([mode, cursor, at]) => (
                <span
                  key={mode}
                  onPointerDown={(e) => down(mode, e)}
                  onPointerMove={(e) => move(mode, e)}
                  onPointerUp={up}
                  onPointerCancel={up}
                  style={{ cursor }}
                  className={`${handle} ${at}`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-[0.8125rem] text-text-tertiary">
          Rahmen verschieben oder an den Ecken ziehen. Das Original bleibt erhalten – du kannst den
          Ausschnitt später wieder ändern.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => setRect(FULL)}
            disabled={full}
            className="mr-auto px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary disabled:opacity-40"
          >
            Ganzes Bild
          </button>
          <button onClick={onCancel} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            onClick={() => onDone(full || !ar ? null : { ...rect, ar })}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
