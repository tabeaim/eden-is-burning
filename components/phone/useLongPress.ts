"use client";

import { useRef } from "react";

// Langes Drücken (Finger/Stift) als Ersatz für den Rechtsklick auf dem Handy.
// `bind(arg)` liefert die Zeiger-Handler für ein Element; `suppressClick` gehört in
// dessen onClick, damit nach dem langen Drücken nicht auch noch der Klick auslöst.
export function useLongPress<T>(onLongPress: (arg: T) => void, ms = 550) {
  const state = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean; x: number; y: number }>({
    timer: null,
    fired: false,
    x: 0,
    y: 0,
  });
  const cancel = () => {
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = null;
  };
  const bind = (arg: T) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      state.current.fired = false;
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      cancel();
      state.current.timer = setTimeout(() => {
        state.current.fired = true;
        onLongPress(arg);
      }, ms);
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    // ein Finger liegt nie ganz still – erst echtes Wischen bricht ab
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.hypot(e.clientX - state.current.x, e.clientY - state.current.y) > 10) cancel();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!state.current.fired) return;
      e.preventDefault();
      e.stopPropagation();
      state.current.fired = false;
    },
  });
  return bind;
}
