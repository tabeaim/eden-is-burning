"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatDateTime, formatInplayDate } from "@/lib/format";
import type { Character, Scene } from "@/lib/types";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";

// Szenen-Boxen — es gibt genau drei Varianten (siehe DESIGN.md):
//  1. Szenen-Kachel im Raster der Szenen-Übersicht (app/szenen/page.tsx)
//  2. SceneCard — Key-Facts-Karte für Listen (Dashboard, Ortsprofil, Charakterprofil)
//  3. SceneRow  — kompakte Zeile für schmale Spalten (Dashboard „letzte 24h", Karte)

// Key-Facts einer Szene: Titel, Beteiligte, Ort · Datum, letzter Post.
export function SceneCard({
  scene,
  muted = false,
  showStatus = false,
}: {
  scene: Scene;
  muted?: boolean;
  showStatus?: boolean; // für Listen, die aktive und geschlossene Szenen mischen
}) {
  const { character, postsOf } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const posts = postsOf(scene.id);
  const lastPost = posts.length ? posts[posts.length - 1] : null;

  return (
    <Link
      href={`/szenen/${scene.id}`}
      className={`block rounded-xl border border-border-subtle px-5 py-3.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "bg-bg-surface/60" : "bg-bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[1rem] text-text-primary leading-tight">
          {scene.title}
        </h3>
        {showStatus && <StatusBadge status={scene.status} sceneId={scene.id} />}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex -space-x-1.5">
          {participants.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c.id}
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              title={c.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-bg-surface"
            />
          ))}
        </div>
        <span className="text-[0.875rem] text-text-secondary">
          {participants.map((c) => c.name.split(" ")[0]).join(" & ")}
        </span>
      </div>

      <div className="mt-1.5 text-[0.875rem] text-text-tertiary">
        {scene.location_name} · {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
        {scene.au && (
          <>
            {" · "}
            <span className="italic">AU</span>
          </>
        )}
      </div>

      <div className="mt-1 text-[0.8125rem] text-text-tertiary">
        {lastPost
          ? `Letzter Post am ${formatDateTime(lastPost.created_at)}`
          : "Noch kein Post"}
      </div>
    </Link>
  );
}

// Kompakte Zeile: Status-Icon, Titel, eine Unterzeile, optional Infos rechts.
// Aktiv = Flamme (orange nur bei ungelesenem neuestem Post), geschlossen = Haken.
export function SceneRow({
  scene,
  sub,
  right,
}: {
  scene: Scene;
  sub: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { isSceneNew } = useStore();
  const active = scene.status === "active";
  return (
    <Link
      href={`/szenen/${scene.id}`}
      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      <span
        className={`shrink-0 ${
          active && isSceneNew(scene.id) ? "text-accent" : "text-text-tertiary"
        }`}
      >
        <Icon name={active ? "flame" : "check"} size={17} />
      </span>
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
