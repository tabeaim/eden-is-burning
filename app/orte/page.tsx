"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { AREAS, areaName, type AreaKey } from "@/lib/world";
import { formatInplayDate, placeholderImg } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { EdenMap } from "@/components/EdenMap";
import { Icon } from "@/components/Icon";
import type { Location } from "@/lib/types";

const EXTRA: Record<string, { name: string; character: string }> = {
  rest: {
    name: "Rest der Welt",
    character:
      "Alles jenseits von Eden und D.C. — Reisen, Rückblenden, ferne Orte. Für Szenen, die nirgendwo sonst hingehören.",
  },
};

export default function PlacesPage() {
  const { scenes, characters, postsOf, character, player, locationsOf, addLocation } =
    useStore();
  const [selected, setSelected] = useState<string>("rivers_edge");
  const [openLoc, setOpenLoc] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const areaStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number }> = {};
    for (const s of scenes) {
      const k = s.location_area;
      stats[k] = stats[k] ?? { active: 0, total: 0 };
      stats[k].total += 1;
      if (s.status === "active") stats[k].active += 1;
    }
    return stats;
  }, [scenes]);

  const scenesHere = scenes.filter((s) => s.location_area === selected);
  const activeScenes = scenesHere.filter((s) => s.status === "active");
  const residents = characters.filter((c) => c.area === selected);
  const playedNames = useMemo(
    () => new Set(scenesHere.map((s) => s.location_name)),
    [scenesHere],
  );

  const locations = locationsOf(selected);
  const playedLocs: Location[] = locations.filter((l) => playedNames.has(l.name));
  const ideaLocs: Location[] = locations.filter((l) => !playedNames.has(l.name));
  // Szenen-Orte ohne Location-Eintrag (Altbestand) ergänzen
  const orphanPlayed = Array.from(playedNames).filter(
    (n) => !locations.some((l) => l.name === n),
  );

  const info = AREAS[selected as AreaKey];
  const extra = EXTRA[selected];

  function createLocation(name: string, description: string) {
    addLocation(selected, name, description || null);
    setAdding(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <PageHeader
        title="Orte"
        subtitle="Eden, Virginia — fünf Bezirke, ein Fluss, und alles dahinter." width="max-w-6xl" />

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-10 items-start">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-3">
          <EdenMap selected={selected} onSelect={(k) => { setSelected(k); setOpenLoc(null); setAdding(false); }} areaStats={areaStats} />
        </div>

        {/* Detail-Panel */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface min-h-[320px] overflow-hidden">
          {info || extra ? (
            <>
              {/* Titelbild-Banner mit Namen */}
              <div className="relative h-32 w-full bg-bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={info?.image ?? placeholderImg(`area-${selected}`, 800, 240)}
                  alt={info?.name ?? extra?.name ?? ""}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/30 to-transparent" />
                <h2 className="absolute bottom-3 left-5 right-5 font-display text-[26px] text-text-primary">
                  {info?.name ?? extra?.name}
                </h2>
              </div>

              <div className="p-5">
              {/* Kurzbeschreibung */}
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {info?.character ?? extra?.character}
              </p>

              {/* Steckbrief */}
              {info && (info.priceLevel !== "—" || info.residents !== "—") && (
                <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[12px]">
                  {info.priceLevel !== "—" && (
                    <>
                      <dt className="text-text-tertiary">Preislevel:</dt>
                      <dd className="text-text-secondary">{info.priceLevel}</dd>
                    </>
                  )}
                  {info.residents !== "—" && (
                    <>
                      <dt className="text-text-tertiary">Hier wohnen:</dt>
                      <dd className="text-text-secondary">{info.residents}</dd>
                    </>
                  )}
                </dl>
              )}

              {/* Bewohner*innen (echte Charaktere) */}
              {residents.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                    Bewohner*innen
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {residents.map((c) => (
                      <Link
                        key={c.id}
                        href={`/charaktere/${c.id}`}
                        className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-primary pl-1 pr-2.5 py-0.5 text-[10px] text-text-secondary hover:text-text-primary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.faceclaim_image_url ?? ""}
                          alt={c.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Bespielte Orte */}
              <LocationSection
                title="Bespielte Orte"
                locs={playedLocs}
                orphans={orphanPlayed}
                played
                openLoc={openLoc}
                setOpenLoc={setOpenLoc}
                onAdd={() => setAdding(true)}
              />

              {/* Ortsideen */}
              <LocationSection
                title="Ortsideen (noch nicht bespielt)"
                locs={ideaLocs}
                openLoc={openLoc}
                setOpenLoc={setOpenLoc}
                onAdd={() => setAdding(true)}
                showAdd
              />

              {/* Formular: neuen Ort anlegen */}
              {adding && (
                <AddLocationForm
                  area={selected}
                  onCancel={() => setAdding(false)}
                  onCreate={createLocation}
                />
              )}

              {/* Aktive Szenen hier */}
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                  Aktive Szenen hier
                </div>
                {activeScenes.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">
                    Keine aktive Szene an diesem Ort.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeScenes.map((s) => {
                      const turnId = whoseTurn(s, postsOf(s.id));
                      return (
                        <Link
                          key={s.id}
                          href={`/szenen/${s.id}`}
                          className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] text-text-primary font-serif">
                              {s.title}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-accent">
                              aktiv
                            </span>
                          </div>
                          <div className="text-[10px] text-text-tertiary">
                            {s.location_name} · {formatInplayDate(s.inplay_date)}
                            {turnId && (
                              <> · {character(turnId)?.name.split(" ")[0]} ist dran</>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Alle Szenen → gefilterte Szenensuche */}
                {scenesHere.length > 0 && (
                  <Link
                    href={`/szenen?area=${selected}`}
                    className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-text-secondary hover:text-accent transition-colors"
                  >
                    Alle {scenesHere.length} {scenesHere.length === 1 ? "Szene" : "Szenen"} an diesem Ort
                    <Icon name="arrow-right" size={12} />
                  </Link>
                )}
              </div>
              </div>
            </>
          ) : (
            <p className="p-5 text-[12px] text-text-tertiary">
              Klicke einen Ort auf der Karte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationSection({
  title,
  locs,
  orphans = [],
  played = false,
  openLoc,
  setOpenLoc,
  onAdd,
  showAdd = false,
}: {
  title: string;
  locs: Location[];
  orphans?: string[];
  played?: boolean;
  openLoc: string | null;
  setOpenLoc: (id: string | null) => void;
  onAdd: () => void;
  showAdd?: boolean;
}) {
  const open = locs.find((l) => l.id === openLoc);
  return (
    <div className="mt-5">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {locs.map((l) => {
          const isOpen = openLoc === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setOpenLoc(isOpen ? null : l.id)}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
                played
                  ? "bg-accent-soft border-accent/40 text-text-primary"
                  : "bg-white/[0.03] border-border-subtle text-text-tertiary hover:text-text-secondary"
              } ${isOpen ? "ring-1 ring-accent/60" : ""}`}
            >
              {l.name}
            </button>
          );
        })}
        {/* Orphans (bespielt, ohne Eintrag) */}
        {orphans.map((n) => (
          <span
            key={n}
            className="rounded-full bg-accent-soft border border-accent/40 px-2.5 py-1 text-[10px] text-text-primary"
          >
            {n}
          </span>
        ))}
        {/* + neuen Ort (nur bei Ortsideen) */}
        {showAdd && (
          <button
            onClick={onAdd}
            title="Neuen Ort erstellen"
            className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent-soft px-2.5 py-1 text-[10px] font-medium text-text-primary hover:bg-accent hover:text-black hover:border-accent transition-colors"
          >
            <Icon name="plus" size={12} /> Ort hinzufügen
          </button>
        )}
      </div>

      {/* Popup mit Beschreibung des angeklickten Orts */}
      {open && (
        <div className="mt-2 rounded-lg border border-accent/40 bg-bg-surface-2 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-serif text-[14px] text-text-primary">
              {open.name}
            </div>
            <button
              onClick={() => setOpenLoc(null)}
              className="text-text-tertiary hover:text-text-primary text-[12px]"
            >
              ✕
            </button>
          </div>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            {open.description ?? "Noch keine Beschreibung hinterlegt."}
          </p>
        </div>
      )}
    </div>
  );
}

function AddLocationForm({
  area,
  onCancel,
  onCreate,
}: {
  area: string;
  onCancel: () => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const field =
    "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[12px] text-text-primary outline-none focus:border-white/20";

  return (
    <div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary p-3 flex flex-col gap-2">
      <div className="text-[10px] text-text-secondary">
        Neuer Ort in <span className="text-text-primary">{areaName(area)}</span>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Titel des Orts"
        className={field}
        autoFocus
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={3}
        className={`${field} resize-y`}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-[12px] text-text-tertiary hover:text-text-primary px-2"
        >
          Abbrechen
        </button>
        <button
          onClick={() => name.trim() && onCreate(name, desc)}
          disabled={!name.trim()}
          className="rounded-md bg-accent/90 hover:bg-accent text-black text-[12px] font-medium px-3 py-1.5 disabled:opacity-40"
        >
          Ort anlegen
        </button>
      </div>
      <p className="text-[10px] text-text-tertiary">
        Bleibt unter „Ortsideen", bis eine Szene hier spielt.
      </p>
    </div>
  );
}
