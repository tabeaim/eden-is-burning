// Versionen eines Charakters: Für ein AU oder eine einzelne Szene lassen sich
// Bild, Name und ein paar Grunddaten anders festlegen. Gespeichert im Profil
// (`profile.versions`), es braucht keine eigene Tabelle. Leere Felder nehmen den
// Wert aus dem normalen Profil.
//
// Reihenfolge: Szenen-Version vor AU-Version vor normalem Profil. Szenen-Versionen
// gibt es nur in Szenen, die sie erlauben (`scene.versions`, Schalter beim Anlegen
// und in den Szenen-Einstellungen). Plots haben keine eigene Ebene – sie bekommen
// die Version über das AU ihrer Szenen.
import type { Character, CharacterVersion, Scene } from "./types";
import { escapeHtml } from "./format";

// Felder, die eine Version ändern kann, in der Reihenfolge des Formulars
export const VERSION_FIELDS: { key: keyof CharacterVersion; label: string; kind: "text" | "number" | "image" | "html" }[] = [
  { key: "image", label: "Bild", kind: "image" },
  { key: "name", label: "Name", kind: "text" },
  { key: "age", label: "Alter", kind: "number" },
  { key: "role", label: "Rolle", kind: "text" },
  { key: "tagline", label: "Tagline", kind: "text" },
  { key: "job", label: "Job", kind: "text" },
  { key: "bio", label: "Kurzbeschreibung", kind: "html" },
  { key: "scene_gif_url", label: "Szenen-GIF", kind: "image" },
  { key: "signature_url", label: "Signatur (Bild)", kind: "image" },
];

function filled(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}

// Hat die Version überhaupt eine Änderung? (leere Versionen werden nicht gespeichert)
export function isEmptyVersion(v: CharacterVersion | null | undefined): boolean {
  return !v || !Object.values(v).some(filled);
}

// Version, die in dieser Szene gilt (Szene schlägt AU), oder null
export function versionFor(c: Character, scene: Pick<Scene, "id" | "au" | "au_name" | "versions"> | null | undefined): {
  version: CharacterVersion;
  kind: "scene" | "au";
  label: string;
  ref: string; // für den Profil-Link: "au:<Name>" oder "scene:<ID>"
} | null {
  const vs = c.profile?.versions;
  if (!vs || !scene) return null;
  // Szenen-Versionen gelten nur, solange die Szene sie erlaubt
  const sv = scene.versions ? vs.scene?.[scene.id] : undefined;
  const av = scene.au && scene.au_name ? vs.au?.[scene.au_name] : undefined;
  if (isEmptyVersion(sv) && isEmptyVersion(av)) return null;
  // Szene ergänzt das AU: Felder der Szene gewinnen, der Rest kommt aus dem AU
  const merged: CharacterVersion = { ...(av ?? {}) };
  for (const [k, v] of Object.entries(sv ?? {})) if (filled(v)) (merged as Record<string, unknown>)[k] = v;
  return {
    version: merged,
    kind: isEmptyVersion(sv) ? "au" : "scene",
    label: isEmptyVersion(sv) ? `AU: ${scene.au_name}` : "nur in dieser Szene",
    ref: isEmptyVersion(sv) ? `au:${scene.au_name}` : `scene:${scene.id}`,
  };
}

// Charakter mit der Version überblendet. Das Ergebnis trägt `version_label`, damit
// die Anzeige ein kleines Abzeichen zeigen kann.
export function applyVersion(c: Character, v: CharacterVersion, label?: string, ref?: string): Character {
  const pick = <T,>(val: T | null | undefined, base: T): T => (filled(val) ? (val as T) : base);
  const profile = { ...(c.profile ?? {}) };
  if (filled(v.age)) profile.birthdate = null; // festes Alter statt Geburtstag
  if (filled(v.scene_gif_url)) profile.scene_gif_url = v.scene_gif_url;
  if (filled(v.signature_url)) {
    profile.signature_url = v.signature_url;
    profile.signature_text = null;
  }
  return {
    ...c,
    name: pick(v.name, c.name),
    faceclaim_image_url: pick(v.image, c.faceclaim_image_url),
    age: pick(v.age, c.age),
    role: pick(v.role, c.role),
    tagline: pick(v.tagline, c.tagline),
    job: pick(v.job, c.job),
    // Kurzbeschreibung wird als einfacher Text eingegeben
    bio: filled(v.bio) ? escapeHtml(String(v.bio)).replace(/\n/g, "<br>") : c.bio,
    profile,
    version_label: label ?? "andere Version",
    version_ref: ref,
  };
}

// Der Charakter, wie er in dieser Szene auftritt
export function characterIn(c: Character, scene: Pick<Scene, "id" | "au" | "au_name" | "versions"> | null | undefined): Character {
  const found = versionFor(c, scene);
  return found ? applyVersion(c, found.version, found.label, found.ref) : c;
}

// Version speichern (leer = entfernen); liefert das neue Profil
export function withVersion(
  c: Character,
  kind: "au" | "scene",
  key: string,
  v: CharacterVersion | null,
): NonNullable<Character["profile"]> {
  const profile = { ...(c.profile ?? {}) };
  const versions = { au: { ...(profile.versions?.au ?? {}) }, scene: { ...(profile.versions?.scene ?? {}) } };
  const clean: CharacterVersion = {};
  for (const [k, val] of Object.entries(v ?? {})) {
    const t = typeof val === "string" ? val.trim() : val;
    if (filled(t)) (clean as Record<string, unknown>)[k] = t;
  }
  if (isEmptyVersion(clean)) delete versions[kind][key];
  else versions[kind][key] = clean;
  profile.versions = versions;
  return profile;
}

// Profil-Adresse; bei einer Version mit `?version=…`, damit das Profil sie zeigt
export function characterHref(c: Pick<Character, "id" | "version_ref">): string {
  return c.version_ref ? `/charaktere/${c.id}?version=${encodeURIComponent(c.version_ref)}` : `/charaktere/${c.id}`;
}
