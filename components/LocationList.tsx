"use client";

import Link from "next/link";
import { LocationCategoryPicker } from "./LocationCategoryPicker";
import { categoryIcon, categoryLabel, categoryOf } from "@/lib/places";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PLACE_AREAS, areaImage, areaName } from "@/lib/world";
import { areaFilterOptions, areaMatches } from "@/lib/plots";
import { PHONE_AREA } from "@/lib/phone";
import { bannerStyle } from "@/lib/headers";
import { hasAnyWord, norm, relatedWords } from "@/lib/place-words";
import { Icon } from "./Icon";
import { MultiSelect } from "./MultiSelect";
import { PlayerCharacterBubble } from "./PlayerCharacterBubble";
import type { AppSettings, Location } from "@/lib/types";

type Tab = "all" | "played" | "unplayed";
type SortKey = "name" | "scenes" | "played" | "created";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name A–Z",
  scenes: "Meiste Szenen",
  played: "Zuletzt bespielt",
  created: "Neu angelegt",
};

interface Stats {
  total: number;
  active: number;
  last: string; // jüngste Aktivität einer Szene an diesem Ort
  charIds: Set<string>; // wer hier gespielt hat
}

const NO_STATS: Stats = { total: 0, active: 0, last: "", charIds: new Set() };
const sceneKey = (area: string, name: string) => `${area}\n${name}`;

// Bild einer Ortskarte: eigenes Titelbild, sonst das erste Vibes-Foto, sonst das
// Bild der Gegend (wie im Gegend-Panel der Karte).
function cardImage(loc: Location, settings: AppSettings): string {
  return loc.image_url || loc.images?.[0] || areaImage(loc.area, settings);
}

