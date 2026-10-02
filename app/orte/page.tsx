"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { AREAS, EXTRA_AREAS, areaName, type AreaKey } from "@/lib/world";
import { formatInplayDateShort, placeholderImg } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { EdenMap } from "@/components/EdenMap";
import { Icon } from "@/components/Icon";
import { CharacterBubble, LocationBubble } from "@/components/Bubble";
import { SceneRow } from "@/components/SceneCard";
import type { Location } from "@/lib/types";

export default function PlacesPage() {
  const router = useRouter();
  const { scenes, characters, locationsOf, addLocation } = useStore();
  const [selected, setSelected] = useState<string>("rivers_edge");
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
  const extra = EXTRA_AREAS[selected];

  // Neuer Ort (unabhängig von einer Szene) → direkt aufs Ortsprofil zum Ausbauen
  function createLocation(name: string, description: string) {
    const id = addLocation(selected, name, description || null);
    setAdding(false);
    if (id) router.push(`/orte/${id}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <PageHeader
        title="Karte"
        subtitle="Eden, Virginia — fünf Bezirke, ein Fluss, und alles dahinter." width="max-w-6xl" />

      {/* Karte liegt frei (ohne Kasten, ohne Banner-Header) auf der Seite und füllt
          die Fensterhöhe; das schmale Detail-Panel sitzt rechtsbündig und darf bei
          wenig Platz ein Stück über das auslaufende Wasser ragen. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-0 items-start">
        <div className="map-fit w-full shrink-0 lg:-ml-4 lg:-mr-16">
          <EdenMap selected={selected} onSelect={(k) => { setSelected(k); setAdding(false); }} areaStats={areaStats} />
        </div>

        {/* Detail-Panel */}
        <div className="relative z-10 w-full lg:w-[360px] lg:shrink-0 lg:ml-auto lg:mt-10 rounded-xl border border-border-subtle bg-bg-surface/95 backdrop-blur-sm shadow-2xl shadow-black/60 min-h-[320px] overflow-hidden">
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
                <h2 className="absolute bottom-3 left-5 right-5 font-display lowercase text-[1.625rem] text-text-primary">
                  {info?.name ?? extra?.name}
                </h2>
              </div>

              <div className="p-5">
              {/* Kurzbeschreibung */}
              <p className="text-[0.875rem] text-text-secondary leading-relaxed">
                {info?.character ?? extra?.character}
              </p>

              {/* Steckbrief */}
              {info && (info.priceLevel !== "—" || info.residents !== "—") && (
                <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[0.875rem]">
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
                <AccordionSection key={`res-${selected}`} title="Bewohner*innen">
                  <div className="flex flex-wrap gap-1.5">
                    {residents.map((c) => (
                      <CharacterBubble key={c.id} character={c} />
                    ))}
                  </div>
                </AccordionSection>
              )}

              {/* Bespielte Orte */}
              <LocationSection
                key={`played-${selected}`}
                title="Bespielte Orte"
                locs={playedLocs}
                orphans={orphanPlayed}
                played
              />

              {/* Ortsideen */}
              <LocationSection
                key={`ideas-${selected}`}
                title="Ortsideen"
                locs={ideaLocs}
                onAdd={() => setAdding(true)}
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
              <AccordionSection key={`scenes-${selected}`} title="Aktive Szenen hier">
                {activeScenes.length === 0 ? (
                  <p className="text-[0.875rem] text-text-tertiary">
                    Keine aktive Szene an diesem Ort.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeScenes.map((s) => (
                      <SceneRow
                        key={s.id}
                        scene={s}
                        sub={
                          <>
                            {s.location_name} · {formatInplayDateShort(s.inplay_date)}
                          </>
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Alle Szenen → gefilterte Szenensuche */}
                {scenesHere.length > 0 && (
                  <Link
                    href={`/szenen?area=${selected}`}
                    className="mt-2.5 inline-flex items-center gap-1 text-[0.875rem] text-text-secondary hover:text-accent transition-colors"
                  >
                    Alle {scenesHere.length} {scenesHere.length === 1 ? "Szene" : "Szenen"} an diesem Ort
                    <Icon name="arrow-right" size={12} />
                  </Link>
                )}
              </AccordionSection>
              </div>
            </>
          ) : (
            <p className="p-5 text-[0.875rem] text-text-tertiary">
              Klicke einen Ort auf der Karte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Aufklappbarer Abschnitt im Bezirks-Panel — standardmäßig eingeklappt.
function AccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center gap-1.5 text-left mb-2"
      >
        <Icon
          name="chevron-right"
          size={12}
          className={`text-text-tertiary transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-[0.875rem] uppercase tracking-wider font-semibold text-text-tertiary group-hover:text-text-secondary transition-colors">
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

function LocationSection({
  title,
  locs,
  orphans = [],
  played = false,
  onAdd,
}: {
  title: string;
  locs: Location[];
  orphans?: string[];
  played?: boolean;
  onAdd?: () => void; // zeigt den „+"-Button am Listenende (neuen Ort erstellen)
}) {
  return (
    <AccordionSection title={title}>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Jeder Ort führt auf sein Ortsprofil */}
        {locs.map((l) => (
          <LocationBubble
            key={l.id}
            id={l.id}
            name={l.name}
            title={l.description ?? undefined}
            played={played}
          />
        ))}
        {/* Orphans (bespielt, ohne Eintrag) */}
        {orphans.map((n) => (
          <LocationBubble key={n} name={n} />
        ))}
        {played && locs.length === 0 && orphans.length === 0 && (
          <p className="text-[0.875rem] text-text-tertiary">
            Hier wurde noch nicht gespielt.
          </p>
        )}
        {/* + neuen Ort erstellen — am Ende der Liste */}
        {onAdd && (
          <button
            onClick={onAdd}
            title="Neuen Ort erstellen"
            aria-label="Neuen Ort erstellen"
            className="inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-accent/50 bg-accent-soft text-text-primary hover:bg-accent hover:text-black hover:border-accent transition-colors"
          >
            <Icon name="plus" size={13} />
          </button>
        )}
      </div>
    </AccordionSection>
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
    "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

  return (
    <div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary p-3 flex flex-col gap-2">
      <div className="text-[0.875rem] text-text-secondary">
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
          className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
        >
          Abbrechen
        </button>
        <button
          onClick={() => name.trim() && onCreate(name, desc)}
          disabled={!name.trim()}
          className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40"
        >
          Ort anlegen
        </button>
      </div>
      <p className="text-[0.875rem] text-text-tertiary">
        Bleibt unter „Ortsideen", bis eine Szene hier spielt.
      </p>
    </div>
  );
}
