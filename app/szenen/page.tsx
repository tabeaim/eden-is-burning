"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

type Filter = "all" | "active" | "mine";

export default function ScenesPage() {
  const store = useStore();
  const { scenes, character, postsOf, currentPlayer, charactersOf } = store;
  const [filter, setFilter] = useState<Filter>("all");

  const myCharIds = new Set(
    currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : [],
  );

  const filtered = scenes.filter((s) => {
    if (filter === "active") return s.status === "active";
    if (filter === "mine")
      return s.participant_ids.some((id) => myCharIds.has(id));
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <PageHeader title="Szenen" subtitle="Alle Threads in Eden.">
        <Link
          href="/szenen/neu"
          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] border border-border-subtle px-3 py-2 text-[13px] text-text-primary"
        >
          <Icon name="plus" size={15} /> Neue Szene
        </Link>
      </PageHeader>

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

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((s) => {
          const posts = postsOf(s.id);
          const turnId = whoseTurn(s, posts);
          const participants = s.participant_ids
            .map((id) => character(id))
            .filter(Boolean);
          return (
            <Link
              key={s.id}
              href={`/szenen/${s.id}`}
              className="rounded-xl border border-border-subtle bg-bg-surface p-5 hover:bg-white/[0.03] transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    s.status === "active"
                      ? "bg-white/[0.06] text-text-secondary"
                      : "bg-white/[0.03] text-text-tertiary"
                  }`}
                >
                  {s.status === "active" ? "aktiv" : "geschlossen"}
                </span>
                {s.trigger_warning && (
                  <span className="text-[10px] uppercase tracking-wider text-red-300/80">
                    TW
                  </span>
                )}
              </div>
              <h3 className="font-serif text-[17px] text-text-primary mt-2 leading-tight">
                {s.title}
              </h3>
              <div className="text-[12px] text-text-tertiary mt-1">
                {s.location_name} · {areaName(s.location_area)}
              </div>
              <div className="text-[12px] text-text-tertiary">
                {formatInplayDate(s.inplay_date)}, {s.inplay_time}
              </div>

              <div className="mt-auto pt-4 flex items-center gap-1.5">
                {participants.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c!.id}
                    src={c!.faceclaim_image_url ?? ""}
                    alt={c!.name}
                    title={c!.name}
                    className="w-7 h-7 rounded-full object-cover border border-border-subtle"
                  />
                ))}
                <span className="ml-1 text-[11px] text-text-tertiary">
                  {participants.map((c) => c!.name.split(" ")[0]).join(" & ")}
                </span>
                {s.status === "active" && turnId && (
                  <span className="ml-auto text-[11px] text-text-secondary">
                    {character(turnId)?.name.split(" ")[0]} ist dran
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-[13px] text-text-tertiary">
          Keine Szenen für diesen Filter.
        </div>
      )}
    </div>
  );
}
