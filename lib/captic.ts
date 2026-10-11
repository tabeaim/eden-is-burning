// Captic – das fiktive Foto-Netzwerk auf den Handys (siehe DESIGN.md).
import type { CapticEvent, CapticPost, Character } from "./types";
import { resolvePhone } from "./phone";

export const CAPTIC_PINK = "#e8457a";

// Vorschlag für den Captic-Namen: „elliot.simmons"
export function defaultHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

export function capticHandle(c: Pick<Character, "name" | "phone">): string {
  return c.phone?.captic?.handle || defaultHandle(c.name);
}

export function cleanHandle(input: string): string {
  return input.trim().replace(/^@/, "").replace(/\s+/g, ".").toLowerCase();
}

// Ändert jemand den Captic-Namen, ziehen alle Verlinkungen mit: „@alt" → „@neu".
// Trifft nur den ganzen Namen („@iri" nicht in „@irikalina"); ein Punkt am Satzende
// gehört nicht dazu.
export function replaceHandle(text: string, from: string, to: string): string {
  if (!from || from === to || !text.includes("@")) return text;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`@${escaped}(?![A-Za-z0-9_]|\\.[A-Za-z0-9_])`, "gi"),
    `@${to}`,
  );
}

// Wen verlinkt dieser Text („@nutzername")? Liefert die Charakter-IDs – gleiche
// Regeln wie die Anzeige (`MentionText`): Satzzeichen am Ende gehören nicht dazu.
export function mentionedIds(text: string, characters: Character[]): string[] {
  if (!text.includes("@")) return [];
  const byHandle = new Map(
    characters
      .filter((c) => !c.deleted_at && resolvePhone(c).captic)
      .map((c) => [capticHandle(c).toLowerCase(), c.id]),
  );
  const out = new Set<string>();
  for (const m of text.matchAll(/@([A-Za-z0-9._]+)/g)) {
    const id = byHandle.get(m[1].replace(/[._]+$/, "").toLowerCase()) ?? byHandle.get(m[1].toLowerCase());
    if (id) out.add(id);
  }
  return [...out];
}

// Aktivitäten, die ein Beitrag auslöst: wer auf dem Bild markiert ist (`tag`), wer
// in der Bildunterschrift verlinkt ist (`mention`) – jede Person nur einmal, nie
// die Person, der der Beitrag gehört.
export function postNotices(post: CapticPost, characters: Character[]): CapticEvent[] {
  const notice = (kind: "tag" | "mention", id: string): CapticEvent => ({
    id: `cape_${kind}_${post.id}_${id}`,
    kind,
    actor_id: post.character_id,
    target_id: id,
    post_id: post.id,
    created_at: new Date().toISOString(),
  });
  const tagged = new Set((post.tags ?? []).map((t) => t.character_id));
  tagged.delete(post.character_id);
  const mentioned = mentionedIds(post.caption, characters).filter(
    (id) => id !== post.character_id && !tagged.has(id),
  );
  return [...[...tagged].map((id) => notice("tag", id)), ...mentioned.map((id) => notice("mention", id))];
}

// Wem folgt dieser Charakter in der App?
export function follows(c: Pick<Character, "phone"> | null | undefined): string[] {
  return c?.phone?.captic?.follows ?? [];
}

export function isPrivate(c: Pick<Character, "phone"> | null | undefined): boolean {
  return !!c?.phone?.captic?.private;
}

// Darf `viewer` Beiträge, Stories und Highlights von `owner` sehen? Bei privaten
// Profilen nur, wer folgt – und die eigene Spielerin (`ownPlayer`).
export function canSeeCaptic(
  viewer: Pick<Character, "id" | "phone">,
  owner: Pick<Character, "id" | "phone">,
  ownPlayer: boolean,
): boolean {
  return !isPrivate(owner) || viewer.id === owner.id || ownPlayer || follows(viewer).includes(owner.id);
}

export const requestId = (targetId: string, actorId: string) => `cape_request_${targetId}_${actorId}`;

// 1234 → „1.234" · 12400 → „12,4 Tsd." · 1250000 → „1,3 Mio."
export function formatCount(n: number): string {
  const short = (v: number) => (Math.round(v * 10) / 10).toLocaleString("de-DE");
  if (n >= 1_000_000) return `${short(n / 1_000_000)} Mio.`;
  if (n >= 10_000) return `${short(n / 1_000)} Tsd.`;
  return n.toLocaleString("de-DE");
}

// Eingabe einer Zahl („12.400", „12400") → Zahl oder null
export function parseCount(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  return digits ? Math.min(parseInt(digits, 10), 999_999_999) : null;
}

export function likeCount(post: Pick<CapticPost, "likes" | "liked_by">): number {
  return (post.likes ?? 0) + (post.liked_by?.length ?? 0);
}

// Neueste zuerst: nach Inplay-Datum (falls gesetzt), sonst nach Erstellzeit
export function sortPosts(posts: CapticPost[]): CapticPost[] {
  const day = (p: CapticPost) => p.inplay_date || p.created_at.slice(0, 10);
  return [...posts].sort(
    (a, b) => day(b).localeCompare(day(a)) || b.created_at.localeCompare(a.created_at),
  );
}

// Im Feed wie beim Vorbild: nie höher als 4:5, nie breiter als 1,91:1
export function feedRatio(ar: number | null | undefined): number {
  return Math.min(1.91, Math.max(0.8, ar || 1));
}
