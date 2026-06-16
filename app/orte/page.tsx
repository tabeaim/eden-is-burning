"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  AREAS,
  LOCATION_SUGGESTIONS,
  areaName,
  type AreaKey,
} from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { EdenMap } from "@/components/EdenMap";

type Filter = "all" | "active" | "mine";

const OFF_MAP: AreaKey[] = ["byron", "sutton", "washington"];

export default function PlacesPage() {
  const { scenes, charactersOf, currentPlayer } = useStore();
  const [selected, setSelected] = useState<AreaKey | null>("rivers_edge");
  const [filter, setFilter] = useState<Filter>("all");

  const myCharIds = new Set(
    currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : [],
  );

  const scenesIn = (area: AreaKey) =>
    scenes.filter((s) => {
      if (s.location_area !== area) return false;
      if (filter === "active") return s.status === "active";
      if (filter === "mine")
        return s.participant_ids.some((id) => myCharIds.has(id));
      return true;
    });

  const activeCounts: Record<string, number> = {};
  for (const s of scenes) {
    if (s.status === "active")
      activeCounts[s.location_area] =
        (activeCounts[s.location_area] ?? 0) + 1;
  }

  const sel = selected ? AREAS[selected] : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <PageHeader title="Orte" subtitle="Eden, Virginia — fünf Bezirke." />

      <div className="flex gap-1.5 mb-5">
        {(
          [
            ["all", "Alle"],
            ["active", "Aktive"],
            ["mine", "Meine"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              filter === key
                ? "bg-white/[0.1] text-text-primary"
                : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-3">
          <EdenMap
            selected={selected}
            onSelect={setSelected}
            activeCounts={activeCounts}
          />
        </div>

        {/* Detail-Panel */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 min-h-[300px]">
          {sel ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl text-text-primary">
                  {sel.name}
                </h2>
                <span className="text-[12px] text-text-secondary">
                  {sel.priceLevel}
                </span>
              </div>
              <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                {sel.character}
              </p>
              <p className="text-[11px] text-text-tertiary mt-2">
                Wer wohnt hier: {sel.residents}
              </p>

              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                  Orte
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATION_SUGGESTIONS[sel.key].map((loc) => (
                    <span
                      key={loc}
                      className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-text-secondary"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                  Szenen hier
                </div>
                <SceneLinks area={sel.key} scenesIn={scenesIn} />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-text-tertiary">
              Klicke einen Bezirk auf der Karte.
            </p>
          )}
        </div>
      </div>

      {/* Nicht-Karten-Orte */}
      <div className="mt-8">
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mb-3">
          Weitere Orte
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {OFF_MAP.map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`text-left rounded-xl border bg-bg-surface p-4 transition-colors ${
                selected === k
                  ? "border-white/25"
                  : "border-border-subtle hover:bg-white/[0.03]"
              }`}
            >
              <div className="font-serif text-[15px] text-text-primary">
                {AREAS[k].name}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1 line-clamp-3">
                {AREAS[k].character}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneLinks({
  area,
  scenesIn,
}: {
  area: AreaKey;
  scenesIn: (a: AreaKey) => ReturnType<typeof useStore>["scenes"];
}) {
  const list = scenesIn(area);
  if (list.length === 0)
    return <p className="text-[12px] text-text-tertiary">Keine Szenen.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {list.map((s) => (
        <Link
          key={s.id}
          href={`/szenen/${s.id}`}
          className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 hover:bg-white/[0.03] transition-colors"
        >
          <div className="text-[13px] text-text-primary font-serif">
            {s.title}
          </div>
          <div className="text-[11px] text-text-tertiary">
            {s.location_name} · {formatInplayDate(s.inplay_date)} ·{" "}
            {s.status === "active" ? "aktiv" : "geschlossen"}
          </div>
        </Link>
      ))}
    </div>
  );
}
