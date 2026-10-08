"use client";

import { useStore } from "./store";
import { ownerGone } from "./characters";
import type { Character } from "./types";

// Name eines gelöschten Charakters (Papierkorb oder Konto der Spieler*in gelöscht):
// durchgestrichen und abgeschwächt (Szenen und Posts bleiben bestehen)
export const GONE_CLASS = "line-through decoration-1 opacity-60";
// Name eines pausierten Main Characters (siehe isPaused): kursiv
export const PAUSED_CLASS = "italic";
// Karte eines pausierten Main Characters: ausgegraut
export const PAUSED_CARD_CLASS = "opacity-50 grayscale";
// Name eines gelöschten Kontos: ausgegraut, ohne Pilltag und Link
export const GONE_PLAYER_CLASS = "text-text-tertiary opacity-70";

export function useCharacterGone(
  c: Pick<Character, "is_npc" | "npc_tier" | "player_id" | "co_owner_ids" | "deleted_at"> | null | undefined,
): boolean {
  const { player } = useStore();
  return !!c && ownerGone(c, player);
}
