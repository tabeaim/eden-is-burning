// Charakter-Stufen: Main Character (normaler Charakter), Supporting Character
// (Nebenfigur, bestimmten Spieler*innen zugeordnet und nur von ihnen bespielt und
// bearbeitet) und Statist*in (Nebenfigur für alle: jede*r darf sie bearbeiten und
// zeitweise bespielen).
import type { Character } from "./types";

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
