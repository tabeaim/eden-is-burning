// Look der Charakter-Handys: Modelle, Gehäusefarben, Abnutzung, Hintergründe und
// die Apps, die der Startbildschirm (nicht anklickbar) andeutet.
import type { Character, PhoneSettings } from "./types";

export const PHONE_MODELS = [
  { key: "island", label: "Neues Modell", hint: "Kamera-Insel, runde Ecken" },
  { key: "punch", label: "Android", hint: "Kamera-Punkt, schmaler Rand" },
  { key: "classic", label: "Altes Modell", hint: "Home-Button, dicker Rand" },
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

export const PHONE_WALLPAPERS = [
  { key: "ember", label: "Glut", css: "radial-gradient(120% 90% at 20% 0%, #e89a3c 0%, #7a2e12 38%, #120b0a 80%)" },
  { key: "night", label: "Nacht", css: "linear-gradient(165deg, #1b2a49 0%, #0d1326 55%, #05060b 100%)" },
  { key: "olive", label: "Olive", css: "linear-gradient(160deg, #a3a380 0%, #4b4d37 45%, #14150f 100%)" },
  { key: "rose", label: "Rosé", css: "linear-gradient(170deg, #e7b7b0 0%, #9c5a66 50%, #2a1420 100%)" },
  { key: "dusk", label: "Dämmerung", css: "linear-gradient(175deg, #5b3b8c 0%, #c2557a 55%, #f0a35e 100%)" },
  { key: "black", label: "Schwarz", css: "linear-gradient(#0a0a0b, #0a0a0b)" },
] as const;

// Angedeutete Apps: Symbol auf farbiger Kachel. Bewusst ohne echte Marken.
export const PHONE_APPS = [
  { key: "telefon", label: "Telefon", glyph: "📞", bg: "linear-gradient(#5fd66b, #2aa63a)" },
  { key: "kamera", label: "Kamera", glyph: "📷", bg: "linear-gradient(#8e8e93, #48484c)" },
  { key: "fotos", label: "Fotos", glyph: "🌸", bg: "linear-gradient(#ffffff, #dcdce0)" },
  { key: "musik", label: "Musik", glyph: "🎵", bg: "linear-gradient(#fb5c74, #d81b47)" },
  { key: "karten", label: "Karten", glyph: "🗺️", bg: "linear-gradient(#7ed0a0, #3c8f6a)" },
  { key: "wetter", label: "Wetter", glyph: "⛅", bg: "linear-gradient(#4aa3f0, #1d5fc2)" },
  { key: "notizen", label: "Notizen", glyph: "📝", bg: "linear-gradient(#ffe27a, #f2b824)" },
  { key: "kalender", label: "Kalender", glyph: "📅", bg: "linear-gradient(#ffffff, #e6e6ea)" },
  { key: "uhr", label: "Uhr", glyph: "⏰", bg: "linear-gradient(#2c2c2e, #111113)" },
  { key: "mail", label: "Mail", glyph: "✉️", bg: "linear-gradient(#5ab8ff, #1a73e8)" },
  { key: "bank", label: "Bank", glyph: "🏦", bg: "linear-gradient(#2f4a6b, #16263b)" },
  { key: "wallet", label: "Wallet", glyph: "💳", bg: "linear-gradient(#333336, #0e0e10)" },
  { key: "dating", label: "Spark", glyph: "🔥", bg: "linear-gradient(#ff7a59, #e0245e)" },
  { key: "spiele", label: "Spiele", glyph: "🎮", bg: "linear-gradient(#8a63f0, #4b2bb5)" },
  { key: "fitness", label: "Fitness", glyph: "🏃", bg: "linear-gradient(#b6f23a, #54b012)" },
  { key: "podcasts", label: "Podcasts", glyph: "🎙️", bg: "linear-gradient(#b765f5, #7a2bd0)" },
  { key: "essen", label: "Lieferdienst", glyph: "🍜", bg: "linear-gradient(#ffb04a, #f06a1a)" },
  { key: "taxi", label: "Taxi", glyph: "🚕", bg: "linear-gradient(#1c1c1e, #000000)" },
  { key: "news", label: "News", glyph: "📰", bg: "linear-gradient(#f2f2f4, #c9c9cf)" },
  { key: "videos", label: "Videos", glyph: "▶️", bg: "linear-gradient(#ff5b5b, #c51616)" },
  { key: "buecher", label: "Bücher", glyph: "📚", bg: "linear-gradient(#ffa64d, #e0661a)" },
  { key: "rechner", label: "Rechner", glyph: "🧮", bg: "linear-gradient(#48484c, #1c1c1e)" },
  { key: "gesundheit", label: "Health", glyph: "❤️", bg: "linear-gradient(#ffffff, #ececf0)" },
  { key: "einstellungen", label: "Einstellungen", glyph: "⚙️", bg: "linear-gradient(#a9a9af, #6b6b70)" },
] as const;
export const MAX_PHONE_APPS = 16;

const DEFAULT_APPS = ["telefon", "kamera", "fotos", "musik", "wetter", "karten", "notizen", "einstellungen"];

export interface ResolvedPhone {
  model: PhoneModel;
  frame: string; // Gehäusefarbe (hex)
  wear: number;
  wallpaper: string; // fertiger CSS-`background`-Wert
  apps: (typeof PHONE_APPS)[number][];
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
  const keys = p.apps ?? DEFAULT_APPS;
  const apps = keys.flatMap((k) => PHONE_APPS.filter((a) => a.key === k));
  return { model, frame, wear, wallpaper: wallpaperCss(p.wallpaper), apps };
}
