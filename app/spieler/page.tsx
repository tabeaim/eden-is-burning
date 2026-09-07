"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";

export default function SpielerOverviewPage() {
  const { players, charactersOf } = useStore();
  const sorted = [...players].sort((a, b) =>
    a.username.localeCompare(b.username, "de", { sensitivity: "base" }),
  );

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <PageHeader
        title="Spieler"
        subtitle="Alle Spieler*innen von Eden."
        width="max-w-5xl"
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => {
          const chars = charactersOf(p.id);
          return (
            <Link
              key={p.id}
              href={`/spieler/${p.username}`}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3 hover:bg-white/[0.03] transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.avatar_url ?? ""}
                alt={p.username}
                className="w-12 h-12 rounded-full object-cover bg-bg-primary shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[14px] text-text-primary truncate">
                  {p.username}
                </div>
                <div className="text-[13px] text-text-tertiary">
                  {chars.length}{" "}
                  {chars.length === 1 ? "Charakter" : "Charaktere"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
