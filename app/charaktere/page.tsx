"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatInplayDateShort } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Bubble, CharacterBubble } from "@/components/Bubble";
import { Icon } from "@/components/Icon";
import type { Character, Player } from "@/lib/types";

type SortKey = "name" | "created" | "posts" | "active";
const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  created: "Anmeldedatum",
  posts: "Post-Anzahl",
  active: "Letzte Aktivität",
};

export default function CharaktereePage() {
  const { characters, npcs, posts, player } = useStore();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Anzahl Posts und Zeitpunkt des letzten Posts pro Charakter
  const { postCounts, lastActive } = useMemo(() => {
    const postCounts = new Map<string, number>();
    const lastActive = new Map<string, string>();
    for (const p of posts) {
      postCounts.set(p.character_id, (postCounts.get(p.character_id) ?? 0) + 1);
      if (p.created_at > (lastActive.get(p.character_id) ?? "")) {
        lastActive.set(p.character_id, p.created_at);
      }
    }
    return { postCounts, lastActive };
  }, [posts]);

  const q = query.trim().toLowerCase();
  const list = characters
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.faceclaim ?? "").toLowerCase().includes(q),
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created") cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
      else if (sortKey === "posts") cmp = (postCounts.get(a.id) ?? 0) - (postCounts.get(b.id) ?? 0);
      else if (sortKey === "active") {
        // letzter Post; Charaktere ohne Post gelten als am längsten inaktiv
        const la = lastActive.get(a.id) ?? "";
        const lb = lastActive.get(b.id) ?? "";
        cmp = la < lb ? -1 : la > lb ? 1 : 0;
      }
      // Name als Hauptkriterium bzw. als Reihenfolge bei Gleichstand
      if (cmp === 0) return a.name.localeCompare(b.name, "de") * (sortKey === "name" && sortDir === "desc" ? -1 : 1);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title="Charaktere"
        subtitle="Das Charakterverzeichnis von Eden."
        width="max-w-6xl"
      />

      {/* Textsuche links, Sortierung rechts */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Icon name="search" size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Charakter suchen…"
            aria-label="Charakter suchen"
            className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
            Sortieren
          </span>
          <select
            value={sortKey}
            onChange={(e) => {
              const k = e.target.value as SortKey;
              setSortKey(k);
              // sinnvolle Startrichtung: Name A–Z, sonst neueste/meiste zuerst
              setSortDir(k === "name" ? "asc" : "desc");
            }}
            aria-label="Sortieren nach"
            className="bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k} className="bg-bg-surface">
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Aufsteigend" : "Absteigend"}
            className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((c) => (
          <CharacterCard
            key={c.id}
            c={c}
            player={player(c.player_id)}
            postCount={postCounts.get(c.id) ?? 0}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-[0.875rem] text-text-tertiary">
          Kein Charakter passt zu „{query.trim()}“.
        </p>
      )}

      {/* NPCs — vorerst nur angedeutet; anlegen geht aktuell im Ortsprofil */}
      <div className="mt-10 rounded-xl border border-dashed border-border-strong px-5 py-4">
        <div className="text-[0.875rem] uppercase tracking-wider font-semibold text-text-tertiary">
          NPCs
        </div>
        <p className="mt-1 text-[0.875rem] text-text-tertiary">
          Nebenfiguren mit optionalem Profil. Aktuell lassen sie sich im Ortsprofil
          anlegen — die Erstellung hier folgt.
        </p>
        {npcs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {npcs.map((n) => (
              <CharacterBubble key={n.id} character={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Charakter-Karte: Name und Tagline im Stil der Charakterkarten in Szenen, Avatar
// im Originalformat (600×502), darunter Posts · played by (Spieler-Bubble) und
// „Lebendig seit" (Anmeldedatum). Bei Hover erscheint die Kurzbeschreibung über
// dem Bild. Die ganze Karte führt zum Profil (Namens-Link, über die Karte gestreckt).
function CharacterCard({
  c,
  player,
  postCount,
}: {
  c: Character;
  player?: Player;
  postCount: number;
}) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-4 text-center transition-colors hover:bg-white/[0.03]">
      <div className="font-display lowercase text-[1.625rem] leading-none text-text-primary">
        <Link href={`/charaktere/${c.id}`} className="after:absolute after:inset-0 after:content-['']">
          {c.name}
        </Link>
      </div>
      {c.tagline && (
        <div className="mt-1.5 flex justify-center">
          <span className="rounded-full border border-border-subtle bg-white/[0.03] px-3 py-0.5 text-[0.6875rem] uppercase tracking-wider text-text-secondary">
            {c.tagline}
          </span>
        </div>
      )}

      {/* Avatar im Originalformat, nie größer als das Bild selbst; mt-auto hält die
          Bilder einer Reihe auf gleicher Höhe, auch ohne Tagline */}
      <div className="mt-auto w-full pt-3">
        <div className="relative mx-auto aspect-[600/502] w-full max-w-[600px] overflow-hidden rounded-lg bg-bg-primary">
          {c.faceclaim_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.faceclaim_image_url}
              alt={c.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {c.bio && (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-center bg-black/90 px-5 py-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wider text-text-primary">
                {[c.role, c.age ? `${c.age}` : null].filter(Boolean).join(" · ")}
              </div>
              <p className="text-[0.8125rem] leading-relaxed text-text-primary/90 line-clamp-[8]">
                {c.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[0.8125rem] uppercase tracking-wider text-text-secondary">
        <span>
          <span className="font-bold text-text-primary">{postCount}</span>{" "}
          {postCount === 1 ? "Post" : "Posts"}
        </span>
        {player && (
          <>
            <span>· played by</span>
            <span className="relative z-10 normal-case tracking-normal">
              <Bubble
                href={`/spieler/${player.username}`}
                leading={
                  player.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.avatar_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : undefined
                }
              >
                {player.username}
              </Bubble>
            </span>
          </>
        )}
      </div>
      <div className="mt-1 text-[0.8125rem] text-text-tertiary">
        Lebendig seit {formatInplayDateShort(c.created_at.slice(0, 10))}
      </div>
    </div>
  );
}
