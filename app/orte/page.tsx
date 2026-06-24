"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import {
  AREAS,
  LOCATION_SUGGESTIONS,
  areaName,
  type AreaKey,
} from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { EdenMap } from "@/components/EdenMap";

// Zusatz-Info für externe Orte, die nicht in AREAS stehen
const EXTRA: Record<string, { name: string; character: string }> = {
  rest: {
    name: "Rest der Welt",
    character:
      "Alles jenseits von Eden und D.C. — Reisen, Rückblenden, ferne Orte. Für Szenen, die nirgendwo sonst hingehören.",
  },
};

export default function PlacesPage() {
  const { scenes, postsOf, character } = useStore();
  const [selected, setSelected] = useState<string>("rivers_edge");

  // Statistik pro Bereich (aktive + gesamt = "bespielt")
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

  // Bespielte Orte (location_name) in diesem Bereich
  const playedNames = new Set(scenesHere.map((s) => s.location_name));
  const suggestions = LOCATION_SUGGESTIONS[selected as AreaKey] ?? [];
  // Alle Chips: Vorschläge + tatsächlich bespielte, die nicht in den Vorschlägen sind
  const ideaChips = suggestions.filter((l) => !playedNames.has(l));
  const playedChips = [
    ...suggestions.filter((l) => playedNames.has(l)),
    ...Array.from(playedNames).filter((l) => !suggestions.includes(l)),
  ];

  const info = AREAS[selected as AreaKey];
  const extra = EXTRA[selected];

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <PageHeader
        title="Orte"
        subtitle="Eden, Virginia — fünf Bezirke, ein Fluss, und alles dahinter."
      />

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-8 items-start">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-3">
          <EdenMap
            selected={selected}
            onSelect={setSelected}
            areaStats={areaStats}
          />
          <div className="px-2 pt-2 pb-1 flex items-center gap-4 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border border-olive/40 bg-[rgba(163,163,128,0.12)]" />
              bespielt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border border-border-subtle" />
              noch frei
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent">▲</span> aktive Szene
            </span>
          </div>
        </div>

        {/* Detail-Panel */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 min-h-[320px]">
          {info || extra ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-text-primary">
                  {info?.name ?? extra?.name}
                </h2>
                {info && (
                  <span className="text-[12px] text-text-secondary">
                    {info.priceLevel}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                {info?.character ?? extra?.character}
              </p>
              {info && info.residents !== "—" && (
                <p className="text-[11px] text-text-tertiary mt-2">
                  Wer wohnt hier: {info.residents}
                </p>
              )}

              {/* Bespielte Orte */}
              {playedChips.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                    Bespielte Orte
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {playedChips.map((loc) => (
                      <span
                        key={loc}
                        className="rounded-full bg-accent-soft border border-accent/40 px-2.5 py-1 text-[11px] text-text-primary"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weitere / Ortsideen */}
              {ideaChips.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                    Ortsideen (noch nicht bespielt)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ideaChips.map((loc) => (
                      <span
                        key={loc}
                        className="rounded-full bg-white/[0.03] border border-border-subtle px-2.5 py-1 text-[11px] text-text-tertiary"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Szenen hier */}
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                  Szenen hier ({scenesHere.length})
                </div>
                {scenesHere.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">
                    Noch keine Szenen an diesem Ort.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {scenesHere.map((s) => {
                      const turnId = whoseTurn(s, postsOf(s.id));
                      return (
                        <Link
                          key={s.id}
                          href={`/szenen/${s.id}`}
                          className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] text-text-primary font-serif">
                              {s.title}
                            </span>
                            <span
                              className={`text-[10px] uppercase tracking-wider ${
                                s.status === "active"
                                  ? "text-accent"
                                  : "text-text-tertiary"
                              }`}
                            >
                              {s.status === "active" ? "aktiv" : "archiv"}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-tertiary">
                            {s.location_name} ·{" "}
                            {formatInplayDate(s.inplay_date)}
                            {s.status === "active" && turnId && (
                              <> · {character(turnId)?.name.split(" ")[0]} ist dran</>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-text-tertiary">
              Klicke einen Ort auf der Karte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
