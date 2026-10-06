"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AREA_ORDER, AREAS, EXTRA_AREAS, areaName } from "@/lib/world";
import { TIER_NAMES, tierOf } from "@/lib/characters";
import { characterImage } from "@/lib/avatar";
import { formatInplayDate } from "@/lib/format";
import { ConfirmDialog } from "../ConfirmDialog";
import { Collapsible } from "../Collapsible";
import { MultiSelect } from "../MultiSelect";
import { CharacterBubble } from "../Bubble";
import { auNames } from "../AuNameField";
import { AU_UNNAMED, areaFilterOptions } from "@/lib/plots";
import type { Character, Location } from "@/lib/types";
import { btn, btnDanger, btnPrimary, field, hint, row } from "./ui";

type Ask = { title: string; text?: string; warning?: string; label: string; run: () => void };
function Ask({ ask, onClose }: { ask: Ask | null; onClose: () => void }) {
  if (!ask) return null;
  return (
    <ConfirmDialog
      title={ask.title}
      text={ask.text}
      warning={ask.warning}
      confirmLabel={ask.label}
      onCancel={onClose}
      onConfirm={() => {
        ask.run();
        onClose();
      }}
    />
  );
}

// Textfeld, das erst beim Verlassen speichert (nicht bei jedem Buchstaben)
function CommitInput({
  value,
  onCommit,
  className = field,
  ...rest
}: { value: string; onCommit: (v: string) => void; className?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onBlur"
>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...rest}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft.trim() && draft.trim() !== value) onCommit(draft.trim());
        setDraft(null);
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={className}
    />
  );
}

const AREA_OPTIONS: [string, string][] = [
  ...AREA_ORDER.map((k) => [k, AREAS[k].name] as [string, string]),
  ...Object.entries(EXTRA_AREAS).map(([k, v]) => [k, v.name] as [string, string]),
];

