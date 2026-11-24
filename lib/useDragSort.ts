"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Sortieren per Ziehen – für Listen und Raster (Apps, Fotos, Notizen).
// Maus: Element festhalten und ziehen (ein einfacher Klick bleibt ein Klick).
// Touch: kurz gedrückt halten, bis es sich hebt, dann ziehen – normales Wischen
// scrollt weiter. Beim Loslassen wird die neue Reihenfolge einmal gespeichert.
const HOLD_MS = 350; // Touch: so lange halten, bis das Ziehen beginnt
const SLOP = 6; // px Bewegung, ab der die Maus zieht bzw. Touch als Scrollen gilt

type Drag = {
  key: string;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  grabX: number; // Abstand Zeiger – linke obere Ecke des Elements
  grabY: number;
  active: boolean; // Ziehen hat begonnen (nach Halten bzw. Bewegung)
  timer: number | null;
  stop: AbortController; // entfernt die Fenster-Listener wieder
};

export function useDragSort<T>(
  items: T[],
  keyOf: (item: T) => string,
  onCommit: (next: T[]) => void,
  enabled = true,
) {
  const [preview, setPreview] = useState<T[] | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const drag = useRef<Drag | null>(null);
  const order = useRef<T[]>(items); // aktuelle (Vorschau-)Reihenfolge für die Handler
  const latest = useRef({ items, keyOf, onCommit });
  useEffect(() => {
    latest.current = { items, keyOf, onCommit };
    if (!drag.current) order.current = items;
  });

  // Das gezogene Element folgt dem Zeiger, egal wo es gerade im Raster steht
  const place = () => {
    const d = drag.current;
    const el = d && els.current.get(d.key);
    if (!d || !el) return;
    el.style.transform = "";
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${d.x - d.grabX - r.left}px, ${d.y - d.grabY - r.top}px) scale(1.06)`;
  };
  useLayoutEffect(place, [preview]);

  // Während des Ziehens am Touchscreen nicht scrollen (muss „non-passive" sein)
  useEffect(() => {
    const stop = (e: TouchEvent) => {
      if (drag.current?.active) e.preventDefault();
    };
    document.addEventListener("touchmove", stop, { passive: false });
    return () => {
      document.removeEventListener("touchmove", stop);
      drag.current?.stop.abort();
    };
  }, []);

  function begin() {
    const d = drag.current;
    const el = d && els.current.get(d.key);
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    d.grabX = d.startX - r.left;
    d.grabY = d.startY - r.top;
    d.active = true;
    order.current = latest.current.items;
    setDragKey(d.key);
    setPreview(latest.current.items);
    if (d.touch) navigator.vibrate?.(10);
    place();
  }

  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.active) {
      if (Math.hypot(d.x - d.startX, d.y - d.startY) < SLOP) return;
      if (d.touch) return finish(false); // Wischen = Scrollen
      begin();
      return;
    }
    place();
    // Über welchem anderen Element steht der Zeiger? Dorthin rücken.
    const { keyOf } = latest.current;
    const list = order.current;
    const over = list.find((it) => {
      const k = keyOf(it);
      if (k === d.key) return false;
      const r = els.current.get(k)?.getBoundingClientRect();
      return !!r && d.x >= r.left && d.x <= r.right && d.y >= r.top && d.y <= r.bottom;
    });
    if (!over) return;
    const from = list.findIndex((it) => keyOf(it) === d.key);
    const to = list.indexOf(over);
    const next = [...list];
    next.splice(to, 0, ...next.splice(from, 1));
    order.current = next;
    setPreview(next);
  }

  function finish(commit: boolean) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.stop.abort();
    if (d.timer) window.clearTimeout(d.timer);
    const el = els.current.get(d.key);
    if (el) el.style.transform = "";
    if (!d.active) return;
    // Der Klick nach dem Loslassen soll nichts öffnen
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    const { items: base, keyOf, onCommit: save } = latest.current;
    const next = order.current;
    order.current = base;
    setDragKey(null);
    setPreview(null);
    if (commit && next.length === base.length && next.some((it, i) => keyOf(it) !== keyOf(base[i]))) {
      save(next);
    }
  }
  const onUp = (e: PointerEvent) => {
    if (drag.current && e.pointerId === drag.current.pointerId) finish(true);
  };
  const onCancel = (e: PointerEvent) => {
    if (drag.current && e.pointerId === drag.current.pointerId) finish(false);
  };

  function onPointerDown(key: string, e: ReactPointerEvent) {
    if (!enabled || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const touch = e.pointerType !== "mouse";
    const stop = new AbortController();
    drag.current = {
      key,
      pointerId: e.pointerId,
      touch,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      grabX: 0,
      grabY: 0,
      active: false,
      timer: touch ? window.setTimeout(begin, HOLD_MS) : null,
      stop,
    };
    window.addEventListener("pointermove", onMove, { signal: stop.signal });
    window.addEventListener("pointerup", onUp, { signal: stop.signal });
    window.addEventListener("pointercancel", onCancel, { signal: stop.signal });
  }

  // Auf jedes sortierbare Element legen
  const itemProps = (key: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) els.current.set(key, el);
      else els.current.delete(key);
    },
    onPointerDown: (e: ReactPointerEvent) => onPointerDown(key, e),
    // kein Bild-/Link-Ziehen des Browsers und kein Kontextmenü beim Halten
    onDragStart: (e: { preventDefault: () => void }) => {
      if (enabled) e.preventDefault();
    },
    onContextMenu: (e: { preventDefault: () => void }) => {
      if (enabled && drag.current?.touch) e.preventDefault();
    },
    "data-dragging": dragKey === key ? "" : undefined,
    style: enabled ? ({ WebkitTouchCallout: "none" } as const) : undefined,
    className:
      (enabled ? "select-none " : "") +
      (dragKey === key ? "relative z-30 cursor-grabbing opacity-90 drop-shadow-xl" : ""),
  });

  return { list: preview ?? items, dragging: dragKey !== null, itemProps };
}
