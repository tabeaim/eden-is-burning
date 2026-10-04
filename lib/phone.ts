// Look der Charakter-Handys: Modelle, Gehäusefarben, Abnutzung, Hintergründe und
// die Apps, die der Startbildschirm (nicht anklickbar) andeutet.
import type { Character, PhoneSettings } from "./types";

// Schlüssel bleiben technisch (island = Kamera-Insel, punch = Kamera-Punkt,
// classic = Home-Button). Das Burner Phone ist ein altes Tastenhandy: nur SMS.
export const PHONE_MODELS = [
  { key: "island", label: "iPhone (neu)" },
  { key: "punch", label: "Android" },
  { key: "classic", label: "iPhone (alt)" },
  { key: "burner", label: "Burner Phone" },
] as const;
export type PhoneModel = (typeof PHONE_MODELS)[number]["key"];

export const PHONE_COLORS = [
  { key: "graphite", label: "Graphit", hex: "#232327" },
  { key: "silver", label: "Silber", hex: "#b4b7bd" },
  { key: "gold", label: "Gold", hex: "#c2a273" },
  { key: "rose", label: "Rosé", hex: "#cf9f98" },
  { key: "blue", label: "Nachtblau", hex: "#25354c" },
  { key: "red", label: "Rot", hex: "#7c2027" },
] as const;

export const PHONE_WEAR = ["Wie neu", "Leichte Kratzer", "Zerkratzt", "Display gesprungen"];

// Drei Vorlagen – alles andere per eigenem Bild
export const PHONE_WALLPAPERS = [
  { key: "ember", label: "Glut", css: "radial-gradient(120% 90% at 20% 0%, #e89a3c 0%, #7a2e12 38%, #120b0a 80%)" },
  { key: "night", label: "Nacht", css: "linear-gradient(165deg, #1b2a49 0%, #0d1326 55%, #05060b 100%)" },
  { key: "dusk", label: "Dämmerung", css: "linear-gradient(175deg, #5b3b8c 0%, #c2557a 55%, #f0a35e 100%)" },
] as const;

export interface PhoneApp {
  key: string;
  label: string;
  glyph?: string; // Symbol auf farbiger Kachel …
  bg?: string;
  icon?: string; // … oder (eigene Apps) ein hochgeladenes Icon
  href?: string; // echte App: führt irgendwohin (sonst reine Deko)
}

// Standard-Apps: auf jedem Smartphone einfach da, nicht wählbar.
export const STANDARD_APPS: PhoneApp[] = [
  { key: "rechner", label: "Rechner", glyph: "🧮", bg: "linear-gradient(#48484c, #1c1c1e)" },
  { key: "kamera", label: "Kamera", glyph: "📷", bg: "linear-gradient(#8e8e93, #48484c)" },
  { key: "fotos", label: "Fotos", glyph: "🌸", bg: "linear-gradient(#ffffff, #dcdce0)" },
  { key: "uhr", label: "Uhr", glyph: "⏰", bg: "linear-gradient(#2c2c2e, #111113)" },
  { key: "wetter", label: "Wetter", glyph: "⛅", bg: "linear-gradient(#4aa3f0, #1d5fc2)" },
  { key: "karten", label: "Karten", glyph: "🗺️", bg: "linear-gradient(#7ed0a0, #3c8f6a)" },
  { key: "notizen", label: "Notizen", glyph: "📝", bg: "linear-gradient(#ffe27a, #f2b824)" },
  // führt in die Charakter-Einstellungen (Handy-Look, Captic, Apps)
  { key: "einstellungen", label: "Einstellungen", glyph: "⚙️", bg: "linear-gradient(#a9a9af, #6b6b70)", href: "/einstellungen" },
];

