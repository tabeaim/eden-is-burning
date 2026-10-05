"use client";

import Link from "next/link";
import { useContextMenu } from "./ContextMenu";
import { characterImage } from "@/lib/avatar";
import { useStore, whoseTurn } from "@/lib/store";
import {
  formatDateTime,
  formatDateTimeShort,
  formatInplayDate,
  formatInplayDateShort,
} from "@/lib/format";
import type { Character, Scene } from "@/lib/types";
import { Icon } from "./Icon";
import { SceneTurnBar } from "./SceneTurnBar";

// Szenen-Boxen – es gibt genau zwei Varianten (siehe DESIGN.md):
//  1. SceneCard – ausführliche Karte: Szenen-Übersicht, Dashboard, Ortsprofil,
//     Charakterprofil
//  2. SceneRow  – kompakte Zeile für schmale Spalten (Dashboard „letzte 24h", Karte)
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

// Alternate Universe in der Faktenzeile: AU-Icon (gespaltener Zeitstrahl) + Name
// des AUs in Kursiv; ohne Namen steht „AU".
export function AuTag({ scene }: { scene: Scene }) {
  if (!scene.au) return null;
  return (
    <span title="Alternate Universe" className="inline-flex items-center gap-1 align-bottom">
      <Icon name="au" size={14} />
      <span className="italic">{scene.au_name || "AU"}</span>
    </span>
  );
}

// Die ganze Box führt zur Szene (Titel-Link, über die Box gestreckt); einzelne
// Stellen darin können eigene Ziele haben (z.B. „Letzter Post" → neuester Post).
// Rechtsklick auf eine Szenenbox: gelesen/ungelesen umschalten (nur wenn die
// Szene Posts hat – sonst gibt es nichts zu lesen).
function useSceneMenu(scene: Scene) {
  const { isSceneNew, markSceneSeen, markSceneUnread, postsOf } = useStore();
  const hasPosts = postsOf(scene.id).length > 0;
  return useContextMenu(
    !hasPosts
      ? []
      : isSceneNew(scene.id)
        ? [{ label: "Als gelesen markieren", onClick: () => markSceneSeen(scene.id) }]
        : [{ label: "Als ungelesen markieren", onClick: () => markSceneUnread(scene.id) }],
  );
}

const STRETCHED = "after:absolute after:inset-0 after:content-['']";

// Ort in der Faktenzeile: bleibt reiner Text, führt aber aufs Ortsprofil. Orte
// ohne eigenen Eintrag (Altbestand) sind nicht anklickbar.
function SceneLocation({ scene }: { scene: Scene }) {
  const { locationsOf } = useStore();
  const loc = locationsOf(scene.location_area).find((l) => l.name === scene.location_name);
  if (!loc) return <>{scene.location_name}</>;
  return (
    <Link
      href={`/orte/${loc.id}`}
      title="Zum Ortsprofil"
      className="relative z-10 hover:text-accent hover:underline"
    >
      {scene.location_name}
    </Link>
  );
}

// Ausführliche Karte: Streichholz, Titel, Ort · Datum in einer Zeile,
// Beteiligte (anklickbar; wer dran ist, ist markiert), letzter Post mit Datum und
// Uhrzeit (Klick springt zum neuesten Post).
export function SceneCard({
  scene,
  href,
  muted = false,
  compact = false,
}: {
  scene: Scene;
  href?: string; // abweichendes Ziel, z.B. Sprung zu einem Suchtreffer
  muted?: boolean;
  // Reduziert (Charakterprofil): Beteiligte nur als zusammengerückte Avatare +
  // Vornamen, ohne Bubbles und ohne die Zeile zum letzten Post
  compact?: boolean;
}) {
  const { character, postsOf } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const posts = postsOf(scene.id);
  const lastPost = posts.length ? posts[posts.length - 1] : null;
  const { onContextMenu, menu } = useSceneMenu(scene);

  return (
    <div
      onContextMenu={onContextMenu}
      className={`relative flex items-center gap-4 rounded-xl border border-border-subtle px-4 py-3.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "bg-bg-surface/60" : "bg-bg-surface"
      }`}
    >
      {menu}
      {/* Streichholz groß, vertikal mittig über die ganze Karte */}
      <SceneMatch scene={scene} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-[1rem] text-text-primary leading-tight">
            <Link href={href ?? `/szenen/${scene.id}`} className={STRETCHED}>
              {scene.title}
            </Link>
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
          <SceneLocation scene={scene} /> · {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
          {scene.au && (
            <>
              {" · "}
              <AuTag scene={scene} />
            </>
          )}
        </div>

        {compact ? (
          <div className="mt-2 flex items-center gap-2 text-[0.8125rem] text-text-tertiary">
            <span className="flex shrink-0 -space-x-2">
              {participants.map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={c.id}
                  src={characterImage(c)}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover ring-2 ring-bg-surface"
                />
              ))}
            </span>
            <span className="min-w-0 truncate">{participants.map((c) => c.name.split(" ")[0]).join(", ")}</span>
          </div>
        ) : (
          <>
        <div className="mt-2.5">
          <SceneTurnBar
            participants={participants}
            activeCharId={whoseTurn(scene, posts)}
            active={scene.status === "active"}
            firstNameOnly
            linked
          />
        </div>

        <div className="mt-2 text-[0.8125rem] text-text-tertiary">
          {lastPost ? (
            <Link
              href={`/szenen/${scene.id}#post-${lastPost.id}`}
              title="Zum neuesten Post springen"
              className="relative z-10 hover:text-accent hover:underline"
            >
              Letzter Post am {formatDateTime(lastPost.created_at)}
            </Link>
          ) : (
            "Noch kein Post"
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// Kompakte Zeile, überall gleich aufgebaut: Streichholz, Titel, Ort · Datum
// (numerisch); rechts wer zuletzt gepostet hat und wann (Klick springt zum
// neuesten Post).
export function SceneRow({ scene }: { scene: Scene }) {
  const { postsOf, character } = useStore();
  const posts = postsOf(scene.id);
  const lastPost = posts.length ? posts[posts.length - 1] : null;
  const lastChar = lastPost ? character(lastPost.character_id) : undefined;
  const { onContextMenu, menu } = useSceneMenu(scene);

  return (
    <div
      onContextMenu={onContextMenu}
      className="relative flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      {menu}
      <SceneMatch scene={scene} size={24} />
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[0.875rem] text-text-primary truncate">
          <Link href={`/szenen/${scene.id}`} className={STRETCHED}>
            {scene.title}
          </Link>
        </div>
        <div className="text-[0.875rem] text-text-tertiary truncate">
          <SceneLocation scene={scene} /> · {formatInplayDateShort(scene.inplay_date)}
        </div>
      </div>
      {lastPost && (
        <Link
          href={`/szenen/${scene.id}#post-${lastPost.id}`}
          title="Zum neuesten Post springen"
          className="group/last relative z-10 shrink-0 text-right text-[0.875rem]"
        >
          {lastChar && (
            <div className="text-text-secondary group-hover/last:text-accent group-hover/last:underline">
              {lastChar.name.split(" ")[0]}
            </div>
          )}
          <div className="text-text-tertiary group-hover/last:text-accent group-hover/last:underline">
            {formatDateTimeShort(lastPost.created_at)}
          </div>
        </Link>
      )}
    </div>
  );
}
