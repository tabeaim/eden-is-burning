"use client";

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaName } from "@/lib/world";

export default function PlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { playerByUsername, charactersOf } = useStore();
  const p = playerByUsername(decodeURIComponent(username));

  if (!p) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 text-text-tertiary">
        Spieler*in nicht gefunden.
      </div>
    );
  }

  const chars = charactersOf(p.id);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Inhalt linksbündig in Lesebreite — Container-Breite bleibt einheitlich */}
      <div className="max-w-3xl">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.avatar_url ?? ""}
          alt={p.username}
          className="w-16 h-16 rounded-full object-cover bg-bg-surface border border-border-subtle"
        />
        <div>
          <h1 className="font-serif text-2xl text-text-primary">
            {p.username}
          </h1>
          {p.bio && (
            <p className="text-[12px] text-text-secondary mt-0.5 max-w-md">
              {p.bio}
            </p>
          )}
        </div>
      </div>

      <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mt-8 mb-3">
        Charaktere ({chars.length})
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {chars.map((c) => (
          <Link
            key={c.id}
            href={`/charaktere/${c.id}`}
            className="flex gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3 hover:bg-white/[0.03] transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              className="w-16 h-24 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="font-serif text-[14px] text-text-primary">
                {c.name}
              </div>
              <div className="text-[12px] text-text-tertiary">{c.role}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">
                {areaName(c.area)}
              </div>
              {c.tagline && (
                <div className="mt-1.5 inline-block rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-text-secondary">
                  {c.tagline}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
