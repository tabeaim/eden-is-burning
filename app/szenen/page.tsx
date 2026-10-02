"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName, type AreaKey } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { MultiSelect } from "@/components/MultiSelect";
import { PlayerCharacterBubble } from "@/components/PlayerCharacterBubble";
import { SceneCard } from "@/components/SceneCard";
import { PlotBar } from "@/components/PlotBar";
import { plotScenes, visiblePlots } from "@/lib/plots";
import { AU_UNNAMED, auNames } from "@/components/AuNameField";
import type { Plot, Scene } from "@/lib/types";

type Tab = "active" | "all" | "mine" | "archive";
type SortKey = "active" | "inplay" | "created" | "title";

const SORT_LABELS: Record<SortKey, string> = {
  active: "Zuletzt aktiv",
  inplay: "In-Game-Datum",
  created: "Erstellungsdatum",
  title: "Titel A–Z",
};

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function ScenesPage() {
  const store = useStore();
  const {
    scenes,
    characters,
    players,
    character,
    postsOf,
    currentPlayer,
    charactersOf,
    isSceneNew,
    markAllScenesSeen,
    plots,
    addPlot,
    isAdmin,
  } = store;

  const [tab, setTab] = useState<Tab>("all");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchPost, setSearchPost] = useState("");
  const [aus, setAus] = useState<string[]>([]); // AU-Namen | AU_UNNAMED
  const [plotId, setPlotId] = useState<string | null>(null); // geöffneter Plot
  const [tokens, setTokens] = useState<string[]>([]); // "char:<id>" | "player:<id>"
  const [areas, setAreas] = useState<string[]>([]); // AreaKey | "rest"
  const [periods, setPeriods] = useState<string[]>([]); // "YYYY-MM"
  const [sortKey, setSortKey] = useState<SortKey>("active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filter aus der URL übernehmen (Verlinkung von „Karte" bzw. Relations).
  // Bewusst im Effect (nach Hydration), da window.location erst clientseitig vorliegt.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const area = params.get("area");
    const chars = params.get("chars");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (area) setAreas([area]);
    if (chars)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokens(chars.split(",").filter(Boolean).map((id) => `char:${id}`));
  }, []);

  const myCharIds = useMemo(
    () =>
      new Set(currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : []),
    [currentPlayer, charactersOf],
  );

  const lastActivity = (sceneId: string, fallback: string) => {
    const posts = postsOf(sceneId);
    return posts.length ? posts[posts.length - 1].created_at : fallback;
  };

  // Optionen für die Mehrfach-Dropdowns
  const areaOptions = [
    ...AREA_ORDER.map((k) => ({ value: k as string, label: AREAS[k].name })),
    { value: "rest", label: "Rest der Welt" },
  ].sort((a, b) => a.label.localeCompare(b.label, "de"));
  const auOptions = useMemo(() => {
    const opts = auNames(scenes).map((n) => ({ value: n, label: n }));
    if (scenes.some((s) => s.au && !s.au_name))
      opts.push({ value: AU_UNNAMED, label: "Ohne Namen" });
    return opts;
  }, [scenes]);
  const periodOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of scenes) set.add(s.inplay_date.slice(0, 7));
    return Array.from(set)
      .sort()
      .reverse()
      .map((p) => {
        const [y, m] = p.split("-");
        return { value: p, label: `${MONTHS_DE[parseInt(m, 10) - 1]} ${y}` };
      });
  }, [scenes]);

  function tokenMatches(token: string, participantIds: string[]): boolean {
    const [type, id] = token.split(":");
    if (type === "char") return participantIds.includes(id);
    return participantIds.some((pid) => character(pid)?.player_id === id);
  }

  // Suche: getrennt nach Titel und nach Post-Text (eins von beiden oder beide)
  const qTitle = searchTitle.trim().toLowerCase();
  const qPost = searchPost.trim().toLowerCase();
  const stripHtml = (h: string) => h.replace(/<[^>]*>/g, " ");
  const postMatchId = (scene: Scene): string | null => {
    if (!qPost) return null;
    for (const p of postsOf(scene.id)) {
      if (stripHtml(p.content).toLowerCase().includes(qPost)) return p.id;
    }
    return null;
  };

  // Geöffneter Plot: seine Szenen (aktuelle Filter für Charaktere/AU/Gegend plus
  // von Hand ergänzte, minus entfernte) ersetzen diese drei Filter.
  const plot = plots.find((p) => p.id === plotId) ?? null;
  const plotIds = plot
    ? new Set(plotScenes(plot, scenes, { tokens, aus, areas }, character).map((s) => s.id))
    : null;
  const myPlots = visiblePlots(
    plots,
    scenes,
    { playerId: currentPlayer?.id ?? "", isAdmin, charIds: myCharIds },
    character,
  );
  function togglePlot(p: Plot) {
    if (plotId === p.id) {
      setPlotId(null);
      return;
    }
    setPlotId(p.id);
    setTokens([...p.tokens]);
    setAus([...p.aus]);
    setAreas([...(p.areas ?? [])]);
  }

  const filtered = scenes.filter((s) => {
    if (plotIds && !plotIds.has(s.id)) return false;
    if (tab === "active" && s.status !== "active") return false;
    if (tab === "archive" && s.status !== "closed") return false;
    if (tab === "mine" && !s.participant_ids.some((id) => myCharIds.has(id)))
      return false;
    // AUs (Mehrfach): Szene muss in einem der gewählten AUs spielen
    if (!plotIds && aus.length > 0 && !(s.au && aus.includes(s.au_name || AU_UNNAMED)))
      return false;
    if (qTitle && !s.title.toLowerCase().includes(qTitle)) return false;
    if (qPost && !postMatchId(s)) return false;
    // Charaktere/Spieler: Szene muss zu ALLEN gewählten Tokens passen
    if (
      !plotIds &&
      tokens.length > 0 &&
      !tokens.every((t) => tokenMatches(t, s.participant_ids))
    )
      return false;
    // Gegend (Mehrfach): mind. eine muss passen
    if (!plotIds && areas.length > 0) {
      const inArea = areas.includes("rest")
        ? !AREA_ORDER.includes(s.location_area as AreaKey)
        : false;
      if (!areas.includes(s.location_area) && !inArea) return false;
    }
    // Zeiträume (Mehrfach): mind. einer muss passen
    if (periods.length > 0 && !periods.includes(s.inplay_date.slice(0, 7)))
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "active":
        cmp =
          new Date(lastActivity(a.id, a.created_at)).getTime() -
          new Date(lastActivity(b.id, b.created_at)).getTime();
        break;
      case "inplay":
        cmp = a.inplay_date < b.inplay_date ? -1 : a.inplay_date > b.inplay_date ? 1 : 0;
        break;
      case "created":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "title":
        cmp = a.title.localeCompare(b.title, "de");
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const charsByPlayer = players
    .map((p) => ({ player: p, chars: characters.filter((c) => c.player_id === p.id) }))
    .filter((g) => g.chars.length > 0)
    .sort((a, b) =>
      a.player.username.localeCompare(b.player.username, "de", {
        sensitivity: "base",
      }),
    );

  const activeFilters =
    (qTitle ? 1 : 0) +
    (qPost ? 1 : 0) +
    aus.length +
    (plot ? 1 : 0) +
    tokens.length +
    areas.length +
    periods.length;

  function resetFilters() {
    setSearchTitle("");
    setSearchPost("");
    setAus([]);
    setPlotId(null);
    setTokens([]);
    setAreas([]);
    setPeriods([]);
  }

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Szenen" subtitle="Alle Threads in Eden." width="max-w-6xl" />

      {/* Primäre Tabs */}
      <div className="flex gap-1.5 mb-4">
        {(
          [
            ["all", "Alle"],
            ["active", "Aktive"],
            ["mine", "Meine"],
            ["archive", "Archiv"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
              tab === key
                ? "bg-accent text-black font-medium"
                : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filterleiste */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Icon name="search" size={14} />
            </span>
            <input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Titel durchsuchen…"
              className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </div>
          <div className="relative flex-1 min-w-[150px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Icon name="search" size={14} />
            </span>
            <input
              value={searchPost}
              onChange={(e) => setSearchPost(e.target.value)}
              placeholder="Text in Posts suchen…"
              className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </div>

          <MultiSelect
            label="Gegend"
            options={areaOptions}
            selected={areas}
            onToggle={(v) => toggle(areas, setAreas, v)}
            onClear={() => setAreas([])}
          />
          <MultiSelect
            label="Zeiträume"
            options={periodOptions}
            selected={periods}
            onToggle={(v) => toggle(periods, setPeriods, v)}
            onClear={() => setPeriods([])}
          />

          <MultiSelect
            label="AU"
            icon="au"
            options={auOptions}
            selected={aus}
            onToggle={(v) => toggle(aus, setAus, v)}
            onClear={() => setAus([])}
          />
        </div>

        {/* Charaktere: pro Spieler gebündelt, aufklappbar */}
        <div className="flex flex-wrap gap-2">
          {charsByPlayer.map(({ player, chars }) => (
            <PlayerCharacterBubble
              key={player.id}
              player={player}
              chars={chars}
              tokens={tokens}
              setTokens={setTokens}
            />
          ))}
        </div>

        <PlotBar
          plots={myPlots}
          activeId={plotId}
          onToggle={togglePlot}
          onSave={(name) => setPlotId(addPlot(name, [...tokens], [...aus], [...areas]))}
        />
      </div>

      {/* Über den Ergebnissen: links Filter zurücksetzen, rechts „Alle gelesen" + Sortierung */}
      <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-2">
        {activeFilters > 0 && (
          <button
            onClick={resetFilters}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary underline"
          >
            Filter zurücksetzen ({activeFilters})
          </button>
        )}
        <button
          onClick={markAllScenesSeen}
          disabled={!scenes.some((s) => isSceneNew(s.id))}
          title="Alle Szenen als gelesen markieren"
          className="ml-auto mr-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-primary px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-secondary"
        >
          <Icon name="check" size={13} /> Alle gelesen
        </button>
        <span className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
          Sortieren
        </span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k} className="bg-bg-surface">
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          title={sortDir === "asc" ? "Aufsteigend" : "Absteigend"}
          className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>

      <div className="text-[0.875rem] text-text-tertiary mb-3">
        {sorted.length} {sorted.length === 1 ? "Szene" : "Szenen"}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sorted.map((s) => {
          const matchId = postMatchId(s);
          return (
            <SceneCard
              key={s.id}
              scene={s}
              href={
                matchId
                  ? `/szenen/${s.id}?q=${encodeURIComponent(searchPost.trim())}#post-${matchId}`
                  : undefined
              }
            />
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-[0.875rem] text-text-tertiary">
          Keine Szenen für diese Filter.
        </div>
      )}
    </div>
  );
}
