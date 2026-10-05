// Charakter-Stufen: Main Character (normaler Charakter), Supporting Character
// (Nebenfigur, bestimmten Spieler*innen zugeordnet und von ihnen bespielt) und
// Statist*in (Nebenfigur, die noch niemand bespielt – liegt im Statisten-Pool).
import type { Character } from "./types";

export type Tier = "main" | "supporting" | "extra";

export function tierOf(c: Pick<Character, "is_npc" | "npc_tier">): Tier {
  if (!c.is_npc) return "main";
  return c.npc_tier === "extra" ? "extra" : "supporting";
}

// Kurzes Etikett hinter dem Namen (Main Characters tragen keins)
export function tierLabel(c: Pick<Character, "is_npc" | "npc_tier">): string | null {
  const t = tierOf(c);
  return t === "supporting" ? "SC" : t === "extra" ? "Statist" : null;
}

export const TIER_NAMES: Record<Tier, string> = {
  main: "Main Character",
  supporting: "Supporting Character",
  extra: "Statist",
};
