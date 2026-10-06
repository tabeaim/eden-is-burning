"use client";

import { useStore } from "./store";
import { ownerGone } from "./characters";
import type { Character } from "./types";

// Name eines Charakters, dessen Spieler*in sein Konto gelöscht hat: durchgestrichen
// und abgeschwächt (Charaktere, Szenen und Posts bleiben bestehen)
export const GONE_CLASS = "line-through decoration-1 opacity-60";
// Name eines gelöschten Kontos: ausgegraut, ohne Pilltag und Link
export const GONE_PLAYER_CLASS = "text-text-tertiary opacity-70";

export function useCharacterGone(
  c: Pick<Character, "is_npc" | "npc_tier" | "player_id" | "co_owner_ids"> | null | undefined,
): boolean {
  const { player } = useStore();
  return !!c && ownerGone(c, player);
}
