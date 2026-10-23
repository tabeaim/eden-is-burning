"use client";

import { characterImage } from "@/lib/avatar";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useSessionState } from "@/lib/session-state";
import { compareInplay, formatDateTimeShort, formatInplayDate, formatInplayDateWeekday } from "@/lib/format";
import {
  AU_UNNAMED,
  areaFilterOptions,
  matchesFilters,
  narrowsTo,
  plotFilters,
  plotScenes,
  visiblePlots,
  type PlotFilters,
} from "@/lib/plots";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { MultiSelect } from "@/components/MultiSelect";
import { AuTag, SceneMatch, useLastEntry } from "@/components/SceneCard";
import { DatePicker } from "@/components/DatePicker";
import { PlotBar, PlotTools, plotToolBtn as smallBtn } from "@/components/PlotBar";
import { CharacterPicker } from "@/components/CharacterPicker";
import { auNames } from "@/components/AuNameField";
import { PlayerCharacterBubble } from "@/components/PlayerCharacterBubble";
import type { Character, OffScene, Plot, Scene } from "@/lib/types";
import { SCENE_KINDS, sceneHref, sceneKind, scenePlace } from "@/lib/chats";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";
// Ein Eintrag im Zeitstrahl: gespielte Szene oder Off-Szene eines Plots
type Entry =
  | { kind: "scene"; date: string; scene: Scene }
  | { kind: "off"; date: string; off: OffScene };
