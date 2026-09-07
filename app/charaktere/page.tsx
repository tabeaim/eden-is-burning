"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName, type AreaKey } from "@/lib/world";
import { PageHeader } from "@/components/PageHeader";

export default function CharaktereePage() {
  const { characters, player } = useStore();
  const [area, setArea] = useState<AreaKey | "all">("all");

  const list =
    area === "all" ? characters : characters.filter((c) => c.area === area);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <PageHeader
        title="Charaktere"
        subtitle="Das Charakterverzeichnis von Eden."
        width="max-w-5xl"
      />

      <div className="flex flex-wrap gap-1.5 mb-6">
        <Chip active={area === "all"} onClick={() => setArea("all")}>
          Alle
        </Chip>
        {AREA_ORDER.map((k) => (
          <Chip key={k} active={area === k} onClick={() => setArea(k)}>
            {AREAS[k].name}
          </Chip>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {list.map((c) => {
          const p = player(c.player_id);
          return (
            <Link
              key={c.id}
              href={`/charaktere/${c.id}`}
              className="group rounded-xl border border-border-subtle bg-bg-surface overflow-hidden hover:bg-white/[0.03] transition-colors"
            >
              <div className="relative aspect-[3/4] bg-bg-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.faceclaim_image_url ?? ""}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-10 px-3 pb-2">
                  <div className="font-serif text-[0.875rem] text-white">
                    {c.name}
                  </div>
                  <div className="text-[0.875rem] text-white/70">{c.role}</div>
                </div>
              </div>
              <div className="px-3 py-2 text-[0.875rem] text-text-tertiary flex items-center justify-between">
                <span>{areaName(c.area)}</span>
                {p && <span>by {p.username}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {list.length === 0 && (
        <p className="text-[0.875rem] text-text-tertiary">
          Keine Charaktere in diesem Bezirk.
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[0.75rem] transition-colors ${
        active
          ? "bg-white/[0.1] text-text-primary"
          : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
