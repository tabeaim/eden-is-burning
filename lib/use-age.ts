"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "./store";
import { DEFAULT_AGE_DATE, ageAt, latestSceneDates } from "./characters";
import type { Character } from "./types";

// Alter, wie es im Profil und in Listen steht: aus dem Geburtsdatum am Datum der
// neuesten Szene des Charakters (ohne Szene: fester Stichtag). Ohne
// Geburtsdatum das fest hinterlegte Alter.
export function useCurrentAge() {
  const { scenes } = useStore();
  const latest = useMemo(() => latestSceneDates(scenes), [scenes]);
  return useCallback(
    (c: Pick<Character, "id" | "age" | "profile">) => ageAt(c, latest.get(c.id) ?? DEFAULT_AGE_DATE),
    [latest],
  );
}
