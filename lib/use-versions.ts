"use client";

import { useCallback } from "react";
import { useStore } from "./store";
import { characterIn } from "./versions";
import type { Character, Scene } from "./types";

// Wie `character(id)` aus dem Store, aber mit der Version, die in dieser Szene gilt
export function useCharacterIn(scene: Pick<Scene, "id" | "au" | "au_name" | "versions"> | null | undefined) {
  const { character } = useStore();
  const id = scene?.id;
  const au = scene?.au;
  const auName = scene?.au_name;
  const versions = scene?.versions;
  return useCallback(
    (charId: string): Character | undefined => {
      const c = character(charId);
      return c && id ? characterIn(c, { id, au, au_name: auName, versions }) : c;
    },
    [character, id, au, auName, versions],
  );
}
