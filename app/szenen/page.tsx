"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName, type AreaKey } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

type Tab = "active" | "all" | "mine" | "archive";
type SortKey = "active" | "inplay" | "created" | "title";

const SORT_LABELS: Record<SortKey, string> = {
  active: "Zuletzt aktiv",
  inplay: "In-Game-Datum",
  created: "Erstellungsdatum",
  title: "Titel A–Z",
};

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export default function ScenesPage() {
  const store = useStore();
  const { scenes, characters, players, character, postsOf, currentPlayer, charactersOf } =
    store;

  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [area, setArea] = useState<AreaKey | "rest" | "all">("all");
  const [period, setPeriod] = useState<string>("all"); // "YYYY-MM"
  const [playerId, setPlayerId] = useState<string>("all");
  const [charsOpen, setCharsOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Zeitpunkt der letzten Aktivität einer Szene (jüngster Post, sonst Erstellung)
  const lastActivity = (sceneId: string, fallback: string) => {
    const posts = postsOf(sceneId);
    return posts.length ? posts[posts.length - 1].created_at : fallback;
  };

  const myCharIds = useMemo(
    () =>
      new Set(currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : []),
    [currentPlayer, charactersOf],
  );

  // Verfügbare Monat/Jahr-Optionen aus den Szenen
  const periods = useMemo(() => {
    const set = new Set<string>();
    for (const s of scenes) set.add(s.inplay_date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [scenes]);

  function toggleChar(id: string) {
    setSelectedChars((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  const filtered = scenes.filter((s) => {
    // Tab
    if (tab === "active" && s.status !== "active") return false;
    if (tab === "archive" && s.status !== "closed") return false;
    if (tab === "mine" && !s.participant_ids.some((id) => myCharIds.has(id)))
      return false;
    // Suche (Titel)
    if (search.trim() && !s.title.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    // Charakter-Kombination: Szene muss ALLE gewählten Charaktere enthalten
    if (
      selectedChars.length > 0 &&
      !selectedChars.every((id) => s.participant_ids.includes(id))
    )
      return false;
    // Bezirk
    if (area !== "all") {
      if (area === "rest") {
        if (AREA_ORDER.includes(s.location_area as AreaKey)) return false;
      } else if (s.location_area !== area) return false;
    }
    // Monat/Jahr
    if (period !== "all" && s.inplay_date.slice(0, 7) !== period) return false;
    // Spieler
    if (playerId !== "all") {
      const ofPlayer = s.participant_ids.some(
        (id) => character(id)?.player_id === playerId,
      );
      if (!ofPlayer) return false;
    }
    return true;
  });

  // Sortierung
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

  // Charaktere nach Spieler gruppiert (für das Filter-Panel)
  const charsByPlayer = players
    .map((p) => ({
      player: p,
      chars: characters.filter((c) => c.player_id === p.id),
    }))
    .filter((g) => g.chars.length > 0);

  const activeFilters =
    (search.trim() ? 1 : 0) +
    selectedChars.length +
    (area !== "all" ? 1 : 0) +
    (period !== "all" ? 1 : 0) +
    (playerId !== "all" ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setSelectedChars([]);
    setArea("all");
    setPeriod("all");
    setPlayerId("all");
  }

  const selectCls =
    "bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-white/20";

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <PageHeader title="Szenen" subtitle="Alle Threads in Eden.">
        <Link
          href="/szenen/neu"
          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] border border-border-subtle px-3 py-2 text-[13px] text-text-primary"
        >
          <Icon name="plus" size={15} /> Neue Szene
        </Link>
      </PageHeader>

      {/* Primäre Tabs */}
      <div className="flex gap-1.5 mb-4">
        {(
          [
            ["active", "Aktive"],
            ["all", "Alle"],
            ["mine", "Meine"],
            ["archive", "Archiv"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
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
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Suche */}
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titel durchsuchen…"
              className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-white/20"
            />
          </div>

          {/* Bezirk */}
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as AreaKey | "rest" | "all")}
            className={selectCls}
          >
            <option value="all">Alle Bezirke</option>
            {AREA_ORDER.map((k) => (
              <option key={k} value={k} className="bg-bg-surface">
                {AREAS[k].name}
              </option>
            ))}
            <option value="rest" className="bg-bg-surface">
              Rest der Welt
            </option>
          </select>

          {/* Monat/Jahr */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={selectCls}
          >
            <option value="all">Alle Zeiträume</option>
            {periods.map((p) => {
              const [y, m] = p.split("-");
              return (
                <option key={p} value={p} className="bg-bg-surface">
                  {MONTHS_DE[parseInt(m, 10) - 1]} {y}
                </option>
              );
            })}
          </select>

          {/* Spieler */}
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className={selectCls}
          >
            <option value="all">Alle Spieler</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} className="bg-bg-surface">
                {p.username}
              </option>
            ))}
          </select>

          {/* Sortierung */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Sortieren
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className={selectCls}
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
              className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1.5 text-[12px] text-text-secondary hover:text-text-primary"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-text-tertiary hover:text-text-primary underline"
            >
              zurücksetzen ({activeFilters})
            </button>
          )}
        </div>

        {/* Charakter-Kombination (nach Spieler gruppiert, aufklappbar) */}
        <div>
          <button
            onClick={() => setCharsOpen((o) => !o)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
          >
            <span
              className={`inline-flex transition-transform ${
                charsOpen ? "rotate-90" : ""
              }`}
            >
              <Icon name="arrow-right" size={12} />
            </span>
            Charaktere
            <span className="normal-case tracking-normal">
              (Szene enthält alle gewählten)
            </span>
            {selectedChars.length > 0 && (
              <span className="rounded-full bg-accent text-black px-1.5 py-px text-[10px] font-medium">
                {selectedChars.length}
              </span>
            )}
          </button>

          {charsOpen && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {charsByPlayer.map(({ player, chars }) => (
                <div key={player.id}>
                  <div className="text-[10px] text-text-tertiary mb-1">
                    {player.username}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {chars.map((c) => {
                      const on = selectedChars.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleChar(c.id)}
                          className={`flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-0.5 text-[11px] transition-colors ${
                            on
                              ? "border-accent/60 bg-accent-soft text-text-primary"
                              : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.faceclaim_image_url ?? ""}
                            alt={c.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          {c.name.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ergebnis */}
      <div className="text-[11px] text-text-tertiary mb-3">
        {sorted.length} {sorted.length === 1 ? "Szene" : "Szenen"} ·{" "}
        {SORT_LABELS[sortKey]} {sortDir === "asc" ? "↑" : "↓"}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sorted.map((s) => {
          const posts = postsOf(s.id);
          const turnId = whoseTurn(s, posts);
          const participants = s.participant_ids
            .map((id) => character(id))
            .filter(Boolean);
          return (
            <Link
              key={s.id}
              href={`/szenen/${s.id}`}
              className="rounded-xl border border-border-subtle bg-bg-surface p-5 hover:bg-white/[0.03] transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    s.status === "active"
                      ? "bg-white/[0.06] text-text-secondary"
                      : "bg-white/[0.03] text-text-tertiary"
                  }`}
                >
                  {s.status === "active" ? "aktiv" : "geschlossen"}
                </span>
                {s.trigger_warning && (
                  <span className="text-[10px] uppercase tracking-wider text-red-300/80">
                    TW
                  </span>
                )}
              </div>
              <h3 className="font-serif text-[17px] text-text-primary mt-2 leading-tight">
                {s.title}
              </h3>
              <div className="text-[12px] text-text-tertiary mt-1">
                {s.location_name} · {areaName(s.location_area)}
              </div>
              <div className="text-[12px] text-text-tertiary">
                {formatInplayDate(s.inplay_date)}, {s.inplay_time}
              </div>

              <div className="mt-auto pt-4 flex items-center gap-1.5">
                {participants.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c!.id}
                    src={c!.faceclaim_image_url ?? ""}
                    alt={c!.name}
                    title={c!.name}
                    className="w-7 h-7 rounded-full object-cover border border-border-subtle"
                  />
                ))}
                <span className="ml-1 text-[11px] text-text-tertiary">
                  {participants.map((c) => c!.name.split(" ")[0]).join(" & ")}
                </span>
                {s.status === "active" && turnId && (
                  <span className="ml-auto text-[11px] text-text-secondary">
                    {character(turnId)?.name.split(" ")[0]} ist dran
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-[13px] text-text-tertiary">
          Keine Szenen für diese Filter.
        </div>
      )}
    </div>
  );
}