// Optionale Apps – sagen etwas über den Charakter. Bewusst ohne echte Marken.
export const OPTIONAL_APPS: PhoneApp[] = [
  { key: "musik", label: "Musik", glyph: "🎵", bg: "linear-gradient(#fb5c74, #d81b47)" },
  { key: "dating", label: "Spark", glyph: "🔥", bg: "linear-gradient(#ff7a59, #e0245e)" },
  { key: "bank", label: "Bank", glyph: "🏦", bg: "linear-gradient(#2f4a6b, #16263b)" },
  { key: "mail", label: "Mail", glyph: "✉️", bg: "linear-gradient(#5ab8ff, #1a73e8)" },
  { key: "spiele", label: "Spiele", glyph: "🎮", bg: "linear-gradient(#8a63f0, #4b2bb5)" },
  { key: "fitness", label: "Fitness", glyph: "🏃", bg: "linear-gradient(#b6f23a, #54b012)" },
  { key: "essen", label: "Lieferdienst", glyph: "🍜", bg: "linear-gradient(#ffb04a, #f06a1a)" },
  { key: "taxi", label: "Taxi", glyph: "🚕", bg: "linear-gradient(#1c1c1e, #000000)" },
  { key: "news", label: "News", glyph: "📰", bg: "linear-gradient(#f2f2f4, #c9c9cf)" },
  { key: "videos", label: "Videos", glyph: "▶️", bg: "linear-gradient(#ff5b5b, #c51616)" },
];

// Der Startbildschirm hat vier Reihen à vier Apps: acht Standard-Apps plus bis zu
// acht weitere (gewählte und eigene zusammen).
export const MAX_EXTRA_APPS = 16 - STANDARD_APPS.length;

export interface ResolvedPhone {
  model: PhoneModel;
  burner: boolean;
  frame: string; // Gehäusefarbe (hex)
  wear: number;
  wallpaper: string; // fertiger CSS-`background`-Wert
  apps: PhoneApp[]; // Standard + gewählte + eigene, in Anzeige-Reihenfolge
  captic: boolean; // Captic aktiviert (nie auf dem Burner Phone)
}

export function wallpaperCss(value: string | null | undefined): string {
  if (value && !value.startsWith("preset:")) {
    return `center / cover no-repeat url("${value.replace(/"/g, "%22")}")`;
  }
  const key = value?.slice("preset:".length);
  return (PHONE_WALLPAPERS.find((w) => w.key === key) ?? PHONE_WALLPAPERS[0]).css;
}

export function resolvePhone(c: Pick<Character, "phone"> | null | undefined): ResolvedPhone {
  const p: PhoneSettings = c?.phone ?? {};
  const model = PHONE_MODELS.find((m) => m.key === p.model)?.key ?? "island";
  const frame = (PHONE_COLORS.find((x) => x.key === p.color) ?? PHONE_COLORS[0]).hex;
  const wear = Math.min(3, Math.max(0, Math.round(p.wear ?? 0)));
  const chosen = (p.apps ?? []).flatMap((k) => OPTIONAL_APPS.filter((a) => a.key === k));
  const custom: PhoneApp[] = (p.custom_apps ?? []).map((a) => ({
    key: a.id,
    label: a.name,
    icon: a.icon,
  }));
  return {
    model,
    burner: model === "burner",
    frame,
    wear,
    wallpaper: wallpaperCss(p.wallpaper),
    apps: [...STANDARD_APPS, ...[...chosen, ...custom].slice(0, MAX_EXTRA_APPS)],
    captic: model !== "burner" && !!p.captic?.enabled,
  };
}

// Merkt sich, mit welchem eigenen Charakter man zuletzt aktiv war (Post in einer
// Szene, SMS) – dessen Handy zeigt „Handy" im Seitenmenü dann zuerst.
export const PHONE_OWNER_KEY = "eden:phone";
export function rememberPhone(characterId: string) {
  try {
    localStorage.setItem(PHONE_OWNER_KEY, characterId);
  } catch {
    /* ignore */
  }
}

// --- Telefonszenen ----------------------------------------------------------
// Eine Telefonszene ist eine normale Szene (Zusammenfassung, Timeline, …) mit
// festem „Ort": keine Gegend, sondern das Telefon.
export const PHONE_AREA = "phone";
export const PHONE_LOCATION = "am Telefon";
export function phoneSceneTitle(participants: { name: string }[]): string {
  const names = participants.map((p) => p.name.split(" ")[0]);
  return `${names.join(" & ") || "Jemand"} on the phone`;
}

// --- Inplay-Uhrzeit ---------------------------------------------------------
// „23:58" + 5 → „00:03" (läuft über Mitternacht einfach weiter)
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
