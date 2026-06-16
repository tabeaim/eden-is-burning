"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

export default function CalendarPage() {
  const { scenes } = useStore();
  const sorted = [...scenes].sort((a, b) =>
    a.inplay_date < b.inplay_date ? 1 : -1,
  );

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <PageHeader
        title="Kalender"
        subtitle="In-Game-Zeitstrahl der Szenen. (Erweiterung folgt.)"
      />
      <div className="relative border-l border-border-subtle pl-6 flex flex-col gap-5">
        {sorted.map((s) => (
          <div key={s.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/30" />
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
              {formatInplayDate(s.inplay_date)} · {s.inplay_time}
            </div>
            <Link
              href={`/szenen/${s.id}`}
              className="font-serif text-[16px] text-text-primary hover:underline"
            >
              {s.title}
            </Link>
            <div className="text-[12px] text-text-tertiary">
              {s.location_name} · {areaName(s.location_area)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
