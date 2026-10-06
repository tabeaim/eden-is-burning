"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { bannerStyle, headersFor, pageHeader } from "@/lib/headers";
import { BannerPosition } from "../BannerPosition";
import { Icon } from "../Icon";
import { AREA_ORDER, EXTRA_AREAS, areaImage, areaName } from "@/lib/world";
import type { Theme } from "@/lib/types";
import { hint, label, pill, row } from "./ui";

const THEMES: [Theme, string][] = [
  ["dark", "Dunkel"],
  ["light", "Hell"],
];

// Seiten mit Header-Bild (erstes Pfadstück). Das Handy hat keinen Header.
const PAGES: [string, string][] = [
  ["dashboard", "Dashboard"],
  ["szenen", "Szenen"],
  ["orte", "Orte"],
  ["kalender", "Timeline"],
  ["charaktere", "Charaktere"],
  ["spieler", "Spieler*innen"],
  ["info", "Info"],
  ["einstellungen", "Einstellungen"],
];

// Gegenden mit Bild: die Stadtteile plus die Karten-Bereiche ohne Steckbrief
const AREA_KEYS: string[] = [...AREA_ORDER, ...Object.keys(EXTRA_AREAS)];
// Schlüssel im gemeinsamen Entwurfs-/Upload-Zustand: Gegenden mit Vorsatz
const AREA = "area:";

// Design: Standard-Farbmodus der App, Header-Bilder je Stil (dunkel/hell) und
// die Bilder der Gegenden.
export function AdminDesign() {
  const { appSettings, updateAppSettings } = useStore();
  const { theme } = useTheme();
  const defaultTheme: Theme = appSettings.defaultTheme === "light" ? "light" : "dark";
  // Für welchen Stil werden gerade Header gepflegt?
  const [style, setStyle] = useState<Theme>(theme);
  const headers = headersFor(appSettings, style);
  // Entwurf, solange der Ausschnitt-Regler bewegt wird (gespeichert beim Loslassen)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const target = useRef<string>("");

  const clearDraft = (key: string) =>
    setDraft((d) => {
      const rest = { ...d };
      delete rest[key];
      return rest;
    });
  const setHeader = (key: string, url: string | null) => {
    const next = { ...headers };
    if (url) next[key] = url;
    else delete next[key];
    updateAppSettings({
      headers: { dark: headersFor(appSettings, "dark"), light: headersFor(appSettings, "light"), [style]: next },
    });
  };
  const areaImages = appSettings.areaImages ?? {};
  const setAreaImage = (key: string, url: string | null) => {
    const next = { ...areaImages };
    if (url) next[key] = url;
    else delete next[key];
    updateAppSettings({ areaImages: next });
  };
  async function onFile(f: File | undefined) {
    const key = target.current;
    if (!f || !key) return;
    setBusy(key);
    try {
      clearDraft(key);
      const url = await uploadImage(f, "headers", IMAGE_SIZES.banner);
      if (key.startsWith(AREA)) setAreaImage(key.slice(AREA.length), url);
      else setHeader(key, url);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Standard-Farbmodus */}
      <div>
        <div className={`${label} mb-2`}>Farbmodus für alle</div>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(([key, name]) => (
            <button
              key={key}
              onClick={() => updateAppSettings({ defaultTheme: key === "dark" ? null : key })}
              aria-pressed={defaultTheme === key}
              className={pill(defaultTheme === key)}
            >
              {name}
            </button>
          ))}
        </div>
        <p className={`${hint} mt-2`}>
          Gilt für alle, die unter Einstellungen → Darstellung keinen eigenen Modus gewählt haben. Der helle Stil nutzt
          Creme- und Orange-Töne.
        </p>
      </div>

      {/* Header-Bilder je Stil */}
      <div>
        <div className={`${label} mb-2`}>Header-Bilder der Seiten</div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {THEMES.map(([key, name]) => (
            <button key={key} onClick={() => setStyle(key)} aria-pressed={style === key} className={pill(style === key)}>
              Stil {name.toLowerCase()}
            </button>
          ))}
        </div>
        <p className={`${hint} mb-3`}>
          Je Stil ein eigenes Bild pro Seite – im dunklen Stil passen dunkle, im hellen helle Fotos. Ohne eigenes Bild
          gilt der generierte Standard-Header. Eigene Header von Szenen, Orten, Charakteren und Spieler*innen haben
          Vorrang.
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
                  style={bannerStyle(url || pageHeader(key, style))}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
                  <button
                    disabled={busy === key}
                    onClick={() => {
                      target.current = key;
                      file.current?.click();
                    }}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-black/50 px-2.5 py-1.5 text-[0.8125rem] text-white hover:bg-black/70 disabled:opacity-50"
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
                      clearDraft(key);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bilder der Gegenden */}
      <div>
        <div className={`${label} mb-2`}>Bilder der Gegenden</div>
        <p className={`${hint} mb-3`}>
          Erscheinen im Gegend-Panel der Karte und auf Ortskarten, deren Ort weder Titelbild noch Vibes-Foto hat. Gelten
          für beide Stile. Ohne eigenes Bild steht ein Platzhalter.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {AREA_KEYS.map((area) => {
            const key = AREA + area;
            const own = areaImages[area];
            const url = draft[key] ?? own;
            return (
              <div key={key} className={`${row} p-3`}>
                <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] text-text-primary">
                  {areaName(area)}
                  {own && (
                    <button
                      onClick={() => setAreaImage(area, null)}
                      className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
                    >
                      Standard
                    </button>
                  )}
                </div>
                <div
                  className="relative h-24 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-primary bg-cover"
                  style={bannerStyle(url || areaImage(area, null))}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
                  <button
                    disabled={busy === key}
                    onClick={() => {
                      target.current = key;
                      file.current?.click();
                    }}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-black/50 px-2.5 py-1.5 text-[0.8125rem] text-white hover:bg-black/70 disabled:opacity-50"
                  >
                    <Icon name="upload" size={14} /> {busy === key ? "Lädt hoch…" : "Bild hochladen"}
                  </button>
                </div>
                {own && (
                  <BannerPosition
                    url={url!}
                    onChange={(u) => setDraft((d) => ({ ...d, [key]: u }))}
                    onCommit={(u) => {
                      if (u !== own) setAreaImage(area, u);
                      clearDraft(key);
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