const entryItem = (e: Entry) => (e.kind === "scene" ? e.scene : e.off);

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export default function TimelinePage() {
  const {
    scenes: playedScenes,
    smsScenes,
    characters,
    players,
    plots,
    character,
    addPlot,
    updatePlot,
    canEditPlot,
    currentPlayer,
    isAdmin,
    charactersOf,
  } = useStore();
  // Gespielte Szenen (auch Telefonszenen) und SMS-Szenen auf einem Zeitstrahl
  const scenes = useMemo(() => [...playedScenes, ...smsScenes], [playedScenes, smsScenes]);
  const [kinds, setKinds] = useSessionState<string[]>("timeline:kinds", []); // Szene | Anruf | SMS (leer = alle)
  const [tokens, setTokens] = useSessionState<string[]>("timeline:tokens", []); // "char:<id>" | "player:<id>"
  const [aus, setAus] = useSessionState<string[]>("timeline:aus", []); // AU-Namen | AU_UNNAMED (leer = Canon)
  const [areas, setAreas] = useSessionState<string[]>("timeline:areas", []); // Gegend
  const [yearSel, setYearSel] = useSessionState<string[]>("timeline:yearsel", []); // leer = alle Jahre
  const [plotId, setPlotId] = useSessionState<string | null>("timeline:plotid", null);
  const [addingOff, setAddingOff] = useState(false);
  // Von Hand hinzugefügte Szenen bleiben sichtbar, auch wenn die gerade gewählten
  // Filter (Charakter, AU, Gegend, Jahr, Art) sie sonst ausblenden würden
  const [justAdded, setJustAdded] = useState<{ plot: string; ids: string[] }>({ plot: "", ids: [] });

  const plot = plots.find((p) => p.id === plotId) ?? null;
  const editable = plot ? canEditPlot(plot) : false;
  const filters: PlotFilters = { tokens, aus, areas };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const charsByPlayer = players
    .map((p) => ({ player: p, chars: characters.filter((c) => c.player_id === p.id) }))
    .filter((g) => g.chars.length > 0)
    .sort((a, b) =>
      a.player.username.localeCompare(b.player.username, "de", { sensitivity: "base" }),
    );

  const auOptions = useMemo(() => {
    const opts = auNames(scenes).map((n) => ({ value: n, label: n }));
    if (scenes.some((s) => s.au && !s.au_name))
      opts.push({ value: AU_UNNAMED, label: "Ohne Namen" });
    return opts;
  }, [scenes]);

  // Sichtbare Szenen: der offene Plot bringt seine eigenen Filter mit; was
  // darüber hinaus gewählt ist, grenzt seine Szenen weiter ein
  const added = new Set(plot && justAdded.plot === plot.id ? justAdded.ids : []);
  const shownScenes = (
    plot
      ? plotScenes(plot, scenes, plotFilters(plot), character).filter(
          (s) => added.has(s.id) || narrowsTo(s, filters, character),
        )
      : scenes.filter((s) => matchesFilters(s, filters, character))
  ).filter((s) => added.has(s.id) || kinds.length === 0 || kinds.includes(sceneKind(s)));

  const myId = currentPlayer?.id ?? "";
  const myPlots = visiblePlots(
    plots,
    scenes,
    { playerId: myId, isAdmin, charIds: new Set(charactersOf(myId).map((c) => c.id)) },
    character,
  );

  const allEntries: Entry[] = [
    ...shownScenes.map((s): Entry => ({ kind: "scene", date: s.inplay_date, scene: s })),
    ...(plot?.off_scenes ?? []).map((o): Entry => ({ kind: "off", date: o.inplay_date, off: o })),
    // neueste zuerst; am selben Tag nach Tageszeit, Einträge ohne Uhrzeit zuletzt
  ].sort((a, b) => compareInplay(entryItem(b), entryItem(a)));

  // Jahres-Filter (z.B. Rückblenden nach 2014): Auswahl aus den vorhandenen
  // Jahren; nicht mehr vorhandene Jahre in der Auswahl zählen nicht.
  const years = Array.from(new Set(allEntries.map((e) => e.date.slice(0, 4))));
  const activeYears = yearSel.filter((y) => years.includes(y));
  const entries =
    activeYears.length > 0
      ? allEntries.filter(
          (e) =>
            activeYears.includes(e.date.slice(0, 4)) ||
            (e.kind === "scene" && added.has(e.scene.id)),
        )
      : allEntries;

  // nach Monat gruppieren (neueste zuerst)
  const groups: { key: string; label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const [y, m] = key.split("-");
      g = { key, label: `${MONTHS_DE[parseInt(m, 10) - 1] ?? "?"} ${y}`, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  const filterCount = tokens.length + aus.length + areas.length + activeYears.length + kinds.length;
  // Gewählte Charakter-/AU-/Gegend-Filter lassen sich als neue Filter des Plots speichern
  const filterChanged = plot
    ? tokens.length + aus.length + areas.length > 0 &&
      (!sameSet(plot.tokens, tokens) ||
        !sameSet(plot.aus, aus) ||
        !sameSet(plot.areas ?? [], areas))
    : false;
  const addable = plot
    ? scenes.filter((s) => !plotScenes(plot, scenes, plotFilters(plot), character).includes(s))
    : [];

  function togglePlot(p: Plot) {
    setAddingOff(false);
    if (plotId === p.id) {
      setPlotId(null);
      return;
    }
    // Der Plot kennt seine Charaktere selbst – gewählte Charakter-Filter fallen
    // weg, alle anderen bleiben. Danach lässt sich wieder eingrenzen.
    setPlotId(p.id);
    setTokens([]);
  }

  function removeScene(id: string) {
    if (!plot) return;
    if (plot.include_ids.includes(id))
      updatePlot(plot.id, { include_ids: plot.include_ids.filter((x) => x !== id) });
    else updatePlot(plot.id, { exclude_ids: [...plot.exclude_ids, id] });
  }

  function addScene(id: string) {
    if (!plot) return;
    updatePlot(plot.id, {
      include_ids: [...plot.include_ids.filter((x) => x !== id), id],
      exclude_ids: plot.exclude_ids.filter((x) => x !== id),
    });
    setJustAdded((prev) => ({
      plot: plot.id,
      ids: [...(prev.plot === plot.id ? prev.ids : []), id],
    }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title="Timeline"
        subtitle="In-Game-Zeitstrahl der Szenen, nach Monaten gruppiert."
        width="max-w-6xl"
      />

      {/* Filterleiste – aufgebaut wie in der Szenen-Übersicht */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {charsByPlayer.map(({ player, chars }) => (
            <PlayerCharacterBubble
              key={player.id}
              player={player}
              chars={chars}
              tokens={tokens}
              setTokens={setTokens}
            />
          ))}
          <MultiSelect
            label="Art"
            options={SCENE_KINDS}
            selected={kinds}
            onToggle={(v) => toggle(kinds, setKinds, v)}
            onClear={() => setKinds([])}
          />
          <MultiSelect
            label="Gegend"
            options={areaFilterOptions()}
            selected={areas}
            onToggle={(v) => toggle(areas, setAreas, v)}
            onClear={() => setAreas([])}
          />
          <MultiSelect
            label="AU"
            icon="au"
            options={auOptions}
            selected={aus}
            onToggle={(v) => toggle(aus, setAus, v)}
            onClear={() => setAus([])}
          />
          <MultiSelect
            label="Jahr"
            icon="calendar"
            options={years.map((y) => ({ value: y, label: y }))}
            selected={activeYears}
            onToggle={(v) => toggle(activeYears, setYearSel, v)}
            onClear={() => setYearSel([])}
          />
        </div>

        <PlotBar
          plots={myPlots}
          activeId={plotId}
          onToggle={togglePlot}
          onSave={(name) => setPlotId(addPlot(name, [...tokens], [...aus], [...areas]))}
          canSave={[...tokens, ...aus, ...areas].length > 0}
        />
      </div>

      {/* Über dem Zeitstrahl: Anzahl, Filter zurücksetzen, Plot-Werkzeuge */}
      <div className="mt-4 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[0.875rem] text-text-tertiary">
          {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
        </span>
        {filterCount > 0 && !plot && (
          <button
            onClick={() => {
              setTokens([]);
              setAus([]);
              setAreas([]);
              setYearSel([]);
              setKinds([]);
            }}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary underline"
          >
            Filter zurücksetzen ({filterCount})
          </button>
        )}

        {plot && editable && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {filterChanged && (
              <button
                onClick={() =>
                  updatePlot(plot.id, { tokens: [...tokens], aus: [...aus], areas: [...areas] })
                }
                className={smallBtn}
                title="Ersetzt die Filter des Plots (Charaktere, AU, Gegend) durch die gerade gewählten"
              >
                <Icon name="check" size={13} /> Als Plot-Filter speichern
              </button>
            )}
            <SceneSearchAdd scenes={addable} onAdd={addScene} />
            <button onClick={() => setAddingOff((v) => !v)} className={smallBtn}>
              <Icon name="plus" size={13} /> Off-Szene
            </button>
            <PlotTools key={plot.id} plot={plot} onDeleted={() => setPlotId(null)} />
          </div>
        )}
      </div>

      {plot && editable && addingOff && (
        <OffSceneForm
          characters={characters}
          onCancel={() => setAddingOff(false)}
          onCreate={(off) => {
            updatePlot(plot.id, { off_scenes: [...plot.off_scenes, off] });
            setAddingOff(false);
          }}
        />
      )}

      {/* Zeitstrahl, nach Monaten gruppiert */}
      <div className="max-w-3xl">
        {groups.length === 0 ? (
          <p className="text-[0.875rem] text-text-tertiary">
            {plot
              ? "Dieser Plot hat noch keine Einträge."
              : "Keine Szenen für diesen Filter."}
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((g, i) => (
              <section key={g.key}>
                {/* Jahres-Überschrift, sobald mehrere Jahre untereinander stehen */}
                {groups[0].key.slice(0, 4) !== groups[groups.length - 1].key.slice(0, 4) &&
                  g.key.slice(0, 4) !== groups[i - 1]?.key.slice(0, 4) && (
                    <div className="mb-4 font-display text-[1.75rem] leading-none text-accent">
                      {g.key.slice(0, 4)}
                    </div>
                  )}
                <h2 className="section-bar text-[0.875rem] text-text-secondary mb-4">
                  {g.label}
                </h2>
                <div className="relative ml-3.5 border-l border-border-subtle pl-7 flex flex-col gap-3">
                  {g.items.map((e) => {
                    if (e.kind === "scene") {
                      const sc = e.scene;
                      return (
                        <SceneEntry
                          key={sc.id}
                          scene={sc}
                          onRemove={plot && editable ? () => removeScene(sc.id) : undefined}
                        />
                      );
                    }
                    const off = e.off;
                    return (
                      <OffEntry
                        key={off.id}
                        off={off}
                        onRemove={
                          plot && editable
                            ? () =>
                                updatePlot(plot.id, {
                                  off_scenes: plot.off_scenes.filter((o) => o.id !== off.id),
                                })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Szene per Suche in den Plot aufnehmen: Titel eintippen, Treffer anklicken.
function SceneSearchAdd({ scenes, onAdd }: { scenes: Scene[]; onAdd: (id: string) => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hits = query
    ? scenes.filter((s) => s.title.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
        <Icon name="search" size={13} />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setQ("")}
        placeholder="Szene hinzufügen…"
        aria-label="Szene suchen und zum Plot hinzufügen"
        className="w-52 bg-bg-primary border border-border-subtle rounded-md pl-8 pr-2.5 py-1.5 text-[0.8125rem] text-text-primary outline-none focus:border-white/20"
      />
      {query && (
        <div className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 shadow-xl">
          {hits.length === 0 ? (
            <div className="px-2 py-1.5 text-[0.8125rem] text-text-tertiary">
              Keine passende Szene außerhalb des Plots.
            </div>
          ) : (
            hits.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onAdd(s.id);
                  setQ("");
                }}
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/[0.04]"
              >
                <div className="text-[0.8125rem] text-text-primary">{s.title}</div>
                <div className="text-[0.75rem] text-text-tertiary">
                  {[scenePlace(s), formatInplayDate(s.inplay_date)].filter(Boolean).join(" · ")}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Knoten auf der Zeitlinie (sitzt mittig auf der Linie links der Karte)
function Node({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -left-[42px] top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-bg-primary">
      {children}
    </span>
  );
}

function RemoveButton({ onRemove, title }: { onRemove: () => void; title: string }) {
  return (
    <button
      onClick={onRemove}
      title={title}
      className="shrink-0 rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-accent"
    >
      <Icon name="trash" size={13} />
    </button>
  );
}

// Faktenzeile eines Eintrags: Profilbilder zusammengerückt + Vornamen · Ort (· AU)
// – reiner Text mit Punkten dazwischen, nichts davon anklickbar.
function FactsLine({
  participants,
  location,
  children,
}: {
  participants: Character[];
  location: string | null;
  children?: React.ReactNode;
}) {
  if (participants.length === 0 && !location && !children) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.875rem] text-text-tertiary">
      {participants.length > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {participants.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.id}
                src={characterImage(c)}
                alt={c.name}
                title={c.name}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-bg-surface"
              />
            ))}
          </span>
          <span className="text-text-secondary">
            {participants.map((c) => c.name.split(" ")[0]).join(" & ")}
          </span>
        </span>
      )}
      {location && (
        <span>
          {participants.length > 0 && "· "}
          {location}
        </span>
      )}
      {children}
    </div>
  );
}

// Gespielte Szene im Zeitstrahl: Datum, Titel, Beteiligte · Ort, Beschreibungssatz –
// im Stil der Szenenboxen, mit dem Streichholz als Knoten auf der Linie.
function SceneEntry({ scene, onRemove }: { scene: Scene; onRemove?: () => void }) {
  const { character } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const { last: lastPost, lastHref, what } = useLastEntry(scene);

  return (
    <div className="relative">
      <Node>
        <SceneMatch scene={scene} size={22} />
      </Node>
      {/* Die ganze Karte führt zur Szene (Titel-Link, über die Karte gestreckt) */}
      <div className="relative rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 transition-colors hover:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
            {formatInplayDateWeekday(scene.inplay_date)}
            {scene.inplay_time && ` · ${scene.inplay_time}`}
          </div>
          {(lastPost || onRemove) && (
            <div className="flex shrink-0 items-center gap-2">
              {/* letzter Post (Klick springt dorthin, wie in den Szenenboxen) */}
              {lastPost && (
                <Link
                  href={lastHref}
                  title="Zum neuesten Beitrag springen"
                  className="group/last relative z-10 text-[0.8125rem] text-text-tertiary hover:text-accent"
                >
                  <span className="text-text-secondary group-hover/last:text-accent group-hover/last:underline">{what}</span>
                  {" · "}
                  <span className="group-hover/last:underline">{formatDateTimeShort(lastPost.created_at)}</span>
                </Link>
              )}
              {onRemove && (
                <span className="relative z-10">
                  <RemoveButton onRemove={onRemove} title="Aus dem Plot entfernen" />
                </span>
              )}
            </div>
          )}
        </div>
        <h3 className="mt-0.5 font-serif text-[1rem] leading-tight text-text-primary">
          <Link
            href={sceneHref(scene)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {scene.title}
          </Link>
        </h3>
        <FactsLine participants={participants} location={scenePlace(scene) || null}>
          {scene.au && (
            <span>
              · <AuTag scene={scene} />
            </span>
          )}
        </FactsLine>
        {scene.summary && (
          <p className="mt-2 text-[0.875rem] italic text-text-secondary">{scene.summary}</p>
        )}
      </div>
    </div>
  );
}

// Off-Szene: Plot-Punkt, der nicht ausgespielt wurde – gestrichelt, ohne Link.
function OffEntry({ off, onRemove }: { off: OffScene; onRemove?: () => void }) {
  const { character } = useStore();
  const participants = off.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];

  return (
    <div className="relative">
      <Node>
        <span className="h-2.5 w-2.5 rounded-full border border-text-tertiary" />
      </Node>
      <div className="rounded-xl border border-dashed border-border-strong px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
            {formatInplayDateWeekday(off.inplay_date)}
            {off.inplay_time && <> · {off.inplay_time}</>}
            <span className="rounded bg-white/[0.06] px-2 py-0.5">im Off</span>
          </div>
          {onRemove && <RemoveButton onRemove={onRemove} title="Off-Szene löschen" />}
        </div>
        <h3 className="mt-0.5 font-serif text-[1rem] leading-tight text-text-primary">
          {off.title}
        </h3>
        <FactsLine participants={participants} location={off.location_name} />
        {off.summary && (
          <p className="mt-2 text-[0.875rem] italic text-text-secondary">{off.summary}</p>
        )}
      </div>
    </div>
  );
}

// Formular für eine Off-Szene (Infos + Beschreibungssatz)
function OffSceneForm({
  characters,
  onCancel,
  onCreate,
}: {
  characters: Character[];
  onCancel: () => void;
  onCreate: (off: OffScene) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { locations } = useStore();
  const locationNames = Array.from(new Set(locations.map((l) => l.name))).sort((a, b) =>
    a.localeCompare(b, "de"),
  );
  const valid = title.trim() && date;

  function submit() {
    if (!valid) return;
    onCreate({
      id: `off_${Math.random().toString(36).slice(2, 9)}`,
      title: title.trim(),
      inplay_date: date,
      inplay_time: time.trim(),
      location_name: location.trim() || null,
      summary: summary.trim() || null,
      participant_ids: selected,
    });
  }

  return (
    <div className="mb-6 max-w-3xl rounded-xl border border-border-subtle bg-bg-surface p-4 flex flex-col gap-3">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
        Off-Szene – ein Plot-Punkt, der nicht ausgespielt wurde
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-[0.875rem] text-text-secondary">
          Titel <span className="text-accent">*</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={`mt-1 ${field}`} />
        </label>
        <label className="text-[0.875rem] text-text-secondary">
          Ort
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            list="off-scene-locations"
            placeholder="Vorhandenen Ort wählen oder neu eintippen"
            className={`mt-1 ${field}`}
          />
          <datalist id="off-scene-locations">
            {locationNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <div className="text-[0.875rem] text-text-secondary">
          Datum <span className="text-accent">*</span>
          <DatePicker value={date} onChange={setDate} className="mt-1" />
        </div>
        <label className="text-[0.875rem] text-text-secondary">
          Tageszeit
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="z. B. Abend"
            className={`mt-1 ${field}`}
          />
        </label>
      </div>
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-1">Charaktere</div>
        <CharacterPicker characters={characters} selected={selected} onChange={setSelected} />
      </div>
      <label className="text-[0.875rem] text-text-secondary">
        Beschreibungssatz
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Was ist passiert?"
          rows={2}
          className={`mt-1 ${field} resize-y`}
        />
      </label>
      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2">
          Abbrechen
        </button>
        <button
          onClick={submit}
          disabled={!valid}
          className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40"
        >
          Off-Szene hinzufügen
        </button>
      </div>
    </div>
  );
}
