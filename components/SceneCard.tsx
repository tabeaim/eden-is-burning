"use client";

import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { formatDateTime, formatInplayDate, timeAgo, withinHours } from "@/lib/format";
import type { Character, Scene } from "@/lib/types";
import { Icon } from "./Icon";
import { SceneTurnBar } from "./SceneTurnBar";

// Szenen-Boxen — es gibt genau zwei Varianten (siehe DESIGN.md):
//  1. SceneCard — ausführliche Karte: Szenen-Übersicht, Dashboard, Ortsprofil,
//     Charakterprofil
//  2. SceneRow  — kompakte Zeile für schmale Spalten (Dashboard „letzte 24h", Karte)
// Beide tragen links das Streichholz als Status (statt „aktiv"/„geschlossen"-Tags).

// Status als Streichholz: brennt orange, solange der neueste Post ungelesen ist;
// sonst grau und ohne Flamme; bei geschlossenen Szenen abgebrannt mit Rauch.
export function SceneMatch({ scene, size = 20 }: { scene: Scene; size?: number }) {
  const { isSceneNew } = useStore();
  const closed = scene.status === "closed";
  const unread = !closed && isSceneNew(scene.id);
  return (
    <span
      title={closed ? "geschlossen" : unread ? "aktiv · neuer Post" : "aktiv"}
      className={`shrink-0 ${unread ? "text-accent" : "text-text-tertiary"} ${
        closed ? "opacity-70" : ""
      }`}
    >
      <Icon name={closed ? "match-burnt" : unread ? "match-lit" : "match"} size={size} />
    </span>
  );
}

// "vor 2 Stunden" für frische Posts, sonst das Datum.
function lastPostLabel(iso: string): string {
  return withinHours(iso, 24 * 7) ? timeAgo(iso) : `am ${formatDateTime(iso)}`;
}

// Ausführliche Karte: Streichholz, Titel, Ort · Datum in einer Zeile, Beteiligte
// (wer dran ist, ist markiert), letzter Post.
export function SceneCard({
  scene,
  href,
  muted = false,
}: {
  scene: Scene;
  href?: string; // abweichendes Ziel, z.B. Sprung zu einem Suchtreffer
  muted?: boolean;
}) {
  const { character, postsOf } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const posts = postsOf(scene.id);
  const lastPost = posts.length ? posts[posts.length - 1] : null;

  return (
    <Link
      href={href ?? `/szenen/${scene.id}`}
      className={`flex gap-3 rounded-xl border border-border-subtle px-4 py-3.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "bg-bg-surface/60" : "bg-bg-surface"
      }`}
    >
      <SceneMatch scene={scene} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-[1rem] text-text-primary leading-tight">
            {scene.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {scene.paused && (
              <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
                pausiert
              </span>
            )}
            {scene.trigger_warning && (
              <span className="text-[0.8125rem] uppercase tracking-wider text-red-300/80">
                TW
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 text-[0.875rem] text-text-tertiary">
          {scene.location_name} · {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
          {scene.au && (
            <>
              {" · "}
              <span className="italic">AU</span>
            </>
          )}
        </div>

        <div className="mt-2.5">
          <SceneTurnBar
            participants={participants}
            activeCharId={whoseTurn(scene, posts)}
            active={scene.status === "active"}
            firstNameOnly
          />
        </div>

        <div className="mt-2 text-[0.8125rem] text-text-tertiary">
          {lastPost ? `Letzter Post ${lastPostLabel(lastPost.created_at)}` : "Noch kein Post"}
        </div>
      </div>
    </Link>
  );
}

// Kompakte Zeile: Streichholz, Titel, eine Unterzeile, optional Infos rechts.
export function SceneRow({
  scene,
  sub,
  right,
}: {
  scene: Scene;
  sub: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Link
      href={`/szenen/${scene.id}`}
      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      <SceneMatch scene={scene} size={18} />
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[0.875rem] text-text-primary truncate">
          {scene.title}
        </div>
        <div className="text-[0.875rem] text-text-tertiary truncate">{sub}</div>
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
    </Link>
  );
}
