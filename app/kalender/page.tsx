"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { LocationBubble } from "@/components/Bubble";
import { MultiSelect } from "@/components/MultiSelect";
import { AuTag, SceneMatch } from "@/components/SceneCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { SceneTurnBar } from "@/components/SceneTurnBar";
import { CharacterPicker } from "@/components/CharacterPicker";
import { AU_UNNAMED, auNames } from "@/components/AuNameField";
import { PlayerCharacterBubble } from "@/components/PlayerCharacterBubble";
import type { Character, OffScene, Plot, Scene } from "@/lib/types";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";
const smallBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";

// Ein Eintrag im Zeitstrahl: gespielte Szene oder Off-Szene eines Plots
type Entry =
  | { kind: "scene"; date: string; scene: Scene }
  | { kind: "off"; date: string; off: OffScene };

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export default function TimelinePage() {
  const {
    scenes,
    characters,
    players,
    plots,
    character,
    addPlot,
    updatePlot,
    deletePlot,
    canEditPlot,
    currentPlayer,
    isAdmin,
    charactersOf,
  } = useStore();
  const [tokens, setTokens] = useState<string[]>([]); // "char:<id>" | "player:<id>"
  const [aus, setAus] = useState<string[]>([]); // AU-Namen | AU_UNNAMED (leer = Canon)
  const [plotId, setPlotId] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [plotName, setPlotName] = useState("");
  const [addingOff, setAddingOff] = useState(false);
  const [yearSel, setYearSel] = useState<string[]>([]); // leer = alle Jahre
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const plot = plots.find((p) => p.id === plotId) ?? null;
  const editable = plot ? canEditPlot(plot) : false;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function tokenMatches(token: string, participantIds: string[]): boolean {
    const [type, id] = token.split(":");
    if (type === "char") return participantIds.includes(id);
    return participantIds.some((pid) => character(pid)?.player_id === id);
  }

  const charsByPlayer = players
    .map((p) => ({ player: p, chars: characters.filter((c) => c.player_id === p.id) }))
    .filter((g) => g.chars.length > 0);

  const auOptions = useMemo(() => {
    const opts = auNames(scenes).map((n) => ({ value: n, label: n }));
    if (scenes.some((s) => s.au && !s.au_name))
      opts.push({ value: AU_UNNAMED, label: "Ohne Namen" });
    return opts;
  }, [scenes]);

  // AUs sind eigene Zeitlinien: Ohne AU-Auswahl zeigt die Timeline nur Canon,
  // mit Auswahl nur die Szenen der gewählten AUs.
  const matches = (s: Scene, tk: string[], au: string[]) => {
    if (au.length === 0 ? s.au : !(s.au && au.includes(s.au_name || AU_UNNAMED)))
      return false;
    return tk.every((t) => tokenMatches(t, s.participant_ids));
  };

  // Szenen eines Plots: Filter plus von Hand ergänzte, minus entfernte Szenen. Ein
  // Plot ohne Filter besteht nur aus den von Hand aufgenommenen Szenen.
  const plotScenes = (p: Plot, tk: string[], au: string[]) =>
    scenes.filter((s) => {
      if (p.include_ids.includes(s.id)) return true;
      if (p.exclude_ids.includes(s.id)) return false;
      return tk.length + au.length > 0 && matches(s, tk, au);
    });

  // Sichtbare Szenen: im offenen Plot mit den aktuell eingestellten Filtern
  const shownScenes = plot
    ? plotScenes(plot, tokens, aus)
    : scenes.filter((s) => matches(s, tokens, aus));

  // Plots sieht nur, wessen Charaktere betroffen sind: als Filter gewählt, in
  // einer Szene oder Off-Szene des Plots beteiligt — außerdem wer den Plot
  // angelegt hat, und Admins.
  const myId = currentPlayer?.id ?? "";
  const myCharIds = new Set(charactersOf(myId).map((c) => c.id));
  const involvesMe = (ids: string[]) => ids.some((id) => myCharIds.has(id));
  const visiblePlots = plots.filter(
    (p) =>
      isAdmin ||
      p.created_by === myId ||
      p.tokens.some((t) => t === `player:${myId}` || myCharIds.has(t.replace(/^char:/, ""))) ||
      p.off_scenes.some((o) => involvesMe(o.participant_ids)) ||
      plotScenes(p, p.tokens, p.aus).some((s) => involvesMe(s.participant_ids)),
  );

  const allEntries: Entry[] = [
    ...shownScenes.map((s): Entry => ({ kind: "scene", date: s.inplay_date, scene: s })),
    ...(plot?.off_scenes ?? []).map((o): Entry => ({ kind: "off", date: o.inplay_date, off: o })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Jahres-Filter (z.B. Rückblenden nach 2014): Auswahl aus den vorhandenen
  // Jahren; nicht mehr vorhandene Jahre in der Auswahl zählen nicht.
  const years = Array.from(new Set(allEntries.map((e) => e.date.slice(0, 4))));
  const activeYears = yearSel.filter((y) => years.includes(y));
  const entries =
    activeYears.length > 0
      ? allEntries.filter((e) => activeYears.includes(e.date.slice(0, 4)))
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

  const filterCount = tokens.length + aus.length + activeYears.length;
  const filterChanged = plot ? !sameSet(plot.tokens, tokens) || !sameSet(plot.aus, aus) : false;
  const addable = scenes
    .filter((s) => !shownScenes.includes(s))
    .sort((a, b) => a.title.localeCompare(b.title, "de"));

  function activate(p: Plot) {
    if (plotId === p.id) {
      setPlotId(null);
      return;
    }
    setPlotId(p.id);
    setRenaming(false);
    setTokens([...p.tokens]);
    setAus([...p.aus]);
    setAddingOff(false);
  }

  function saveAsPlot() {
    const name = plotName.trim();
    if (!name) return;
    setPlotId(addPlot(name, [...tokens], [...aus]));
    setPlotName("");
    setNaming(false);
  }

  function removeScene(id: string) {
    if (!plot) return;
    if (plot.include_ids.includes(id))
      updatePlot(plot.id, { include_ids: plot.include_ids.filter((x) => x !== id) });
    else updatePlot(plot.id, { exclude_ids: [...plot.exclude_ids, id] });
  }

  function addScene(id: string) {
    if (!plot || !id) return;
    updatePlot(plot.id, {
      include_ids: [...plot.include_ids.filter((x) => x !== id), id],
      exclude_ids: plot.exclude_ids.filter((x) => x !== id),
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title="Timeline"
        subtitle="In-Game-Zeitstrahl der Szenen, nach Monaten gruppiert."
        width="max-w-6xl"
      />

      {/* Filterleiste — aufgebaut wie in der Szenen-Übersicht */}
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

        {/* Plots: gespeicherte Filter mit Namen */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          <span className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
            Plots
          </span>
          {visiblePlots.length === 0 && !naming && (
            <span className="text-[0.875rem] text-text-tertiary">— noch keine</span>
          )}
          {visiblePlots.map((p) => (
            <button
              key={p.id}
              onClick={() => activate(p)}
              title={plotId === p.id ? "Plot schließen" : "Plot öffnen"}
              className={`rounded-full border px-2.5 py-0.5 text-[0.8125rem] transition-colors ${
                plotId === p.id
                  ? "border-accent/60 bg-accent-soft text-text-primary"
                  : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
              }`}
            >
              {p.name}
            </button>
          ))}
          {naming ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <input
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveAsPlot()}
                placeholder="Name des Plots…"
                autoFocus
                className="w-44 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
              />
              <button
                onClick={saveAsPlot}
                disabled={!plotName.trim()}
                className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
              >
                Speichern
              </button>
              <button
                onClick={() => {
                  setNaming(false);
                  setPlotName("");
                }}
                className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
              >
                Abbrechen
              </button>
            </span>
          ) : (
            <button
              onClick={() => setNaming(true)}
              title="Aktuelle Filter als neuen Plot speichern"
              className="flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.8125rem] text-text-tertiary hover:text-accent hover:border-accent/50"
            >
              <Icon name="plus" size={11} /> Als Plot speichern
            </button>
          )}
        </div>
      </div>

      {/* Über dem Zeitstrahl: Anzahl, Filter zurücksetzen, Plot-Werkzeuge */}
      <div className="mt-4 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[0.875rem] text-text-tertiary">
          {plot && <span className="text-text-primary">{plot.name} · </span>}
          {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
        </span>
        {filterCount > 0 && !plot && (
          <button
            onClick={() => {
              setTokens([]);
              setAus([]);
              setYearSel([]);
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
                onClick={() => updatePlot(plot.id, { tokens: [...tokens], aus: [...aus] })}
                className={smallBtn}
              >
                <Icon name="check" size={13} /> Filter im Plot speichern
              </button>
            )}
            <select
              value=""
              onChange={(e) => addScene(e.target.value)}
              className="max-w-[220px] bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[0.8125rem] text-text-secondary outline-none focus:border-white/20"
            >
              <option value="">+ Szene hinzufügen…</option>
              {addable.map((s) => (
                <option key={s.id} value={s.id} className="bg-bg-surface">
                  {s.title}
                </option>
              ))}
            </select>
            <button onClick={() => setAddingOff((v) => !v)} className={smallBtn}>
              <Icon name="plus" size={13} /> Off-Szene
            </button>
            {renaming ? (
              <span className="flex items-center gap-1.5">
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameValue.trim()) {
                      updatePlot(plot.id, { name: renameValue.trim() });
                      setRenaming(false);
                    }
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  autoFocus
                  aria-label="Neuer Name des Plots"
                  className="w-44 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
                />
                <button
                  onClick={() => {
                    if (!renameValue.trim()) return;
                    updatePlot(plot.id, { name: renameValue.trim() });
                    setRenaming(false);
                  }}
                  disabled={!renameValue.trim()}
                  className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
                >
                  Abbrechen
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setRenameValue(plot.name);
                  setRenaming(true);
                }}
                className={smallBtn}
              >
                <Icon name="edit" size={13} /> Umbenennen
              </button>
            )}
            <button onClick={() => setConfirmDelete(true)} className={smallBtn}>
              <Icon name="trash" size={13} /> Plot löschen
            </button>
          </div>
        )}
      </div>

      {plot && confirmDelete && (
        <ConfirmDialog
          title={`Plot „${plot.name}“ löschen?`}
          text="Der Plot mit seinen Off-Szenen wird endgültig gelöscht. Die gespielten Szenen selbst bleiben erhalten."
          confirmLabel="Plot löschen"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            deletePlot(plot.id);
            setPlotId(null);
          }}
        />
      )}

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

// Gespielte Szene im Zeitstrahl: Datum, Titel, Ort, Beteiligte, Beschreibungssatz —
// im Stil der Szenenboxen, mit dem Streichholz als Knoten auf der Linie.
function SceneEntry({ scene, onRemove }: { scene: Scene; onRemove?: () => void }) {
  const { character, postsOf, locationsOf } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const loc = locationsOf(scene.location_area).find((l) => l.name === scene.location_name);

  return (
    <div className="relative">
      <Node>
        <SceneMatch scene={scene} size={22} />
      </Node>
      <div className="rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
            {formatInplayDate(scene.inplay_date)} · {scene.inplay_time}
          </div>
          {onRemove && <RemoveButton onRemove={onRemove} title="Aus dem Plot entfernen" />}
        </div>
        <h3 className="mt-0.5 font-serif text-[1rem] leading-tight text-text-primary">
          <Link href={`/szenen/${scene.id}`} className="hover:underline">
            {scene.title}
          </Link>
        </h3>
        {/* Eine Reihe: erst die Charaktere, dann der Ort (+ AU) */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.875rem] text-text-tertiary">
          <SceneTurnBar
            participants={participants}
            activeCharId={whoseTurn(scene, postsOf(scene.id))}
            active={scene.status === "active"}
            firstNameOnly
            linked
          />
          <LocationBubble id={loc?.id} name={scene.location_name} />
          {scene.au && (
            <span>
              · <AuTag scene={scene} />
            </span>
          )}
        </div>
        {scene.summary && (
          <p className="mt-2 text-[0.875rem] italic text-text-secondary">{scene.summary}</p>
        )}
      </div>
    </div>
  );
}

// Off-Szene: Plot-Punkt, der nicht ausgespielt wurde — gestrichelt, ohne Link.
function OffEntry({ off, onRemove }: { off: OffScene; onRemove?: () => void }) {
  const { character, locations, scenes } = useStore();
  // Vorhandener Ort → Bubble führt aufs Ortsprofil
  const loc = off.location_name
    ? locations.find((l) => l.name === off.location_name)
    : undefined;
  const locPlayed =
    !!loc && scenes.some((s) => s.location_area === loc.area && s.location_name === loc.name);
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
            {formatInplayDate(off.inplay_date)}
            {off.inplay_time && <> · {off.inplay_time}</>}
            <span className="rounded bg-white/[0.06] px-2 py-0.5">im Off</span>
          </div>
          {onRemove && <RemoveButton onRemove={onRemove} title="Off-Szene löschen" />}
        </div>
        <h3 className="mt-0.5 font-serif text-[1rem] leading-tight text-text-primary">
          {off.title}
        </h3>
        {(participants.length > 0 || off.location_name) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.875rem] text-text-tertiary">
            <SceneTurnBar
              participants={participants}
              activeCharId={null}
              active={false}
              firstNameOnly
              linked
            />
            {off.location_name && (
              <LocationBubble id={loc?.id} name={off.location_name} played={locPlayed} />
            )}
          </div>
        )}
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
        Off-Szene — ein Plot-Punkt, der nicht ausgespielt wurde
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
