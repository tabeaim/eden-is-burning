"use client";

import { useCallback, useState } from "react";

// Wie `useState`, merkt sich den Wert aber für die Sitzung (sessionStorage): Filter,
// Reiter und Sortierung einer Liste bleiben stehen, wenn man zwischendurch einen
// anderen Menüpunkt öffnet – bis der Tab bzw. die App geschlossen wird.
// (Die Seiten werden erst nach dem Laden im Browser gezeichnet, siehe AppShell –
// der Merker lässt sich deshalb gleich beim ersten Zeichnen lesen.)
export function useSessionState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = `eden:filter:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(v));
        } catch {
          /* ignore */
        }
        return v;
      }),
    [storageKey],
  );
  return [value, set];
}
