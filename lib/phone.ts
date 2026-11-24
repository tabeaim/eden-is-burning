// Look der Charakter-Handys: Modelle, Gehäusefarben, Abnutzung, Hintergründe und
// die Apps, die der Startbildschirm (nicht anklickbar) andeutet.
import type { Character, ChatMessage, PhoneSettings } from "./types";
import { tierOf } from "./characters";

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

// Vorlagen – alles andere per eigenem Bild. `light`: heller Hintergrund, auf dem
// Uhr und App-Namen dunkel stehen (sonst weiß mit Schatten).
export const PHONE_WALLPAPERS: { key: string; label: string; css: string; light?: boolean }[] = [
  { key: "ember", label: "Glut", css: "radial-gradient(120% 90% at 20% 0%, #e89a3c 0%, #7a2e12 38%, #120b0a 80%)" },
  { key: "night", label: "Nacht", css: "linear-gradient(165deg, #1b2a49 0%, #0d1326 55%, #05060b 100%)" },
  { key: "dusk", label: "Dämmerung", css: "linear-gradient(175deg, #5b3b8c 0%, #c2557a 55%, #f0a35e 100%)" },
  { key: "morning", label: "Morgen", light: true, css: "linear-gradient(170deg, #fdf3e1 0%, #f9d9b4 55%, #f3b98f 100%)" },
  { key: "sky", label: "Himmel", light: true, css: "linear-gradient(175deg, #cfe6f7 0%, #e6f1f8 50%, #fbeedd 100%)" },
  { key: "sage", label: "Salbei", light: true, css: "linear-gradient(165deg, #eef0dc 0%, #cfd8b8 55%, #a9b892 100%)" },
  { key: "sand", label: "Sand", light: true, css: "radial-gradient(120% 90% at 80% 0%, #fffaf0 0%, #f1e6cf 45%, #e2cfa9 100%)" },
];

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
  { key: "fotos", label: "Fotos", glyph: "🌸", bg: "linear-gradient(#ffffff, #dcdce0)", href: "/handy/fotos" },
  { key: "uhr", label: "Uhr", glyph: "⏰", bg: "linear-gradient(#2c2c2e, #111113)" },
  { key: "wetter", label: "Wetter", glyph: "⛅", bg: "linear-gradient(#4aa3f0, #1d5fc2)" },
  { key: "karten", label: "Karten", glyph: "🗺️", bg: "linear-gradient(#7ed0a0, #3c8f6a)" },
  { key: "notizen", label: "Notizen", glyph: "📝", bg: "linear-gradient(#ffe27a, #f2b824)", href: "/handy/notizen" },
  // führt zu den Handy-Einstellungen des Charakters (Look, Captic, Apps)
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
  wallpaperLight: boolean; // helle Vorlage: Beschriftung dunkel statt weiß
  apps: PhoneApp[]; // Standard + gewählte + eigene, in Anzeige-Reihenfolge
  captic: boolean; // Captic aktiviert (nie auf dem Burner Phone)
}

