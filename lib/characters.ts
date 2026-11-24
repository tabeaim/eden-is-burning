// Charakter-Stufen: Main Character (normaler Charakter), Supporting Character
// (Nebenfigur, bestimmten Spieler*innen zugeordnet und nur von ihnen bespielt und
// bearbeitet) und Statist*in (Nebenfigur für alle: jede*r darf sie bearbeiten und
// zeitweise bespielen).
import type { Character, RelationCategory, Scene } from "./types";

export type Tier = "main" | "supporting" | "extra";

export function tierOf(c: Pick<Character, "is_npc" | "npc_tier">): Tier {
  if (!c.is_npc) return "main";
  return c.npc_tier === "extra" ? "extra" : "supporting";
}

// Kurzes Etikett hinter dem Namen (Main Characters tragen keins)
export function tierLabel(c: Pick<Character, "is_npc" | "npc_tier">): string | null {
  const t = tierOf(c);
  return t === "supporting" ? "SC" : t === "extra" ? "Statist*in" : null;
}

export const TIER_NAMES: Record<Tier, string> = {
  main: "Main Character",
  supporting: "Supporting Character",
  extra: "Statist*in",
};

// Bespielt diese*r Spieler*in den Charakter? Main Character: wem er gehört.
// Supporting Character: alle Zugeordneten. Statist*in: wer ihn gerade (zeitweise)
// bespielt – das steht in co_owner_ids; wer ihn angelegt hat, zählt nicht automatisch.
export function playsAs(
  c: Pick<Character, "is_npc" | "npc_tier" | "player_id" | "co_owner_ids">,
  playerId: string | null | undefined,
): boolean {
  if (!playerId) return false;
  const co = (c.co_owner_ids ?? []).includes(playerId);
  return tierOf(c) === "extra" ? co : c.player_id === playerId || co;
}

// Pausierter Main Character: wird gerade nicht bespielt. Seine Karte ist ausgegraut,
// sein Name steht in Szenen kursiv, auf dem Dashboard bildet er keine Gruppe, und
// bei den Alter Egos steht er hinter den aktiven Main Characters (vor den SCs).
export function isPaused(c: Pick<Character, "is_npc" | "profile"> | null | undefined): boolean {
  return !!c && !c.is_npc && !!c.profile?.paused;
}

// Gilt der Charakter als gelöscht? Das ist er, wenn er im Papierkorb liegt oder die
// Spieler*in(nen) dahinter ihr Konto gelöscht haben. Er bleibt dann in Szenen und
// Posts bestehen, wird aber überall durchgestrichen gekennzeichnet. Konto gelöscht:
// Main Characters, wenn ihre Besitzer*in weg ist; Supporting Characters erst, wenn
// alle Zugeordneten weg sind; Statist*innen nie (sie gehören allen).
export function ownerGone(
  c: Pick<Character, "is_npc" | "npc_tier" | "player_id" | "co_owner_ids" | "deleted_at">,
  player: (id: string) => { deleted_at?: string | null } | undefined,
): boolean {
  if (c.deleted_at) return true;
  const tier = tierOf(c);
  if (tier === "extra") return false;
  const owners = tier === "supporting" ? [c.player_id, ...(c.co_owner_ids ?? [])] : [c.player_id];
  return owners.length > 0 && owners.every((id) => !!player(id)?.deleted_at);
}

// --- Alter und Studienjahr ----------------------------------------------------
// Stichtage, wenn nichts anderes vorgegeben ist (z.B. das Datum einer Szene)
export const DEFAULT_AGE_DATE = "2022-01-01";
export const DEFAULT_STUDY_DATE = "2021-10-01"; // Herbst 2021

function parts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : null;
}

// Alter am Stichtag: aus dem Geburtsdatum berechnet; ohne Geburtsdatum das fest
// hinterlegte Alter (Altbestand).
export function ageAt(c: Pick<Character, "age" | "profile">, at: string = DEFAULT_AGE_DATE): number | null {
  const born = c.profile?.birthdate ? parts(c.profile.birthdate) : null;
  const ref = parts(at);
  if (!born || !ref) return c.age ?? null;
  const hadBirthday = ref[1] > born[1] || (ref[1] === born[1] && ref[2] >= born[2]);
  return Math.max(0, ref[0] - born[0] - (hadBirthday ? 0 : 1));
}