// Listenansicht der Orte: alle Orte als Karten, durchsuchbar und filterbar –
// angelehnt an die Szenenübersicht.
export function LocationList() {
  const router = useRouter();
  const { locations, scenes, characters, players, character, postsOf, addLocation } =
    useStore();

  const [tabState, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [areas, setAreas] = useState<string[]>([]); // AreaKey | "rest"
  const [tokens, setTokens] = useState<string[]>([]); // "char:<id>" | "player:<id>"
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [adding, setAdding] = useState(false);

  const places = useMemo(
    () => locations.filter((l) => l.area !== PHONE_AREA),
    [locations],
  );

  // Szenen je Ort (Zuordnung wie überall: Gegend + Ortsname)
  const stats = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const s of scenes) {
      const k = sceneKey(s.location_area, s.location_name);
      const st = map.get(k) ?? { total: 0, active: 0, last: "", charIds: new Set<string>() };
      st.total += 1;
      if (s.status === "active") st.active += 1;
      const posts = postsOf(s.id);
      const last = posts.length ? posts[posts.length - 1].created_at : s.created_at;
      if (last > st.last) st.last = last;
      for (const id of s.participant_ids) st.charIds.add(id);
      map.set(k, st);
    }
    return map;
  }, [scenes, postsOf]);
  const statsOf = (l: Location) => stats.get(sceneKey(l.area, l.name)) ?? NO_STATS;

  const areaOptions = areaFilterOptions();

  const charsByPlayer = players
    .map((p) => ({ player: p, chars: characters.filter((c) => c.player_id === p.id) }))
    .filter((g) => g.chars.length > 0)
    .sort((a, b) =>
      a.player.username.localeCompare(b.player.username, "de", { sensitivity: "base" }),
    );

  // Charaktere am Ort: dort hinterlegt oder schon dort gespielt
  function tokenMatches(token: string, l: Location): boolean {
    const ids = new Set(statsOf(l).charIds);
    for (const p of l.people ?? []) ids.add(p.id);
    const [type, id] = token.split(":");
    if (type === "char") return ids.has(id);
    return Array.from(ids).some((cid) => character(cid)?.player_id === id);
  }

  // Reiter ohne Orte werden nicht angezeigt (wie in der Szenenübersicht)
  const tabs: [Tab, string][] = [
    ["all", "Alle"],
    ...(places.some((l) => statsOf(l).total > 0)
      ? ([["played", "Bespielt"]] as [Tab, string][])
      : []),
    ...(places.some((l) => statsOf(l).total === 0)
      ? ([["unplayed", "Noch nicht bespielt"]] as [Tab, string][])
      : []),
  ];
  const tab: Tab = tabs.some(([k]) => k === tabState) ? tabState : "all";

  const filtered = places.filter((l) => {
    const played = statsOf(l).total > 0;
    if (tab === "played" && !played) return false;
    if (tab === "unplayed" && played) return false;
    // Gegend (Mehrfach): mind. eine muss passen
    if (!areaMatches(areas, l.area)) return false;
    // Charaktere/Spieler*innen: der Ort muss zu ALLEN gewählten passen
    if (tokens.length > 0 && !tokens.every((t) => tokenMatches(t, l))) return false;
    return true;
  });

  const sortFn = (a: Location, b: Location) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name, "de");
        break;
      case "scenes":
        cmp = statsOf(a).total - statsOf(b).total;
        break;
      case "played":
        cmp = statsOf(a).last.localeCompare(statsOf(b).last);
        break;
      case "created":
        cmp = a.created_at.localeCompare(b.created_at);
        break;
    }
    if (cmp === 0) return a.name.localeCompare(b.name, "de");
    return sortDir === "asc" ? cmp : -cmp;
  };

  // Wortsuche: oben, was das Wort im Namen trägt; darunter Verwandtes – das Wort
  // in der Beschreibung oder ein Wort derselben Gruppe (Café → Diner).
  const q = norm(search).trim();
  const related = useMemo(() => relatedWords(search), [search]);
  const direct: Location[] = [];
  const kin: Location[] = [];
  for (const l of filtered) {
    if (!q) direct.push(l);
    else if (norm(l.name).includes(q)) direct.push(l);
    else {
      const text = norm(`${l.name} ${l.description ?? ""}`);
      if (text.includes(q) || hasAnyWord(text, related)) kin.push(l);
    }
  }
  direct.sort(sortFn);
  kin.sort(sortFn);

  const activeFilters = (q ? 1 : 0) + areas.length + tokens.length;
  function resetFilters() {
    setSearch("");
    setAreas([]);
    setTokens([]);
  }
  const toggleArea = (v: string) =>
    setAreas(areas.includes(v) ? areas.filter((x) => x !== v) : [...areas, v]);

  // Neuer Ort → direkt aufs Ortsprofil zum Ausbauen
  function createLocation(area: string, name: string, description: string, category: string | null) {
    const id = addLocation(area, name, description || null, category);
    setAdding(false);
    if (id) router.push(`/orte/${id}`);
  }

  const count = direct.length + kin.length;

  return (
    <div>
      {tabs.length > 1 && (
        <div className="flex gap-1.5 mb-4">
          {tabs.map(([key, label]) => (
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
      )}

      {/* Filterleiste */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Orte durchsuchen, z.B. Café …"
              className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
            />
          </div>
          <MultiSelect
            label="Gegend"
            options={areaOptions}
            selected={areas}
            onToggle={toggleArea}
            onClear={() => setAreas([])}
          />
        </div>

        {/* Charaktere: pro Spieler*in gebündelt, aufklappbar */}
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
      </div>

      {/* Über den Ergebnissen: links „Neuer Ort" und Filter zurücksetzen, rechts die Sortierung */}
      <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-2">
        <button
          onClick={() => setAdding((a) => !a)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
            adding
              ? "border-accent/50 text-accent"
              : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
          }`}
        >
          <Icon name="plus" size={13} /> Neuer Ort
        </button>
        {activeFilters > 0 && (
          <button
            onClick={resetFilters}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary underline"
          >
            Filter zurücksetzen ({activeFilters})
          </button>
        )}
        <span className="ml-auto text-[0.875rem] uppercase tracking-wider text-text-tertiary">
          Sortieren
        </span>
        <select
          value={sortKey}
          onChange={(e) => {
            const k = e.target.value as SortKey;
            setSortKey(k);
            // Namen von A an, alles andere mit dem Größten/Neuesten zuerst
            setSortDir(k === "name" ? "asc" : "desc");
          }}
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

      {adding && (
        <NewLocationForm
          initialArea={areas.length === 1 ? areas[0] : ""}
          onCancel={() => setAdding(false)}
          onCreate={createLocation}
        />
      )}

      <div className="text-[0.875rem] text-text-tertiary mb-3">
        {count} {count === 1 ? "Ort" : "Orte"}
      </div>

      {direct.length > 0 && (
        <div className={GRID}>
          {direct.map((l) => (
            <LocationCard key={l.id} loc={l} stats={statsOf(l)} />
          ))}
        </div>
      )}

      {kin.length > 0 && (
        <>
          <h2
            className={`font-display lowercase text-[1.5rem] leading-none text-text-primary mb-3 ${
              direct.length > 0 ? "mt-8" : ""
            }`}
          >
            verwandt.
          </h2>
          <div className={GRID}>
            {kin.map((l) => (
              <LocationCard key={l.id} loc={l} stats={statsOf(l)} />
            ))}
          </div>
        </>
      )}

      {count === 0 && (
        <div className="text-[0.875rem] text-text-tertiary">
          Keine Orte für diese Filter.
        </div>
      )}
    </div>
  );
}

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

// Ortskarte: Bild, Name, Kurzbeschreibung (falls vorhanden), Anzahl Szenen. Die
// ganze Karte führt aufs Ortsprofil.
function LocationCard({ loc, stats }: { loc: Location; stats: Stats }) {
  const { appSettings } = useStore();
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface transition-colors hover:bg-white/[0.03]">
      <div className="h-32 w-full bg-bg-surface-2 bg-cover" style={bannerStyle(cardImage(loc, appSettings))} />
      <div className="flex flex-1 flex-col px-4 py-3.5">
        <h3 className="font-serif text-[1rem] text-text-primary leading-tight break-words">
          <Link
            href={`/orte/${loc.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            <Icon
              name={categoryIcon(categoryOf(loc))}
              size={15}
              className="mr-1.5 inline-block align-[-2px] text-accent"
              aria-label={categoryLabel(categoryOf(loc))}
            />
            {loc.name}
          </Link>
        </h3>
        {loc.description && (
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-text-secondary line-clamp-3">
            {loc.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-1.5 text-[0.875rem] text-text-tertiary">
          <span className={stats.active > 0 ? "text-accent" : ""}>
            <Icon name={stats.active > 0 ? "match-lit" : "match"} size={16} />
          </span>
          {stats.total === 0
            ? "Noch nicht bespielt"
            : `${stats.total} ${stats.total === 1 ? "Szene" : "Szenen"}`}
          {stats.active > 0 && <span className="text-accent">· {stats.active} aktiv</span>}
        </div>
      </div>
    </div>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Neuer Ort aus der Liste heraus: Name, Gegend, Beschreibung (wie beim Anlegen
// über eine Szene, siehe LocationField).
function NewLocationForm({
  initialArea,
  onCancel,
  onCreate,
}: {
  initialArea: string;
  onCancel: () => void;
  onCreate: (area: string, name: string, description: string, category: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [area, setArea] = useState(initialArea);
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const ready = !!name.trim() && !!area;

  return (
    <div className="mb-4 max-w-xl rounded-lg border border-border-subtle bg-bg-surface p-3 flex flex-col gap-3">
      <div className="text-[0.8125rem] text-accent">Neuer Ort</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Titel des Orts"
        className={field}
        autoFocus
      />
      <label className="text-[0.8125rem] text-text-secondary">
        Gegend <span className="text-accent">*</span>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={`mt-1 ${field}`}
        >
          <option value="" disabled className="bg-bg-surface">
            Gegend wählen
          </option>
          {PLACE_AREAS.map((k) => (
            <option key={k} value={k} className="bg-bg-surface">
              {areaName(k)}
            </option>
          ))}
        </select>
      </label>
      <div className="text-[0.8125rem] text-text-secondary">
        Kategorie
        <div className="mt-1">
          <LocationCategoryPicker value={category} name={name} onChange={setCategory} />
        </div>
      </div>
      <label className="text-[0.8125rem] text-text-secondary">
        Beschreibung <span className="text-text-tertiary">(optional)</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Was ist das für ein Ort?"
          rows={3}
          className={`mt-1 resize-y ${field}`}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
        >
          Abbrechen
        </button>
        <button
          onClick={() => ready && onCreate(area, name, desc, category)}
          disabled={!ready}
          className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40"
        >
          Ort anlegen
        </button>
      </div>
    </div>
  );
}
