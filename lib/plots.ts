// Gemeinsame Plot-/Filter-Logik für Timeline und Szenen-Übersicht.
import type { Character, Plot, Scene } from "./types";
import { PLACE_AREAS, REST_AREA, areaName } from "./world";
import { PHONE_AREA } from "./phone";

// Filterwert für AU-Szenen ohne benanntes AU
export const AU_UNNAMED = "__unnamed";

export interface PlotFilters {
  tokens: string[]; // "char:<id>" | "player:<id>"
  aus: string[]; // AU-Namen | AU_UNNAMED (leer = Canon)
  areas: string[]; // AreaKey | "rest"
}

type CharacterLookup = (id: string) => Character | undefined;

// Optionen für den Gegend-Filter (alphabetisch): Stadtteile, Industrial District,
// „Eden (ohne Bezirk)" und „Rest der Welt"
export function areaFilterOptions(): { value: string; label: string }[] {
  return PLACE_AREAS.map((k) => ({ value: k, label: areaName(k) })).sort((a, b) =>
    a.label.localeCompare(b.label, "de"),
  );
}

// Gegend (Mehrfach): mind. eine muss passen. Unter „rest" fällt außer dem Bereich
// selbst nur, was keinen bekannten Bereich hat (Altbestand) – Telefon/SMS nicht.
export function areaMatches(areas: string[], area: string): boolean {
  if (areas.length === 0 || areas.includes(area)) return true;
  return areas.includes(REST_AREA) && area !== PHONE_AREA && !PLACE_AREAS.includes(area);
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

// Charakter-/Spieler*innen-Filter. Bis zwei Charaktere: alle müssen dabei sein.
// Ab drei gewählten Charakteren gilt die Gruppen-Regel – mind. zwei von ihnen
// spielen mit und sonst kein Main Character (Nebenfiguren stören nicht). So
// findet „Lou, Sam, Nigel" auch die Szenen zu zweit. Spieler*innen-Tokens müssen
// immer passen; ihre Charaktere zählen in der Gruppe nicht als Fremde.
export function tokensMatch(
  tokens: string[],
  participantIds: string[],
  character: CharacterLookup,
): boolean {
  const chars = tokens.filter((t) => t.startsWith("char:")).map((t) => t.slice(5));
  const playerIds = tokens.filter((t) => t.startsWith("player:")).map((t) => t.slice(7));
  if (!playerIds.every((id) => tokenMatches(`player:${id}`, participantIds, character))) return false;
  if (chars.length < 3) return chars.every((id) => participantIds.includes(id));
  if (participantIds.filter((id) => chars.includes(id)).length < 2) return false;
  return participantIds.every((id) => {
    if (chars.includes(id)) return true;
    const c = character(id);
    return !c || !!c.is_npc || playerIds.includes(c.player_id);
  });
}

// Timeline-Regel: AUs sind eigene Zeitlinien – ohne AU-Auswahl nur Canon, mit
// Auswahl nur die Szenen der gewählten AUs.
export function matchesFilters(s: Scene, f: PlotFilters, character: CharacterLookup): boolean {
  if (f.aus.length === 0 ? s.au : !(s.au && f.aus.includes(s.au_name || AU_UNNAMED)))
    return false;
  if (!areaMatches(f.areas, s.location_area)) return false;
  return tokensMatch(f.tokens, s.participant_ids, character);
}

// Filter, die bei geöffnetem Plot zusätzlich gewählt sind, grenzen dessen Szenen
// weiter ein (ohne AU-Auswahl bleibt jede Zeitlinie des Plots stehen).
export function narrowsTo(s: Scene, f: PlotFilters, character: CharacterLookup): boolean {
  if (f.aus.length > 0 && !(s.au && f.aus.includes(s.au_name || AU_UNNAMED))) return false;
  if (!areaMatches(f.areas, s.location_area)) return false;
  return tokensMatch(f.tokens, s.participant_ids, character);
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
