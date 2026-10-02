"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDateTimeShort } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { CharacterBubble } from "@/components/Bubble";
import { Icon } from "@/components/Icon";
import type { Character } from "@/lib/types";

export default function CharaktereePage() {
  const { characters, npcs, posts, player } = useStore();
  const [query, setQuery] = useState("");

  // Pro Charakter: Anzahl Posts und Zeitpunkt des letzten Posts
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; last: string }>();
    for (const p of posts) {
      const cur = map.get(p.character_id);
      if (!cur) map.set(p.character_id, { count: 1, last: p.created_at });
      else {
        cur.count += 1;
        if (p.created_at > cur.last) cur.last = p.created_at;
      }
    }
    return map;
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
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title="Charaktere"
        subtitle="Das Charakterverzeichnis von Eden."
        width="max-w-6xl"
      />

      {/* Textsuche */}
      <div className="relative mb-6 max-w-sm">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((c) => (
          <CharacterCard
            key={c.id}
            c={c}
            username={player(c.player_id)?.username}
            postCount={stats.get(c.id)?.count ?? 0}
            lastPost={stats.get(c.id)?.last}
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

// Charakter-Karte: Name, Tagline, Avatar im Originalformat (600×502), darunter
// Posts · played by und der Zeitpunkt des letzten Posts. Bei Hover erscheint die
// Kurzbeschreibung über dem Bild.
function CharacterCard({
  c,
  username,
  postCount,
  lastPost,
}: {
  c: Character;
  username?: string;
  postCount: number;
  lastPost?: string;
}) {
  return (
    <Link
      href={`/charaktere/${c.id}`}
      className="group flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-4 text-center transition-colors hover:bg-white/[0.03]"
    >
      <div className="font-display lowercase text-[1.625rem] leading-none text-text-primary">
        {c.name}
      </div>
      <div className="mt-2.5 min-h-[1.75rem] bg-bg-primary px-2 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-text-secondary">
        {c.tagline}
      </div>

      {/* Avatar im Originalformat, nie größer als das Bild selbst */}
      <div className="relative mx-auto mt-3 aspect-[600/502] w-full max-w-[600px] overflow-hidden rounded-lg bg-bg-primary">
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

      <div className="mt-3 text-[0.8125rem] uppercase tracking-wider text-text-secondary">
        <span className="font-bold text-text-primary">{postCount}</span>{" "}
        {postCount === 1 ? "Post" : "Posts"}
        {username && (
          <>
            {" · "}played by <span className="font-bold text-text-primary">{username}</span>
          </>
        )}
      </div>
      <div className="mt-0.5 text-[0.8125rem] text-text-tertiary" title="Letzter Post">
        {lastPost ? formatDateTimeShort(lastPost) : "noch kein Post"}
      </div>
    </Link>
  );
}
