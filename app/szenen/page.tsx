"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { useSessionState } from "@/lib/session-state";
import { compareInplay } from "@/lib/format";
import { TabRule } from "@/components/TabRule";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { MultiSelect } from "@/components/MultiSelect";
import { PlayerCharacterBubble } from "@/components/PlayerCharacterBubble";
import { SceneCard } from "@/components/SceneCard";
import { PlotBar, PlotTools } from "@/components/PlotBar";
import { areaFilterOptions, areaMatches, plotFilters, plotScenes, tokensMatch, visiblePlots } from "@/lib/plots";
import { AU_UNNAMED, auNames } from "@/components/AuNameField";
import type { Plot, Scene } from "@/lib/types";
import { SCENE_KINDS, chatHref, newestMessage, sceneKind } from "@/lib/chats";

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
    scenes: playedScenes,
    smsScenes,
    chatMessages,
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
    canEditPlot,
    isAdmin,
  } = store;

  // Gespielte Szenen (auch Telefonszenen) und SMS-Szenen in einer Liste
  const scenes = useMemo(() => [...playedScenes, ...smsScenes], [playedScenes, smsScenes]);

  const [tabState, setTab] = useSessionState<Tab>("szenen:tab", "all");
  // Art: zunächst nur richtige Szenen; Anrufe und SMS lassen sich dazuwählen (leer = alle)
  const [kinds, setKinds] = useSessionState<string[]>("szenen:kinds", ["scene"]);
  const kindsChanged = kinds.length !== 1 || kinds[0] !== "scene";
  const [searchTitle, setSearchTitle] = useSessionState("szenen:searchtitle", "");
  const [searchPost, setSearchPost] = useSessionState("szenen:searchpost", "");
  const [aus, setAus] = useSessionState<string[]>("szenen:aus", []); // AU-Namen | AU_UNNAMED
  const [plotId, setPlotId] = useSessionState<string | null>("szenen:plotid", null); // geöffneter Plot
  const [tokens, setTokens] = useSessionState<string[]>("szenen:tokens", []); // "char:<id>" | "player:<id>"
  const [areas, setAreas] = useSessionState<string[]>("szenen:areas", []); // AreaKey | "rest"
  const [periods, setPeriods] = useSessionState<string[]>("szenen:periods", []); // "YYYY-MM"
  const [sortKey, setSortKey] = useSessionState<SortKey>("szenen:sortkey", "active");
  const [sortDir, setSortDir] = useSessionState<"asc" | "desc">("szenen:sortdir", "desc");

  // Filter aus der URL übernehmen (Verlinkung von „Karte" bzw. Relations).
  // Bewusst im Effect (nach Hydration), da window.location erst clientseitig vorliegt.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const area = params.get("area");
    const chars = params.get("chars");
    // Ein Link mit Filter ersetzt, was aus der Sitzung noch gemerkt ist
    if (area || chars) {
      setPlotId(null);
      setAus([]);
      setPeriods([]);
      setSearchTitle("");
      setSearchPost("");
      setTab("all");
      if (!area) setAreas([]);
      if (!chars) setTokens([]);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (area) setAreas([area]);
    if (chars) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokens(chars.split(",").filter(Boolean).map((id) => `char:${id}`));
      // aus den Relations: alles Gemeinsame, auch Anrufe und SMS
      setKinds([]);
    }
  }, []);

  const myCharIds = useMemo(
    () =>
      new Set(currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : []),
    [currentPlayer, charactersOf],
  );

  const lastActivity = (s: Scene) => {
    if (s.chat_id) {
      return newestMessage(chatMessages.filter((m) => m.scene_id === s.id))?.created_at ?? s.created_at;
    }
    const posts = postsOf(s.id);
    return posts.length ? posts[posts.length - 1].created_at : s.created_at;
  };

  // Optionen für die Mehrfach-Dropdowns
  const areaOptions = areaFilterOptions();
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

  // Suche: getrennt nach Titel und nach Post-Text (eins von beiden oder beide)
  const qTitle = searchTitle.trim().toLowerCase();
  const qPost = searchPost.trim().toLowerCase();
  // Post-Texte liegen nicht alle im Browser – die Suche darin läuft in der Datenbank
  // (kurz verzögert, damit nicht jeder Tastendruck eine Abfrage auslöst)
  const { searchPosts } = store;
  const [postHits, setPostHits] = useState<{ term: string; hits: Map<string, string> } | null>(null);
  useEffect(() => {
    if (!qPost) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchPosts(qPost).then((hits) => {
        if (!cancelled) setPostHits({ term: qPost, hits });
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [qPost, searchPosts]);
  const postMatchId = (scene: Scene): string | null => {
    if (!qPost) return null;
    if (scene.chat_id) {
      const hit = chatMessages.find(
        (m) => m.scene_id === scene.id && (m.kind === "text" || m.kind === "voice") && m.content.toLowerCase().includes(qPost),
      );
      return hit?.id ?? null;
    }
    return (postHits?.term === qPost ? postHits.hits.get(scene.id) : null) ?? null;
  };

  // Geöffneter Plot: seine Szenen (eigene Filter plus von Hand ergänzte, minus
  // entfernte). Was darüber hinaus gewählt ist, grenzt weiter ein.
  const plot = plots.find((p) => p.id === plotId) ?? null;
  const plotIds = plot
    ? new Set(plotScenes(plot, scenes, plotFilters(plot), character).map((s) => s.id))
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
    // Gewählte Charakter-Filter fallen weg, alle anderen bleiben
    setPlotId(p.id);
    setTokens([]);
  }

  // Reiter ohne Szenen werden nicht angezeigt („Alle" immer; ein einzelner Reiter braucht keine Leiste)
  const sceneTabs: [Tab, string][] = [
    ["all", "Alle"],
    ...(scenes.some((s) => s.status === "active") ? ([["active", "Aktive"]] as [Tab, string][]) : []),
    ...(scenes.some((s) => s.participant_ids.some((id) => myCharIds.has(id)))
      ? ([["mine", "Meine"]] as [Tab, string][])
      : []),
    ...(scenes.some((s) => s.status === "closed") ? ([["archive", "Archiv"]] as [Tab, string][]) : []),
  ];
  const tab: Tab = sceneTabs.some(([k]) => k === tabState) ? tabState : "all";

  const filtered = scenes.filter((s) => {
    if (plotIds && !plotIds.has(s.id)) return false;
    if (kinds.length > 0 && !kinds.includes(sceneKind(s))) return false;
    if (tab === "active" && s.status !== "active") return false;
    if (tab === "archive" && s.status !== "closed") return false;
    if (tab === "mine" && !s.participant_ids.some((id) => myCharIds.has(id)))
      return false;
    // AUs (Mehrfach): Szene muss in einem der gewählten AUs spielen
    if (aus.length > 0 && !(s.au && aus.includes(s.au_name || AU_UNNAMED)))
      return false;
    if (qTitle && !s.title.toLowerCase().includes(qTitle)) return false;
    if (qPost && !postMatchId(s)) return false;
    // Charaktere/Spieler*innen (ab drei Charakteren: Gruppen-Regel, siehe tokensMatch)
    if (!tokensMatch(tokens, s.participant_ids, character)) return false;
    // Gegend (Mehrfach): mind. eine muss passen
    if (!areaMatches(areas, s.location_area)) return false;
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
          new Date(lastActivity(a)).getTime() - new Date(lastActivity(b)).getTime();
        break;
      case "inplay":
        cmp = compareInplay(a, b);
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
    (kindsChanged ? 1 : 0) +
    tokens.length +
    areas.length +
    periods.length;

  function resetFilters() {
    setSearchTitle("");
    setSearchPost("");
    setAus([]);
    setKinds(["scene"]);
    setPlotId(null);
    setTokens([]);
    setAreas([]);
    setPeriods([]);
  }

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-8 pb-8 ${sceneTabs.length > 1 ? "pt-5" : "pt-8"}`}>
      <PageHeader title="Szenen" subtitle="Alle Threads in Eden." width="max-w-6xl" />

      {/* Primäre Tabs – mittig zwischen Header-Linie und Strich */}
      {sceneTabs.length > 1 && (
        <>
        <div className="flex gap-1.5">
          {sceneTabs.map(([key, label]) => (
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
        <TabRule />
        </>
      )}

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
            label="Art"
            options={SCENE_KINDS}
            selected={kinds}
            onToggle={(v) => toggle(kinds, setKinds, v)}
            onClear={() => setKinds(["scene"])}
          />
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
          canSave={[...tokens, ...aus, ...areas].length > 0}
        />
      </div>

      {/* Über den Ergebnissen: links „Alle gelesen" und Filter zurücksetzen, rechts die Sortierung */}
      <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-2">
        <button
          onClick={markAllScenesSeen}
          disabled={!scenes.some((s) => isSceneNew(s.id))}
          title="Alle Szenen als gelesen markieren"
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-primary px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-secondary"
        >
          <Icon name="check" size={13} /> Alle gelesen
        </button>
        {activeFilters > 0 && (
          <button
            onClick={resetFilters}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary underline"
          >
            Filter zurücksetzen ({activeFilters})
          </button>
        )}
        {/* Geöffneter Plot: umbenennen / löschen (wie in der Timeline) */}
        {plot && canEditPlot(plot) && (
          <PlotTools key={plot.id} plot={plot} onDeleted={() => togglePlot(plot)} />
        )}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sortieren nach"
          className="ml-auto bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((s) => {
          const matchId = postMatchId(s);
          return (
            <SceneCard
              key={s.id}
              scene={s}
              href={
                !matchId
                  ? undefined
                  : s.chat_id
                    ? chatHref(s.chat_id, matchId)
                    : `/szenen/${s.id}?q=${encodeURIComponent(searchPost.trim())}#post-${matchId}`
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