// Hat der Charakter überhaupt ein Handy? Statist*innen nie; bei allen anderen
// abschaltbar in den Handy-Einstellungen.
export function hasPhone(
  c: Pick<Character, "phone" | "is_npc" | "npc_tier"> | null | undefined,
): boolean {
  return !!c && tierOf(c) !== "extra" && !c.phone?.disabled;
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
    wallpaperLight:
      !!p.wallpaper?.startsWith("preset:") &&
      !!PHONE_WALLPAPERS.find((w) => w.key === p.wallpaper!.slice("preset:".length))?.light,
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

// --- Kontakte ---------------------------------------------------------------
type Owner = Pick<Character, "phone"> | null | undefined;
type Other = Pick<Character, "id" | "name"> | null | undefined;

// Wie heißt dieser Charakter auf dem Handy von `owner`? (eigener Kontaktname,
// sonst der echte Name)
export function contactName(owner: Owner, other: Other): string {
  if (!other) return "Unbekannt";
  return owner?.phone?.contacts?.[other.id]?.name?.trim() || other.name;
}
// Kurzform für Stellen, an denen sonst der Vorname steht: ein eigener Kontaktname
// bleibt ganz, vom echten Namen nur der Vorname.
export function contactShortName(owner: Owner, other: Other): string {
  if (!other) return "?";
  return owner?.phone?.contacts?.[other.id]?.name?.trim() || other.name.split(" ")[0];
}
// Eigenes Kontaktfoto (nur Kontakte und Anrufe), falls gesetzt
export function contactPhoto(owner: Owner, other: Other): string | null {
  return (other && owner?.phone?.contacts?.[other.id]?.photo) || null;
}

// Übergabe „Nachricht schreiben" aus den Kontakten an „Neue SMS" (sessionStorage)
export const SMS_TO_KEY = "eden:sms-to";
// Dashboard → Telefon-App: Anruf, zu dem gleich „Auf die Mailbox sprechen" aufgeht
export const MAILBOX_KEY = "eden:mailbox";
// „Andere Handys" → Anrufen: öffnet in der Telefon-App den Anruf-Dialog
export const CALL_TO_KEY = "eden:call-to";
// Längste Mailbox-Nachricht (Zeichen)
export const VOICEMAIL_MAX = 300;
// Fotos-App: höchstens so viele auf einmal hochladen bzw. insgesamt auf einem Handy
export const PHOTOS_PER_UPLOAD = 24;
export const PHOTOS_MAX = 120;

// „2021-12-31" → „2022-01-01"
export function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
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

// Vorschlag für einen Anruf: 5 Minuten nach der letzten Nachricht, die dieser
// Charakter geschrieben hat (mit Datum und Uhrzeit im Spiel). Über Mitternacht
// hinweg rutscht der Tag mit. Ohne passende Nachricht: null.
export function suggestCallTime(
  messages: Pick<ChatMessage, "character_id" | "kind" | "inplay_date" | "inplay_time" | "created_at">[],
  characterId: string,
): { date: string; time: string } | null {
  let last: (typeof messages)[number] | null = null;
  for (const m of messages) {
    if (m.character_id !== characterId || m.kind === "date" || !m.inplay_date || !m.inplay_time) continue;
    const later =
      !last ||
      (m.inplay_date.localeCompare(last.inplay_date!) ||
        m.inplay_time.localeCompare(last.inplay_time!) ||
        m.created_at.localeCompare(last.created_at)) > 0;
    if (later) last = m;
  }
  if (!last) return null;
  const time = addMinutes(last.inplay_time!, 5);
  const date = time < last.inplay_time! ? nextDay(last.inplay_date!) : last.inplay_date!;
  return { date, time };
}

// --- Uhrzeit beim Schreiben ---------------------------------------------------
// Automatisch: Jede Nachricht kostet so viel Zeit, wie man realistisch braucht –
// die vorige (fremde) Nachricht lesen, kurz überlegen, die eigene tippen. Die
// Sekunden laufen über den ganzen Verlauf mit (auch viele kurze Nachrichten
// schieben die Uhr weiter). Weicht eine gespeicherte Uhrzeit von der Rechnung ab
// (von Hand gesetzt), zählt ab dort deren Zeit.
const READ_CHARS_PER_SECOND = 20; // gut 200 Wörter pro Minute
const TYPE_CHARS_PER_SECOND = 3.5; // Tippen am Handy
const PAUSE_SECONDS = 15;

type TimedMessage = Pick<ChatMessage, "character_id" | "kind" | "content" | "inplay_time">;

const textLength = (m: Pick<ChatMessage, "kind" | "content">) =>
  m.kind === "text" || m.kind === "voice" ? m.content.trim().length : 0;

// Sekunden, die eine Nachricht nach der vorigen braucht
export function messageSeconds(prev: TimedMessage | null, writerId: string, next: Pick<ChatMessage, "kind" | "content">) {
  const read =
    prev && prev.character_id !== writerId
      ? textLength(prev)
        ? textLength(prev) / READ_CHARS_PER_SECOND
        : 3 // Bild, GIF: kurz ansehen
      : 0;
  const type = next.kind === "text" || next.kind === "voice" ? textLength(next) / TYPE_CHARS_PER_SECOND : 3;
  return read + PAUSE_SECONDS + type;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
};
const fromMinutes = (total: number) => {
  const t = ((Math.floor(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

// `messages`: der Verlauf des Strangs in Lesereihenfolge
export function estimateReplyTime(messages: TimedMessage[], writerId: string, draft: string): string {
  let clock: number | null = null; // Sekunden seit Mitternacht (läuft über Tage weiter)
  let prev: TimedMessage | null = null;
  for (const m of messages) {
    if (m.kind === "date" || !m.inplay_time) continue;
    const stored = toMinutes(m.inplay_time);
    if (clock === null) {
      clock = stored * 60;
    } else {
      const next: number = clock + messageSeconds(prev, m.character_id, m);
      clock = ((Math.floor(next / 60) % 1440) + 1440) % 1440 === stored ? next : stored * 60;
    }
    prev = m;
  }
  if (clock === null) return "12:00";
  return fromMinutes((clock + messageSeconds(prev, writerId, { kind: "text", content: draft })) / 60);
}
