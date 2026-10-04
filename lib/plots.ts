// Gemeinsame Plot-/Filter-Logik für Timeline und Szenen-Übersicht.
import type { Character, Plot, Scene } from "./types";
import { AREA_ORDER, AREAS, type AreaKey } from "./world";

// Filterwert für AU-Szenen ohne benanntes AU
export const AU_UNNAMED = "__unnamed";

export interface PlotFilters {
  tokens: string[]; // "char:<id>" | "player:<id>"
  aus: string[]; // AU-Namen | AU_UNNAMED (leer = Canon)
  areas: string[]; // AreaKey | "rest"
}

type CharacterLookup = (id: string) => Character | undefined;

// Optionen für den Gegend-Filter (alphabetisch, plus „Rest der Welt")
export function areaFilterOptions(): { value: string; label: string }[] {
  return [
    ...AREA_ORDER.map((k) => ({ value: k as string, label: AREAS[k].name })),
    { value: "rest", label: "Rest der Welt" },
  ].sort((a, b) => a.label.localeCompare(b.label, "de"));
}

// Gegend (Mehrfach): mind. eine muss passen; „rest" = alles außerhalb der Gegenden
export function areaMatches(areas: string[], area: string): boolean {
  if (areas.length === 0 || areas.includes(area)) return true;
  return areas.includes("rest") && !AREA_ORDER.includes(area as AreaKey);
}

export function tokenMatches(
  token: string,
  participantIds: string[],
  character: CharacterLookup,
): boolean {
  const [type, id] = token.split(":");
  if (type === "char") return participantIds.includes(id);
  return participantIds.some((pid) => character(pid)?.player_id === id);
}

// Timeline-Regel: AUs sind eigene Zeitlinien – ohne AU-Auswahl nur Canon, mit
// Auswahl nur die Szenen der gewählten AUs. Alle Tokens müssen passen.
export function matchesFilters(s: Scene, f: PlotFilters, character: CharacterLookup): boolean {
  if (f.aus.length === 0 ? s.au : !(s.au && f.aus.includes(s.au_name || AU_UNNAMED)))
    return false;
  if (!areaMatches(f.areas, s.location_area)) return false;
  return f.tokens.every((t) => tokenMatches(t, s.participant_ids, character));
}

export function plotFilters(p: Plot): PlotFilters {
  return { tokens: p.tokens, aus: p.aus, areas: p.areas ?? [] };
}

// Szenen eines Plots: Filter plus von Hand ergänzte, minus entfernte Szenen. Ein
// Plot ohne Filter besteht nur aus den von Hand aufgenommenen Szenen.
export function plotScenes(
  p: Plot,
  scenes: Scene[],
  f: PlotFilters,
  character: CharacterLookup,
): Scene[] {
  const hasFilter = f.tokens.length + f.aus.length + f.areas.length > 0;
  return scenes.filter((s) => {
    if (p.include_ids.includes(s.id)) return true;
    if (p.exclude_ids.includes(s.id)) return false;
    return hasFilter && matchesFilters(s, f, character);
  });
}

// Plots sieht nur, wessen Charaktere betroffen sind: als Filter gewählt, in einer
// Szene oder Off-Szene des Plots beteiligt – außerdem wer den Plot angelegt hat,
// und Admins.
export function visiblePlots(
  plots: Plot[],
  scenes: Scene[],
  me: { playerId: string; isAdmin: boolean; charIds: Set<string> },
  character: CharacterLookup,
): Plot[] {
  const involvesMe = (ids: string[]) => ids.some((id) => me.charIds.has(id));
  return plots.filter(
    (p) =>
      me.isAdmin ||
      p.created_by === me.playerId ||
      p.tokens.some(
        (t) => t === `player:${me.playerId}` || me.charIds.has(t.replace(/^char:/, "")),
      ) ||
      p.off_scenes.some((o) => involvesMe(o.participant_ids)) ||
      plotScenes(p, scenes, plotFilters(p), character).some((s) =>
        involvesMe(s.participant_ids),
      ),
  );
}
