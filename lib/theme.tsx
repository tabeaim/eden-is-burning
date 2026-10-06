"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useStore } from "./store";
import type { Theme } from "./types";

// Farbmodus (dunkel/hell). Wer selbst gewählt hat (pro Gerät gemerkt), behält seine
// Wahl; sonst gilt der Standard, den Admins festlegen (Einstellungen → Admin →
// Design), und ohne Angabe der dunkle Stil. Das Attribut data-theme am <html>
// schaltet die Farben um (siehe globals.css); ein kleines Skript im Layout setzt es
// schon vor dem ersten Zeichnen, damit nichts aufblitzt.
const KEY = "eden:theme";
const DEFAULT_KEY = "eden:theme-default";

interface ThemeValue {
  theme: Theme;
  // Eigene Wahl (null = Standard der App)
  chosen: Theme | null;
  setTheme: (t: Theme | null) => void;
}
const ThemeCtx = createContext<ThemeValue>({ theme: "dark", chosen: null, setTheme: () => {} });

export function useTheme(): ThemeValue {
  return useContext(ThemeCtx);
}

// Eigene Wahl aus dem lokalen Speicher (auf dem Server: keine Wahl)
const listeners = new Set<() => void>();
function readChosen(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appSettings } = useStore();
  const chosen = useSyncExternalStore(subscribe, readChosen, () => null);
  const fallback: Theme = appSettings.defaultTheme === "light" ? "light" : "dark";
  const theme = chosen ?? fallback;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  // Standard für den nächsten Start merken (vor dem Laden der Einstellungen)
  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_KEY, fallback);
    } catch {
      /* ignore */
    }
  }, [fallback]);

  const setTheme = useCallback((t: Theme | null) => {
    try {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);
  const value = useMemo(() => ({ theme, chosen, setTheme }), [theme, chosen, setTheme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

// Läuft vor dem ersten Zeichnen (siehe app/layout.tsx)
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem("${KEY}")||localStorage.getItem("${DEFAULT_KEY}");if(t==="light"||t==="dark")d.dataset.theme=t}catch(e){}`;