// Geburtsdatum aus Alter und Geburtstag (ohne Jahr): Das Alter gilt am Stichtag
// `at` – das Jahr ergibt sich daraus, ob der Geburtstag dann schon war.
export function birthdateFrom(age: number, month: number, day: number, at: string = DEFAULT_AGE_DATE): string | null {
  const ref = parts(at);
  if (!ref || !Number.isFinite(age) || age < 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const had = ref[1] > month || (ref[1] === month && ref[2] >= day);
  const y = ref[0] - Math.round(age) - (had ? 0 : 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(y).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

// Stichtag fürs Alter im Profil und in Listen: das Datum der neuesten Szene des
// Charakters (ohne AU-Szenen und Entwürfe); ohne Szene der feste Stichtag.
export function latestSceneDates(
  scenes: Pick<Scene, "participant_ids" | "inplay_date" | "au" | "draft">[],
): Map<string, string> {
  const latest = new Map<string, string>();
  for (const s of scenes) {
    if (s.au || s.draft || !s.inplay_date) continue;
    for (const id of s.participant_ids) {
      const cur = latest.get(id);
      if (!cur || s.inplay_date > cur) latest.set(id, s.inplay_date);
    }
  }
  return latest;
}

// Studienjahr am Stichtag (1 = erstes Jahr); null, wenn noch nicht begonnen
export function studyYearAt(c: Pick<Character, "profile">, at: string = DEFAULT_STUDY_DATE): number | null {
  const start = c.profile?.study_start ? parts(c.profile.study_start) : null;
  const ref = parts(at);
  if (!start || !ref) return null;
  const months = (ref[0] - start[0]) * 12 + (ref[1] - start[1]) - (ref[2] < start[2] ? 1 : 0);
  return months < 0 ? null : Math.floor(months / 12) + 1;
}

export const DEGREES: Record<string, string> = {
  undergraduate: "Undergraduate",
  graduate: "Graduate",
  phd: "PhD",
  mba: "MBA",
};

// Ist diese Angabe im Profil versteckt?
export function isHidden(c: Pick<Character, "profile">, key: string): boolean {
  return (c.profile?.hidden ?? []).includes(key);
}

// Relations-Kategorien in Anzeige-Reihenfolge
export const RELATION_CATEGORIES: [RelationCategory, string][] = [
  ["love", "love life."],
  ["family", "family."],
  ["friends", "friends."],
  ["acquainted", "acquainted."],
  ["foes", "foes."],
  ["past", "past."],
];

// Importierte Charaktere haben nur eine Alterszahl, aber kein Geburtsdatum – dann
// bitten die Charakter-Einstellungen darum (das Alter bleibt bis dahin stehen).
export function needsBirthdate(c: Pick<Character, "age" | "profile">): boolean {
  return !c.profile?.birthdate && c.age != null;
}

// Eingetippter Link als vollständige Web-Adresse (ohne Angabe: https://)
export function webUrl(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^[a-z]+:\/*/i, "")}`;
}

// Student*in / arbeitstätig – beides zugleich möglich (liest auch den Altbestand)
export function isStudent(c: Pick<Character, "profile">): boolean {
  return c.profile?.is_student ?? c.profile?.occupation_kind === "student";
}
export function isWorking(c: Pick<Character, "profile">): boolean {
  return c.profile?.is_working ?? c.profile?.occupation_kind === "working";
}

// Sternzeichen aus dem Geburtsdatum: [englisch, deutsch]
const ZODIAC: [number, number, string, string][] = [
  // [bis Monat, bis Tag, englisch, deutsch]
  [1, 19, "Capricorn", "Steinbock"],
  [2, 18, "Aquarius", "Wassermann"],
  [3, 20, "Pisces", "Fische"],
  [4, 19, "Aries", "Widder"],
  [5, 20, "Taurus", "Stier"],
  [6, 20, "Gemini", "Zwillinge"],
  [7, 22, "Cancer", "Krebs"],
  [8, 22, "Leo", "Löwe"],
  [9, 22, "Virgo", "Jungfrau"],
  [10, 22, "Libra", "Waage"],
  [11, 21, "Scorpio", "Skorpion"],
  [12, 21, "Sagittarius", "Schütze"],
  [12, 31, "Capricorn", "Steinbock"],
];
export function zodiacOf(birthdate: string | null | undefined): { en: string; de: string } | null {
  const d = birthdate ? parts(birthdate) : null;
  if (!d) return null;
  const hit = ZODIAC.find(([m, day]) => d[1] < m || (d[1] === m && d[2] <= day));
  return hit ? { en: hit[2], de: hit[3] } : null;
}

// Größe einheitlich in Zentimetern: „183", „1,83 m", „1.83", „6'0" → „183 cm".
// Was sich nicht deuten lässt, bleibt, wie es eingegeben wurde.
export function normalizeHeight(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const t = raw.toLowerCase().replace(",", ".");
  const feet = /^(\d)\s*(?:'|′|ft|fuß)\s*(\d{1,2})?/.exec(t);
  if (feet) return `${Math.round(parseInt(feet[1], 10) * 30.48 + parseInt(feet[2] ?? "0", 10) * 2.54)} cm`;
  const meters = /^(\d)\.(\d{1,2})\s*m?$/.exec(t);
  if (meters) return `${Math.round(parseFloat(`${meters[1]}.${meters[2]}`) * 100)} cm`;
  const cm = /^(\d{2,3})(?:\.\d+)?\s*(?:cm)?$/.exec(t);
  if (cm) return `${parseInt(cm[1], 10)} cm`;
  return raw;
}
