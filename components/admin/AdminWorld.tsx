"use client";

import { LocationCategoryPicker } from "@/components/LocationCategoryPicker";
import { guessCategory } from "@/lib/places";
import { PHONE_AREA } from "@/lib/phone";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PLACE_AREAS, areaName } from "@/lib/world";
import { TIER_NAMES, tierOf } from "@/lib/characters";
import { characterImage } from "@/lib/avatar";
import { formatInplayDate } from "@/lib/format";
import { ConfirmDialog } from "../ConfirmDialog";
import { CommitRichEditor } from "../RichEditor";
import { Collapsible } from "../Collapsible";
import { MultiSelect } from "../MultiSelect";
import { CharacterBubble } from "../Bubble";
import { auNames } from "../AuNameField";
import { AuTools } from "../AuTools";
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

// Erst beim Zeichnen bilden: Die Namen können Admins ändern (Admin → Bezirke)
const areaOptions = (): [string, string][] => PLACE_AREAS.map((k) => [k, areaName(k)]);

// --- Orte --------------------------------------------------------------------
export function AdminLocations() {
  const { locations, scenes, updateLocation, deleteLocation, addLocation, updateScene, player } = useStore();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("rivers_edge");
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const list = locations
    .filter((l) => (!area || l.area === area) && (!q.trim() || l.name.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => areaName(a.area).localeCompare(areaName(b.area), "de") || a.name.localeCompare(b.name, "de"));
  const sceneCount = (l: Location) => scenes.filter((s) => s.location_area === l.area && s.location_name === l.name).length;

  // Szenen-Orte ohne Ortsseite (Import, Altbestand) und Orte ohne feste Kategorie
  const orphans = [
    ...new Map(
      scenes
        .filter(
          (s) =>
            s.location_name.trim() &&
            s.location_area !== PHONE_AREA &&
            !locations.some((l) => l.area === s.location_area && l.name === s.location_name),
        )
        .map((s) => [`${s.location_area}/${s.location_name}`, s] as const),
    ).values(),
  ];
  const uncategorized = locations.filter((l) => !l.category);

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
          {areaOptions().map(([k, n]) => (
            <option key={k} value={k} className="bg-bg-surface">
              {n}
            </option>
          ))}
        </select>
        <span className={hint}>{list.length} Orte</span>
      </div>
      {(orphans.length > 0 || uncategorized.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {orphans.length > 0 && (
            <button
              onClick={() => orphans.forEach((s) => addLocation(s.location_area, s.location_name))}
              title="Legt für jeden Ort, der nur als Name an einer Szene hängt, eine (leere) Ortsseite an"
              className={btn}
            >
              {orphans.length} fehlende Ortsseiten anlegen
            </button>
          )}
          {uncategorized.length > 0 && (
            <button
              onClick={() => uncategorized.forEach((l) => updateLocation(l.id, { category: guessCategory(l.name) }))}
              title="Trägt bei allen Orten ohne Kategorie die aus dem Namen erratene fest ein (braucht schema-location-category.sql)"
              className={btn}
            >
              {uncategorized.length} Orte nach Namen kategorisieren
            </button>
          )}
        </div>
      )}

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
              {!areaOptions().some(([k]) => k === l.area) && <option value={l.area}>{areaName(l.area)}</option>}
              {areaOptions().map(([k, n]) => (
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
              <div>
                Kategorie
                <div className="mt-1">
                  <LocationCategoryPicker
                    value={l.category ?? null}
                    name={l.name}
                    onChange={(category) => updateLocation(l.id, { category })}
                  />
                </div>
              </div>
              <div>
                Beschreibung
                <div className="mt-1">
                  <CommitRichEditor
                    value={l.description ?? ""}
                    onCommit={(v) => updateLocation(l.id, { description: v || null })}
                  />
                </div>
              </div>
              <div className={hint}>
                {sceneCount(l)} Szenen · angelegt von {player(l.created_by ?? "")?.username ?? "–"} · {formatInplayDate(l.created_at.slice(0, 10))}
              </div>
            </div>
          )}
        </div>
      ))}

      {newName.trim() && (
        <div className="border-t border-border-subtle pt-3 text-[0.8125rem] text-text-secondary">
          Kategorie des neuen Orts
          <div className="mt-1">
            <LocationCategoryPicker value={newCategory} name={newName} onChange={setNewCategory} />
          </div>
        </div>
      )}
      <div className={`flex flex-wrap items-end gap-2 ${newName.trim() ? "" : "border-t border-border-subtle pt-3"}`}>
        <label className="min-w-40 flex-1 text-[0.8125rem] text-text-secondary">
          Neuer Ort
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`mt-1 ${field}`} />
        </label>
        <select value={newArea} onChange={(e) => setNewArea(e.target.value)} aria-label="Gegend" className={`${field} w-auto`}>
          {areaOptions().map(([k, n]) => (
            <option key={k} value={k} className="bg-bg-surface">
              {n}
            </option>
          ))}
        </select>
        <button
          disabled={!newName.trim()}
          onClick={() => {
            addLocation(newArea, newName, null, newCategory);
            setNewName("");
            setNewCategory(null);
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
  const { scenes, smsScenes, plots } = useStore();
  const auCount = auNames([...scenes, ...smsScenes]).length;
  return (
    <div className="flex flex-col gap-3">
      <Collapsible title={`Szenen (${scenes.length})`}>
        <SceneList />
      </Collapsible>
      <Collapsible title={`Plots (${plots.length})`}>
        <PlotList />
      </Collapsible>
      <Collapsible title={`AUs (${auCount})`}>
        <AuList />
      </Collapsible>
    </div>
  );
}

// AUs: umbenennen (auch zusammenlegen) und löschen. Ein AU ist nur der Name an
// Szenen – die Liste ergibt sich aus den Szenen und SMS-Szenen.
function AuList() {
  const { scenes, smsScenes, plots, characters, npcs } = useStore();
  const all = [...scenes, ...smsScenes];
  const names = auNames(all);
  const unnamed = all.filter((s) => s.au && !s.au_name).length;
  const people = [...characters, ...npcs];

  if (names.length === 0) return <p className={hint}>Noch keine benannten AUs.</p>;
  return (
    <>
      {names.map((n) => {
        const inScenes = scenes.filter((s) => s.au && s.au_name === n).length;
        const inSms = smsScenes.filter((s) => s.au && s.au_name === n).length;
        const versions = people.filter((c) => c.profile?.versions?.au?.[n]).length;
        const inPlots = plots.filter((p) => p.aus.includes(n)).length;
        const facts = [
          inScenes > 0 && `${inScenes} ${inScenes === 1 ? "Szene" : "Szenen"}`,
          inSms > 0 && `${inSms} ${inSms === 1 ? "SMS-Szene" : "SMS-Szenen"}`,
          versions > 0 && `${versions} Charakter-${versions === 1 ? "Version" : "Versionen"}`,
          inPlots > 0 && `in ${inPlots} ${inPlots === 1 ? "Plot" : "Plots"}`,
        ].filter(Boolean);
        return (
          <div key={n} className={`${row} flex flex-wrap items-center gap-3 px-3 py-2.5`}>
            <div className="min-w-0 flex-1">
              <div className="text-[0.875rem] italic text-text-primary">{n}</div>
              <div className="truncate text-[0.8125rem] text-text-tertiary">{facts.join(" · ")}</div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <AuTools name={n} names={names} btnClass={btn} dangerClass={btnDanger} />
            </div>
          </div>
        );
      })}
      <p className={hint}>
        Umbenennen ändert den Namen überall: Szenen, SMS-Szenen, Charakter-Versionen und Plot-Filter. Wählst du den Namen
        eines anderen AUs, werden beide zusammengelegt. Löschen lässt die Szenen als AU ohne Namen stehen
        {unnamed > 0 ? ` (gerade ${unnamed})` : ""}.
      </p>
    </>
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
  const {
    trashedCharacters,
    restoreCharacter,
    deleteCharacter,
    retireCharacter,
    posts,
    quotes,
    chatMessages,
    calls,
    capticPosts,
    capticComments,
    capticStories,
  } = useStore();
  const [purge, setPurge] = useState<Character | null>(null);
  // Was an einem Charakter hängt (und beim Mitlöschen verschwände)
  const traces = (c: Character): [number, string, string][] =>
    (
      [
        [posts.filter((p) => p.character_id === c.id).length, "Post", "Posts"],
        [quotes.filter((q) => q.character_id === c.id).length, "Zitat", "Zitate"],
        [chatMessages.filter((m) => m.character_id === c.id && m.kind !== "date").length, "SMS", "SMS"],
        [calls.filter((x) => x.caller_id === c.id || x.callee_id === c.id).length, "Anruf", "Anrufe"],
        [
          capticPosts.filter((p) => p.character_id === c.id).length +
            capticStories.filter((p) => p.character_id === c.id).length,
          "Captic-Beitrag",
          "Captic-Beiträge",
        ],
        [capticComments.filter((p) => p.character_id === c.id).length, "Captic-Kommentar", "Captic-Kommentare"],
      ] as [number, string, string][]
    ).filter(([n]) => n > 0);
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
            onClick={() => setPurge(c)}
            className={btnDanger}
          >
            Endgültig löschen
          </button>
        </div>
      ))}
      {purge && (
        <PurgeDialog
          character={purge}
          traces={traces(purge)}
          onCancel={() => setPurge(null)}
          onKeep={() => {
            retireCharacter(purge.id);
            setPurge(null);
          }}
          onDeleteAll={() => {
            deleteCharacter(purge.id);
            setPurge(null);
          }}
        />
      )}
    </div>
  );
}

