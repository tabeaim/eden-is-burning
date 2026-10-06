"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { bannerStyle, pageHeader } from "@/lib/headers";
import { BannerPosition } from "../BannerPosition";
import { Icon } from "../Icon";
import { btn, hint, label, row } from "./ui";

// Primärfarben zur Auswahl; die erste ist das Standard-Orange der App
const COLORS: [string, string][] = [
  ["#e89a3c", "Feuer-Orange"],
  ["#e0524b", "Rot"],
  ["#d9648f", "Rosa"],
  ["#9b7be0", "Violett"],
  ["#5aa0e8", "Blau"],
  ["#3fb8a5", "Türkis"],
  ["#7fbf5a", "Grün"],
  ["#e6c34a", "Gelb"],
  ["#d8d4cc", "Silber"],
];
const DEFAULT_COLOR = COLORS[0][0];

// Seiten mit Header-Bild (erstes Pfadstück). Das Handy hat keinen Header.
const PAGES: [string, string][] = [
  ["dashboard", "Dashboard"],
  ["szenen", "Szenen"],
  ["orte", "Karte"],
  ["kalender", "Timeline"],
  ["charaktere", "Charaktere"],
  ["spieler", "Spieler*innen"],
  ["info", "Info"],
  ["einstellungen", "Einstellungen"],
];

export function AdminDesign() {
  const { appSettings, updateAppSettings } = useStore();
  const headers = appSettings.headers ?? {};
  const accent = appSettings.accent ?? DEFAULT_COLOR;
  // Entwurf, solange der Ausschnitt-Regler bewegt wird (gespeichert beim Loslassen)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const target = useRef<string>("");

  const setHeader = (key: string, url: string | null) => {
    const next = { ...headers };
    if (url) next[key] = url;
    else delete next[key];
    updateAppSettings({ headers: next });
  };
  async function onFile(f: File | undefined) {
    const key = target.current;
    if (!f || !key) return;
    setBusy(key);
    try {
      setDraft((d) => {
        const { [key]: _drop, ...rest } = d;
        void _drop;
        return rest;
      });
      setHeader(key, await uploadImage(f, "headers", IMAGE_SIZES.banner));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Primärfarbe */}
      <div>
        <div className={`${label} mb-2`}>Primärfarbe der App</div>
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map(([hex, name]) => (
            <button
              key={hex}
              onClick={() => updateAppSettings({ accent: hex === DEFAULT_COLOR ? null : hex })}
              title={name}
              aria-label={name}
              aria-pressed={accent.toLowerCase() === hex}
              style={{ backgroundColor: hex }}
              className={`h-9 w-9 rounded-full border border-border-subtle ${
                accent.toLowerCase() === hex ? "ring-2 ring-text-primary ring-offset-2 ring-offset-bg-surface" : ""
              }`}
            />
          ))}
          <label className="flex items-center gap-2 pl-2 text-[0.8125rem] text-text-secondary">
            eigene
            <input
              type="color"
              value={accent}
              onChange={(e) => updateAppSettings({ accent: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border border-border-subtle bg-transparent"
            />
          </label>
          {appSettings.accent && (
            <button onClick={() => updateAppSettings({ accent: null })} className={btn}>
              Standard
            </button>
          )}
        </div>
        <p className={`${hint} mt-2`}>
          Gilt für alle: Pillen, Knöpfe, Überschriften, Akzente. Wähle eine Farbe, auf der schwarze Schrift gut lesbar ist.
        </p>
      </div>

      {/* Header-Bilder */}
      <div>
        <div className={`${label} mb-1`}>Header-Bilder der Seiten</div>
        <p className={`${hint} mb-3`}>
          Das Bild oben auf jeder Seite, für alle. Ohne eigenes Bild gilt der Standard-Header. Eigene Header von
          Szenen, Orten, Charakteren und Spieler*innen haben Vorrang. Querformat wirkt am besten.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAGES.map(([key, name]) => {
            const url = draft[key] ?? headers[key];
            return (
              <div key={key} className={`${row} p-3`}>
                <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] text-text-primary">
                  {name}
                  {headers[key] && (
                    <button
                      onClick={() => setHeader(key, null)}
                      className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
                    >
                      Standard
                    </button>
                  )}
                </div>
                <div
                  className="relative h-24 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-primary bg-cover"
                  style={bannerStyle(url || pageHeader(key))}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
                  <button
                    disabled={busy === key}
                    onClick={() => {
                      target.current = key;
                      file.current?.click();
                    }}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-black/50 px-2.5 py-1.5 text-[0.8125rem] text-text-primary hover:bg-black/70 disabled:opacity-50"
                  >
                    <Icon name="upload" size={14} /> {busy === key ? "Lädt hoch…" : "Bild hochladen"}
                  </button>
                </div>
                {headers[key] && (
                  <BannerPosition
                    url={url!}
                    onChange={(u) => setDraft((d) => ({ ...d, [key]: u }))}
                    onCommit={(u) => {
                      if (u !== headers[key]) setHeader(key, u);
                      setDraft((d) => {
                        const { [key]: _drop, ...rest } = d;
                        void _drop;
                        return rest;
                      });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onFile(f);
          }}
        />
      </div>
    </div>
  );
}
