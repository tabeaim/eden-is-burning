"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName, type AreaKey } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import type { Character, Player } from "@/lib/types";

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
  const { scenes, characters, players, character, postsOf, currentPlayer, charactersOf } =
    store;

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [tokens, setTokens] = useState<string[]>([]); // "char:<id>" | "player:<id>"
  const [areas, setAreas] = useState<string[]>([]); // AreaKey | "rest"
  const [periods, setPeriods] = useState<string[]>([]); // "YYYY-MM"
  const [sortKey, setSortKey] = useState<SortKey>("active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
  ];
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

  const filtered = scenes.filter((s) => {
    if (tab === "active" && s.status !== "active") return false;
    if (tab === "archive" && s.status !== "closed") return false;
    if (tab === "mine" && !s.participant_ids.some((id) => myCharIds.has(id)))
      return false;
    if (search.trim() && !s.title.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    // Charaktere/Spieler: Szene muss zu ALLEN gewählten Tokens passen
    if (tokens.length > 0 && !tokens.every((t) => tokenMatches(t, s.participant_ids)))
      return false;
    // Bezirke (Mehrfach): mind. einer muss passen
    if (areas.length > 0) {
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
    .filter((g) => g.chars.length > 0);

  const activeFilters =
    (search.trim() ? 1 : 0) + tokens.length + areas.length + periods.length;

  function resetFilters() {
    setSearch("");
    setTokens([]);
    setAreas([]);
    setPeriods([]);
  }

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

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
            ["all", "Alle"],
            ["active", "Aktive"],
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
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

          <MultiSelect
            label="Bezirke"
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

          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-text-tertiary hover:text-text-primary underline"
            >
              zurücksetzen ({activeFilters})
            </button>
          )}
        </div>

        {/* Charaktere: pro Spieler gebündelt, aufklappbar */}
        <div className="flex flex-wrap gap-2">
          {charsByPlayer.map(({ player, chars }) => (
            <PlayerCharacterBubble
              key={player.id}
              player={player}
              chars={chars}
              tokens={tokens}
              onTogglePlayer={() => toggle(tokens, setTokens, `player:${player.id}`)}
              onToggleChar={(id) => toggle(tokens, setTokens, `char:${id}`)}
            />
          ))}
        </div>
      </div>

      {/* Sortierung — rechtsbündig, direkt über den Ergebnissen */}
      <div className="flex items-center justify-end gap-1.5 mt-4 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
          Sortieren
        </span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-white/20"
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

      <div className="text-[11px] text-text-tertiary mb-3">
        {sorted.length} {sorted.length === 1 ? "Szene" : "Szenen"}
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

// Mehrfach-Auswahl-Dropdown mit Checkboxen
function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
          selected.length > 0
            ? "border-accent/50 bg-accent-soft text-text-primary"
            : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-accent text-black px-1.5 text-[10px] font-medium">
            {selected.length}
          </span>
        )}
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
          <Icon name="arrow-right" size={11} />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-72 overflow-auto rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 shadow-xl">
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => onToggle(o.value)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-text-secondary hover:bg-white/[0.04]"
              >
                <span
                  className={`flex items-center justify-center w-3.5 h-3.5 rounded border text-[9px] ${
                    on
                      ? "bg-accent border-accent text-black"
                      : "border-border-strong"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className={on ? "text-text-primary" : ""}>{o.label}</span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <button
              onClick={onClear}
              className="w-full text-left px-2 py-1.5 text-[11px] text-text-tertiary hover:text-text-primary"
            >
              Auswahl leeren
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Spieler-Bubble, die zu einzelnen Charakteren ausfächert
function PlayerCharacterBubble({
  player,
  chars,
  tokens,
  onTogglePlayer,
  onToggleChar,
}: {
  player: Player;
  chars: Character[];
  tokens: string[];
  onTogglePlayer: () => void;
  onToggleChar: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const playerOn = tokens.includes(`player:${player.id}`);
  const selectedCharCount = chars.filter((c) =>
    tokens.includes(`char:${c.id}`),
  ).length;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = playerOn || selectedCharCount > 0;

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-full border pl-1 pr-1 py-0.5 transition-colors ${
          active
            ? "border-accent/60 bg-accent-soft"
            : "border-border-subtle bg-bg-primary"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.avatar_url ?? ""}
          alt={player.username}
          className="w-5 h-5 rounded-full object-cover"
        />
        <button
          onClick={onTogglePlayer}
          title="Ganzen Spieler (alle Charaktere) wählen"
          className={`px-2 text-[12px] ${
            playerOn ? "text-text-primary font-medium" : "text-text-secondary"
          }`}
        >
          {player.username}
          {selectedCharCount > 0 && !playerOn && (
            <span className="ml-1 text-accent">·{selectedCharCount}</span>
          )}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Einzelne Charaktere wählen"
          className="px-1 text-text-tertiary hover:text-text-primary"
        >
          <span className={`inline-flex transition-transform ${open ? "rotate-90" : ""}`}>
            <Icon name="arrow-right" size={11} />
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-48 rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 shadow-xl">
          <button
            onClick={onTogglePlayer}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/[0.04]"
          >
            <span
              className={`flex items-center justify-center w-3.5 h-3.5 rounded border text-[9px] ${
                playerOn ? "bg-accent border-accent text-black" : "border-border-strong"
              }`}
            >
              {playerOn ? "✓" : ""}
            </span>
            <span className={playerOn ? "text-text-primary" : "text-text-secondary"}>
              Alle von {player.username}
            </span>
          </button>
          <div className="my-1 border-t border-border-subtle" />
          {chars.map((c) => {
            const on = tokens.includes(`char:${c.id}`);
            return (
              <button
                key={c.id}
                onClick={() => onToggleChar(c.id)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/[0.04]"
              >
                <span
                  className={`flex items-center justify-center w-3.5 h-3.5 rounded border text-[9px] ${
                    on ? "bg-accent border-accent text-black" : "border-border-strong"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.faceclaim_image_url ?? ""}
                  alt={c.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className={on ? "text-text-primary" : "text-text-secondary"}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