// Endgültig löschen: zeigt, was am Charakter hängt, und lässt wählen – Inhalte
// behalten (er bleibt als durchgestrichene Hülle an Posts, SMS usw.) oder alles
// mitlöschen. Aufbau wie `ConfirmDialog`.
function PurgeDialog({
  character: c,
  traces,
  onKeep,
  onDeleteAll,
  onCancel,
}: {
  character: Character;
  traces: [number, string, string][];
  onKeep: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
}) {
  return (
    <div onClick={onCancel} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`${c.name} endgültig löschen?`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-2xl shadow-black/70"
      >
        <div className="font-serif text-[1rem] text-text-primary">{c.name} endgültig löschen?</div>
        <p className="mt-2 rounded-md border border-red-400/50 bg-red-500/15 px-3 py-2 text-[0.875rem] font-bold leading-snug text-red-200">
          Das lässt sich NICHT rückgängig machen – {c.name} kann danach nicht wiederhergestellt werden.
        </p>
        {traces.length > 0 ? (
          <>
            <p className="mt-3 text-[0.875rem] text-text-secondary">Von {c.name} gibt es:</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {traces.map(([n, one, many]) => (
                <li
                  key={many}
                  className="rounded-md bg-white/[0.06] px-2.5 py-1 text-[0.8125rem] text-text-primary"
                >
                  {n} {n === 1 ? one : many}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-text-secondary">
              Sollen sie mitgelöscht werden? Wenn nicht, bleibt alles stehen – auch in Szenen und Chats
              anderer Spieler*innen – und der Name erscheint dort durchgestrichen.
            </p>
          </>
        ) : (
          <p className="mt-3 text-[0.875rem] text-text-secondary">
            Von {c.name} gibt es keine Posts, SMS oder andere Beiträge.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onCancel}
            autoFocus
            className="mr-auto px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
          >
            Abbrechen
          </button>
          {traces.length > 0 && (
            <button onClick={onKeep} className={btn}>
              Löschen, Inhalte behalten
            </button>
          )}
          <button onClick={onDeleteAll} className={btnDanger}>
            {traces.length > 0 ? "Alles mitlöschen" : "Endgültig löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}