// --- Orte --------------------------------------------------------------------
export function AdminLocations() {
  const { locations, scenes, updateLocation, deleteLocation, addLocation, updateScene, player } = useStore();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("rivers_edge");

  const list = locations
    .filter((l) => (!area || l.area === area) && (!q.trim() || l.name.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => areaName(a.area).localeCompare(areaName(b.area), "de") || a.name.localeCompare(b.name, "de"));
  const sceneCount = (l: Location) => scenes.filter((s) => s.location_area === l.area && s.location_name === l.name).length;

  // Gegend wechseln: Szenen an diesem Ort ziehen mit
  function moveTo(l: Location, to: string) {
    for (const s of scenes) if (s.location_area === l.area && s.location_name === l.name) updateScene(s.id, { location_area: to });
    updateLocation(l.id, { area: to });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ort suchen …" className={`${field} max-w-xs`} />
        <select value={area} onChange={(e) => setArea(e.target.value)} className={`${field} w-auto`}>
          <option value="" className="bg-bg-surface">
            Alle Gegenden
          </option>
          {AREA_OPTIONS.map(([k, n]) => (
            <option key={k} value={k} className="bg-bg-surface">
              {n}
            </option>
          ))}
        </select>
        <span className={hint}>{list.length} Orte</span>
      </div>

      {list.map((l) => (
        <div key={l.id} className={row}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2.5 sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <CommitInput value={l.name} onCommit={(v) => updateLocation(l.id, { name: v })} aria-label="Name" />
            <select
              value={l.area}
              onChange={(e) => moveTo(l, e.target.value)}
              aria-label="Gegend"
              className={`${field} col-start-1 sm:col-start-auto`}
            >
              {!AREA_OPTIONS.some(([k]) => k === l.area) && <option value={l.area}>{areaName(l.area)}</option>}
              {AREA_OPTIONS.map(([k, n]) => (
                <option key={k} value={k} className="bg-bg-surface">
                  {n}
                </option>
              ))}
            </select>
            <button onClick={() => setDetails(details === l.id ? null : l.id)} className={btn}>
              Details
            </button>
            <button
              onClick={() =>
                setAsk({
                  title: `${l.name} löschen?`,
                  text: `Der Ort verschwindet aus der Karte. ${sceneCount(l)} Szenen behalten ihn als Text im Titel der Szene.`,
                  label: "Ort löschen",
                  run: () => deleteLocation(l.id),
                })
              }
              aria-label="Ort löschen"
              className={btnDanger}
            >
              ✕
            </button>
          </div>
          {details === l.id && (
            <div className="grid gap-3 border-t border-border-subtle p-3 text-[0.8125rem] text-text-secondary">
              <label>
                Beschreibung
                <textarea
                  defaultValue={l.description ?? ""}
                  onBlur={(e) => e.target.value !== (l.description ?? "") && updateLocation(l.id, { description: e.target.value.trim() || null })}
                  rows={3}
                  className={`mt-1 resize-y ${field}`}
                />
              </label>
              <div className={hint}>
                {sceneCount(l)} Szenen · angelegt von {player(l.created_by ?? "")?.username ?? "–"} · {formatInplayDate(l.created_at.slice(0, 10))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-3">
        <label className="min-w-40 flex-1 text-[0.8125rem] text-text-secondary">
          Neuer Ort
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`mt-1 ${field}`} />
        </label>
        <select value={newArea} onChange={(e) => setNewArea(e.target.value)} aria-label="Gegend" className={`${field} w-auto`}>
          {AREA_OPTIONS.map(([k, n]) => (
            <option key={k} value={k} className="bg-bg-surface">
              {n}
            </option>
          ))}
        </select>
        <button
          disabled={!newName.trim()}
          onClick={() => {
            addLocation(newArea, newName);
            setNewName("");
          }}
          className={btnPrimary}
        >
          Anlegen
        </button>
      </div>
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

// --- Szenen & Plots ----------------------------------------------------------
// Beide Listen sind noch einmal eingeklappt – sie werden schnell lang.
export function AdminScenes() {
  const { scenes, plots } = useStore();
  return (
    <div className="flex flex-col gap-3">
      <Collapsible title={`Szenen (${scenes.length})`}>
        <SceneList />
      </Collapsible>
      <Collapsible title={`Plots (${plots.length})`}>
        <PlotList />
      </Collapsible>
    </div>
  );
}

function SceneList() {
  const { scenes, posts, character, updateScene, deleteScene } = useStore();
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);
  const [ask, setAsk] = useState<Ask | null>(null);
  const list = [...scenes]
    .filter((s) => !q.trim() || s.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const postCount = (id: string) => posts.filter((p) => p.scene_id === id).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szene suchen …" className={`${field} max-w-xs`} />
        <span className={hint}>{list.length} Szenen</span>
      </div>
      {list.slice(0, limit).map((s) => {
        const people = s.participant_ids.map((id) => character(id)).filter((c): c is Character => !!c);
        const active = s.status === "active";
        return (
          <div key={s.id} className={`${row} flex flex-wrap items-center gap-3 px-3 py-2.5`}>
            <div className="min-w-0 flex-1">
              <Link href={`/szenen/${s.id}`} className="text-[0.875rem] text-text-primary hover:text-accent">
                {s.title}
              </Link>
              <div className="truncate text-[0.8125rem] text-text-tertiary">
                {s.location_name || areaName(s.location_area)} · {active ? "aktiv" : "beendet"} · {postCount(s.id)}{" "}
                {postCount(s.id) === 1 ? "Post" : "Posts"}
              </div>
              {people.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {people.map((c) => (
                    <CharacterBubble key={c.id} character={c} firstNameOnly />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => updateScene(s.id, { status: active ? "closed" : "active" })} className={btn}>
                {active ? "Beenden" : "Wieder aktivieren"}
              </button>
              <button
                onClick={() =>
                  setAsk({
                    title: `„${s.title}“ löschen?`,
                    warning: `Das lässt sich NICHT rückgängig machen. Mit der Szene werden ${postCount(s.id)} Posts und alle Zitate gelöscht.`,
                    label: "Szene löschen",
                    run: () => deleteScene(s.id),
                  })
                }
                className={btnDanger}
              >
                Löschen
              </button>
            </div>
          </div>
        );
      })}
      {list.length > limit && (
        <button onClick={() => setLimit(limit + 20)} className={`${btn} self-start`}>
          Mehr anzeigen
        </button>
      )}
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}

// Plots: Name und Filter (Charaktere, Spieler*innen, Gegenden, AUs) ändern, löschen.
// Jede Änderung wird sofort gespeichert.
function PlotList() {
  const { plots, scenes, characters, npcs, players, player, updatePlot, deletePlot } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const charOptions = [...characters, ...npcs]
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((c) => ({ value: `char:${c.id}`, label: c.name }));
  const playerOptions = players.map((p) => ({ value: `player:${p.id}`, label: p.username }));
  const auOptions = [
    ...auNames(scenes).map((n) => ({ value: n, label: n })),
    ...(scenes.some((s) => s.au && !s.au_name) ? [{ value: AU_UNNAMED, label: "Ohne Namen" }] : []),
  ];
  const labelOf = (options: { value: string; label: string }[], values: string[]) =>
    values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");

  if (plots.length === 0) return <p className={hint}>Noch keine Plots.</p>;
  return (
    <>
      {plots.map((p) => {
        const chars = p.tokens.filter((t) => t.startsWith("char:"));
        const owners = p.tokens.filter((t) => t.startsWith("player:"));
        const areas = p.areas ?? [];
        const summary = [
          labelOf(charOptions, chars),
          labelOf(playerOptions, owners),
          labelOf(areaFilterOptions(), areas),
          p.aus.length ? `AU: ${labelOf(auOptions, p.aus)}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div key={p.id} className={row}>
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[0.875rem] text-text-primary">{p.name}</div>
                <div className="truncate text-[0.8125rem] text-text-tertiary">
                  {summary || "ohne Filter"} · angelegt von {player(p.created_by ?? "")?.username ?? "–"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setOpen(open === p.id ? null : p.id)} className={btn}>
                  {open === p.id ? "Schließen" : "Bearbeiten"}
                </button>
                <button
                  onClick={() =>
                    setAsk({
                      title: `Plot „${p.name}“ löschen?`,
                      text: "Die Szenen selbst bleiben erhalten, nur die Zusammenstellung verschwindet.",
                      label: "Plot löschen",
                      run: () => deletePlot(p.id),
                    })
                  }
                  className={btnDanger}
                >
                  Löschen
                </button>
              </div>
            </div>
            {open === p.id && (
              <div className="flex flex-col gap-3 border-t border-border-subtle p-3">
                <label className="flex flex-col gap-1 text-[0.8125rem] text-text-secondary">
                  Name
                  <CommitInput value={p.name} onCommit={(v) => updatePlot(p.id, { name: v })} className={`${field} max-w-sm`} />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <MultiSelect
                    label="Charaktere"
                    icon="users"
                    options={charOptions}
                    selected={chars}
                    onToggle={(v) => updatePlot(p.id, { tokens: [...flip(chars, v), ...owners] })}
                    onClear={() => updatePlot(p.id, { tokens: owners })}
                  />
                  <MultiSelect
                    label="Spieler*innen"
                    icon="star"
                    options={playerOptions}
                    selected={owners}
                    onToggle={(v) => updatePlot(p.id, { tokens: [...chars, ...flip(owners, v)] })}
                    onClear={() => updatePlot(p.id, { tokens: chars })}
                  />
                  <MultiSelect
                    label="Gegend"
                    icon="map"
                    options={areaFilterOptions()}
                    selected={areas}
                    onToggle={(v) => updatePlot(p.id, { areas: flip(areas, v) })}
                    onClear={() => updatePlot(p.id, { areas: [] })}
                  />
                  <MultiSelect
                    label="AU"
                    options={[...auOptions, ...p.aus.filter((a) => !auOptions.some((o) => o.value === a)).map((a) => ({ value: a, label: a }))]}
                    selected={p.aus}
                    onToggle={(v) => updatePlot(p.id, { aus: flip(p.aus, v) })}
                    onClear={() => updatePlot(p.id, { aus: [] })}
                  />
                </div>
                <p className={hint}>
                  Eine Szene gehört zum Plot, wenn sie zu allen gewählten Charakteren und Spieler*innen passt und in
                  einer der Gegenden spielt. Ohne AU-Auswahl zählen nur Canon-Szenen. Änderungen speichern sofort.
                </p>
              </div>
            )}
          </div>
        );
      })}
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </>
  );
}

// --- Papierkorb --------------------------------------------------------------
export function AdminTrash() {
  const { trashedCharacters, restoreCharacter, deleteCharacter, posts } = useStore();
  const [ask, setAsk] = useState<Ask | null>(null);
  if (trashedCharacters.length === 0) return <p className={hint}>Der Papierkorb ist leer.</p>;
  const postCount = (c: Character) => posts.filter((p) => p.character_id === c.id).length;
  return (
    <div className="flex flex-col gap-3">
      {trashedCharacters.map((c) => (
        <div key={c.id} className={`${row} flex flex-wrap items-center gap-3 px-3 py-2.5`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterImage(c)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover bg-bg-primary opacity-60" />
          <div className="min-w-0 flex-1">
            <div className="text-[0.875rem] text-text-primary">{c.name}</div>
            <div className="text-[0.8125rem] text-text-tertiary">
              {TIER_NAMES[tierOf(c)]} · {postCount(c)} {postCount(c) === 1 ? "Post" : "Posts"}
            </div>
          </div>
          <button onClick={() => restoreCharacter(c.id)} className={btn}>
            Wiederherstellen
          </button>
          <button
            onClick={() =>
              setAsk({
                title: `${c.name} endgültig löschen?`,
                warning: `Das lässt sich NICHT rückgängig machen. Mit ${c.name} werden ${postCount(c)} Posts, alle Zitate, Chats und Anrufe gelöscht – auch in Szenen anderer Spieler*innen.`,
                label: "Endgültig löschen",
                run: () => deleteCharacter(c.id),
              })
            }
            className={btnDanger}
          >
            Endgültig löschen
          </button>
        </div>
      ))}
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}
