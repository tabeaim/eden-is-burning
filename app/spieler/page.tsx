"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatDateTimeShort, formatInplayDateShort } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { Character, Player } from "@/lib/types";

// Spieler-Übersicht: zwei Spielerkarten nebeneinander. Oben die Person (führt zum
// Spielerprofil), darunter ihre Charaktere als kompakte Liste mit kleinem Avatar
// (führen zu den Charakterprofilen) — auch zehn Charaktere bleiben übersichtlich.
// Meistbespielter Charakter zuerst.
export default function SpielerOverviewPage() {
  const { players, posts, charactersOf, currentPlayer, onlineIds, idleIds } = useStore();
  const sorted = [...players].sort((a, b) =>
    a.username.localeCompare(b.username, "de", { sensitivity: "base" }),
  );

  // Anzahl Posts pro Charakter
  const postCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) map.set(p.character_id, (map.get(p.character_id) ?? 0) + 1);
    return map;
  }, [posts]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title="Spieler"
        subtitle="Alle Spieler*innen von Eden."
        width="max-w-6xl"
      />

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        {sorted.map((p) => {
          const chars = [...charactersOf(p.id)].sort(
            (a, b) =>
              (postCounts.get(b.id) ?? 0) - (postCounts.get(a.id) ?? 0) ||
              a.name.localeCompare(b.name, "de"),
          );
          const isMe = p.id === currentPlayer?.id;
          const presence: "online" | "idle" | null =
            isMe || (onlineIds.includes(p.id) && !idleIds.includes(p.id))
              ? "online"
              : onlineIds.includes(p.id)
                ? "idle"
                : null;
          return (
            <PlayerRow
              key={p.id}
              player={p}
              chars={chars}
              postCounts={postCounts}
              presence={presence}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  chars,
  postCounts,
  presence,
}: {
  player: Player;
  chars: Character[];
  postCounts: Map<string, number>;
  presence: "online" | "idle" | null;
}) {
  const totalPosts = chars.reduce((n, c) => n + (postCounts.get(c.id) ?? 0), 0);

  return (
    <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      {/* Spieler*in */}
      <Link href={`/spieler/${player.username}`} className="group flex items-center gap-3">
        <span className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={player.avatar_url ?? ""}
            alt=""
            className="h-14 w-14 rounded-full object-cover bg-bg-primary ring-1 ring-border-subtle group-hover:ring-accent/50"
          />
          {presence && (
            <span
              title={presence === "online" ? "online" : "anderswo"}
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-bg-surface ${
                presence === "online" ? "bg-green-500" : "bg-yellow-400"
              }`}
            />
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-display lowercase text-[1.75rem] leading-none text-text-primary group-hover:text-accent">
            {player.username}
            <span className="text-accent">.</span>
          </span>
          <span className="mt-1.5 block text-[0.8125rem] text-text-tertiary">
            Mitglied seit {formatInplayDateShort(player.created_at.slice(0, 10))} ·{" "}
            {presence === "online"
              ? "gerade online"
              : presence === "idle"
                ? "online, gerade anderswo"
                : `zuletzt online ${formatDateTimeShort(player.last_seen)}`}
          </span>
        </span>
      </Link>

      {/* Charaktere */}
      <div className="mt-4 border-t border-border-subtle pt-3">
        <div className="mb-1.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
          {chars.length} {chars.length === 1 ? "Charakter" : "Charaktere"} · {totalPosts}{" "}
          {totalPosts === 1 ? "Post" : "Posts"}
        </div>
        {chars.length === 0 ? (
          <p className="text-[0.875rem] text-text-tertiary">Noch keine Charaktere.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {chars.map((c) => (
              <CharacterRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Eine Zeile in der Charakter-Liste: kleiner Avatar, Name, Alter · Beruf
function CharacterRow({ c }: { c: Character }) {
  const facts = [c.age ? `${c.age}` : null, c.role].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/charaktere/${c.id}`}
      title={facts ? `${c.name} — ${facts}` : c.name}
      className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.04]"
    >
      {c.faceclaim_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.faceclaim_image_url}
          alt=""
          loading="lazy"
          className="h-7 w-7 shrink-0 rounded-full object-cover bg-bg-primary"
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive-soft text-[0.75rem] uppercase text-text-primary">
          {c.name.charAt(0)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[0.875rem] text-text-secondary group-hover:text-text-primary">
          {c.name}
        </span>
        {facts && (
          <span className="block truncate text-[0.75rem] text-text-tertiary">{facts}</span>
        )}
      </span>
    </Link>
  );
}
