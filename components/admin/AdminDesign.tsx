"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { bannerStyle, fallbackHeader, headersFor, standardHeader } from "@/lib/headers";
import { BannerPosition } from "../BannerPosition";
import { ConfirmDialog } from "../ConfirmDialog";
import { Icon } from "../Icon";
import { AREA_ORDER, EXTRA_AREAS, areaImage, areaName } from "@/lib/world";
import type { Theme } from "@/lib/types";
import { characterImage, playerImage } from "@/lib/avatar";
import { btnDanger, hint, label, pill, row } from "./ui";

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
const AVATAR = "avatar:";
const BACKGROUND = "background";
const STANDARD = "standard:banner";

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
  // Standard-Banner des gewählten Stils: Das Bild im Feld ist zunächst nur ein
  // Entwurf zum Ausprobieren (Bild, Ausschnitt). Erst „Überschreiben" übernimmt es
  // als geltenden Standard und entfernt die eigenen Header-Bilder der Seiten in
  // diesem Stil. Eigene Banner von Szenen, Profilen, Dashboards und Orten bleiben.
  const applied = appSettings.standardHeader?.[style] ?? null;
  const pendingDraft = appSettings.standardHeaderDraft?.[style];
  const standard = pendingDraft === undefined ? applied : pendingDraft;
  const pending = standard !== applied;
  const setStandard = (url: string | null) =>
    updateAppSettings({ standardHeaderDraft: { ...appSettings.standardHeaderDraft, [style]: url } });
  const pageCount = Object.keys(headers).length;
  const [overwrite, setOverwrite] = useState(false);
  const overwritePages = () => {
    setDraft({});
    const drafts = { ...appSettings.standardHeaderDraft };
    delete drafts[style];
    updateAppSettings({
      standardHeader: { ...appSettings.standardHeader, [style]: standard },
      standardHeaderDraft: drafts,
      headers: { dark: headersFor(appSettings, "dark"), light: headersFor(appSettings, "light"), [style]: {} },
    });
  };
  const areaImages = appSettings.areaImages ?? {};
  const setAreaImage = (key: string, url: string | null) => {
    const next = { ...areaImages };
    if (url) next[key] = url;
    else delete next[key];
    updateAppSettings({ areaImages: next });
  };
  // Hintergrund der Seiten für den gewählten Stil
  const background = appSettings.background?.[style] ?? {};
  const setBackground = (patch: { url?: string | null; opacity?: number | null }) =>
    updateAppSettings({ background: { ...appSettings.background, [style]: { ...background, ...patch } } });
  // Deckkraft, solange der Regler bewegt wird (gespeichert beim Loslassen)
  const [opacityDraft, setOpacityDraft] = useState<number | null>(null);
  const opacity = opacityDraft ?? background.opacity ?? 100;
  const commitOpacity = () => {
    if (opacityDraft !== null && opacityDraft !== (background.opacity ?? 100)) setBackground({ opacity: opacityDraft });
    setOpacityDraft(null);
  };
  // Standard des Stils: dunkel das Wellenbild, hell kein Bild
  const backgroundShown = background.url || (style === "dark" ? "/bg-wave.webp" : null);
  const setDefaultAvatar = (key: "character" | "player", url: string | null) =>
    updateAppSettings({ defaultAvatars: { ...(appSettings.defaultAvatars ?? {}), [key]: url } });
  async function onFile(f: File | undefined) {
    const key = target.current;
    if (!f || !key) return;
    setBusy(key);
    try {
      if (key.startsWith(AVATAR)) {
        const url = await uploadImage(f, "avatars", IMAGE_SIZES.avatar);
        return setDefaultAvatar(key.slice(AVATAR.length) as "character" | "player", url);
      }
      clearDraft(key);
      const url = await uploadImage(f, "headers", IMAGE_SIZES.banner);
      if (key === BACKGROUND) return setBackground({ url });
      if (key === STANDARD) return setStandard(url);
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

      {/* Standard-Avatare */}
      <div>
        <div className={`${label} mb-2`}>Standard-Avatare</div>
        <p className={`${hint} mb-3`}>
          Für Charaktere bzw. Spieler*innen ohne eigenes Bild. Ohne eigenes Standardbild gilt die anonyme Silhouette.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["character", "Charaktere", characterImage({ faceclaim_image_url: null })],
              ["player", "Spieler*innen", playerImage(null)],
            ] as const
          ).map(([key, name, shown]) => (
            <div key={key} className={`${row} flex items-center gap-3 p-3`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt="" className="h-16 w-16 shrink-0 rounded-full bg-bg-primary object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-[0.875rem] text-text-primary">{name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    disabled={busy === AVATAR + key}
                    onClick={() => {
                      target.current = AVATAR + key;
                      file.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50"
                  >
                    <Icon name="upload" size={14} /> {busy === AVATAR + key ? "Lädt hoch…" : "Bild hochladen"}
                  </button>
                  {appSettings.defaultAvatars?.[key] && (
                    <button
                      onClick={() => setDefaultAvatar(key, null)}
                      className="text-[0.8125rem] text-text-tertiary underline hover:text-text-primary"
                    >
                      Zurück zur Silhouette
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
        {/* Standard-Banner des Stils */}
        <div className={`${row} mb-3 p-3`}>
          <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] text-text-primary">
            Standard-Banner
            {standard && (
              <button
                onClick={() => {
                  clearDraft(STANDARD);
                  setStandard(null);
                }}
                className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div
            className="relative h-28 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-primary bg-cover"
            style={bannerStyle(draft[STANDARD] ?? standard ?? standardHeader("dashboard", style))}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
            <button
              disabled={busy === STANDARD}
              onClick={() => {
                target.current = STANDARD;
                file.current?.click();
              }}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-black/50 px-2.5 py-1.5 text-[0.8125rem] text-white hover:bg-black/70 disabled:opacity-50"
            >
              <Icon name="upload" size={14} /> {busy === STANDARD ? "Lädt hoch…" : "Bild hochladen"}
            </button>
          </div>
          {standard && (
            <BannerPosition
              url={draft[STANDARD] ?? standard}
              onChange={(u) => setDraft((d) => ({ ...d, [STANDARD]: u }))}
              onCommit={(u) => {
                if (u !== standard) setStandard(u);
                clearDraft(STANDARD);
              }}
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button onClick={() => setOverwrite(true)} disabled={!pending && pageCount === 0} className={btnDanger}>
              Überschreiben…
            </button>
            {pending && <span className={hint}>Noch nicht übernommen.</span>}
          </div>
        </div>
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
                  style={bannerStyle(url || fallbackHeader(appSettings, key, style))}
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

      {/* Hintergrund der Seiten je Stil */}
      <div>
        <div className={`${label} mb-2`}>
          Hintergrund der Seiten <span className="text-text-tertiary">(Stil {style === "dark" ? "dunkel" : "hell"})</span>
        </div>
        <p className={`${hint} mb-3`}>
          Liegt hinter allen Seiten, für den oben gewählten Stil. Ohne eigenes Bild gilt im dunklen Stil das Wellenbild,
          im hellen keins. Die Deckkraft blendet das Bild in die Seitenfarbe aus – je niedriger, desto ruhiger der
          Hintergrund und desto besser lesbar die Schrift.
        </p>
        <div className={`${row} p-3`}>
          <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] text-text-primary">
            {background.url ? "Eigenes Bild" : backgroundShown ? "Standardbild" : "Kein Bild"}
            {background.url && (
              <button
                onClick={() => setBackground({ url: null })}
                className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
              >
                Standard
              </button>
            )}
          </div>
          <div className="relative h-40 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-primary">
            {backgroundShown && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${backgroundShown}")`, opacity: opacity / 100 }}
              />
            )}
            <button
              disabled={busy === BACKGROUND}
              onClick={() => {
                target.current = BACKGROUND;
                file.current?.click();
              }}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-black/50 px-2.5 py-1.5 text-[0.8125rem] text-white hover:bg-black/70 disabled:opacity-50"
            >
              <Icon name="upload" size={14} /> {busy === BACKGROUND ? "Lädt hoch…" : "Bild hochladen"}
            </button>
          </div>
          <label className="mt-2 flex items-center gap-3 text-[0.8125rem] text-text-secondary">
            <span className="shrink-0">Deckkraft</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              disabled={!backgroundShown}
              onChange={(e) => setOpacityDraft(parseInt(e.target.value, 10))}
              onPointerUp={commitOpacity}
              onKeyUp={commitOpacity}
              onBlur={commitOpacity}
              aria-label="Deckkraft des Hintergrundbilds"
              className="min-w-0 flex-1 accent-[var(--accent)] disabled:opacity-40"
            />
            <span className="w-10 shrink-0 text-right text-text-tertiary">{opacity} %</span>
          </label>
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
        {overwrite && (
          <ConfirmDialog
            title="Banner überschreiben"
            text={`Der Standard-Banner gilt dann im Stil ${style === "dark" ? "dunkel" : "hell"} auf allen Seiten; eigene Header-Bilder der Seiten in diesem Stil (${pageCount}) werden entfernt. Banner von Szenen, Profilen, Dashboards und Orten bleiben erhalten.`}
            confirmLabel="Überschreiben"
            onCancel={() => setOverwrite(false)}
            onConfirm={() => {
              overwritePages();
              setOverwrite(false);
            }}
          />
        )}
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
