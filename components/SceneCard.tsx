"use client";

import { useOpenPlace } from "./LocationCategoryPicker";
import { PHONE_AREA } from "@/lib/phone";
import Link from "next/link";
import { useContextMenu } from "./ContextMenu";
import { characterImage } from "@/lib/avatar";
import { joinNames } from "@/lib/format";
import { useStore, whoseTurn } from "@/lib/store";
import {
  formatDateTimeShort,
  formatInplayDateShort,
} from "@/lib/format";
import type { Character, Scene } from "@/lib/types";
import { chatHref, newestMessage, sceneHref, scenePlace } from "@/lib/chats";
import { Icon } from "./Icon";
import { Bubble } from "./Bubble";

// Szenen-Boxen – es gibt genau zwei Varianten (siehe DESIGN.md):
//  1. SceneCard – ausführliche Karte: Szenen-Übersicht, Dashboard, Ortsprofil,
//     Charakterprofil
//  2. SceneRow  – kompakte Zeile für schmale Spalten (Dashboard „letzte 24h", Karte)
// Beide tragen links das Streichholz als Status (statt „aktiv"/„geschlossen"-Tags).

// Status als Streichholz: brennt orange, solange der neueste Post ungelesen ist;
// sonst grau und ohne Flamme; bei geschlossenen Szenen abgebrannt mit Rauch.
export function SceneMatch({ scene, size = 20 }: { scene: Scene; size?: number }) {
  const { isSceneNew, isChatFresh } = useStore();
  const closed = scene.status === "closed";
  const unread =
    !closed && (scene.chat_id ? isChatFresh(scene.chat_id, scene.id) : isSceneNew(scene.id));
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

// Letzter Beitrag einer Szene und wohin er führt – bei SMS-Szenen die zuletzt
// geschriebene Nachricht im Chat auf dem Handy.
function useLastEntry(scene: Scene) {
  const { postsOf, chatMessages } = useStore();
  if (scene.chat_id) {
    const last = newestMessage(chatMessages.filter((m) => m.scene_id === scene.id));
    return {
      posts: [],
      last: last ?? null,
      lastHref: last ? chatHref(scene.chat_id, last.id) : "",
      what: "Letzte Nachricht",
      none: "Noch keine Nachricht",
    };
  }
  const posts = postsOf(scene.id);
  const last = posts.length ? posts[posts.length - 1] : null;
  return {
    posts,
    last,
    lastHref: last ? `/szenen/${scene.id}#post-${last.id}` : "",
    what: "Letzter Post",
    none: "Noch kein Post",
  };
}

// Ort in der Faktenzeile: bleibt reiner Text, führt aber aufs Ortsprofil. Orte
// ohne eigenen Eintrag (Altbestand, Import) bekommen ihn beim Anklicken. Ohne Ortsnamen steht
// die Gegend da; fehlt auch die, entfällt die Angabe samt Trennpunkt.
function SceneLocation({ scene }: { scene: Scene }) {
  const { locationsOf } = useStore();
  const openPlace = useOpenPlace();
  const place = scenePlace(scene);
  if (!place) return null;
  const loc = scene.location_name
    ? locationsOf(scene.location_area).find((l) => l.name === scene.location_name)
    : undefined;
  if (!loc && scene.location_name.trim() && scene.location_area !== PHONE_AREA)
    return (
      <>
        <button
          type="button"
          onClick={() => openPlace(scene.location_area, scene.location_name.trim())}
          title="Ortsseite anlegen und öffnen"
          className="relative z-10 hover:text-accent hover:underline"
        >
          {place}
        </button>
        {" · "}
      </>
    );
  if (!loc)
    return (
      <>
        {place}
        {" · "}
      </>
    );
  return (
    <>
      <Link
        href={`/orte/${loc.id}`}
        title="Zum Ortsprofil"
        className="relative z-10 hover:text-accent hover:underline"
      >
      {scene.location_name}
      </Link>
      {" · "}
    </>
  );
}

// Ausführliche Karte, zweizeilig: Streichholz, Titel; darunter links alle Beteiligten
// in einer Bubble (wer dran ist, ist markiert) und Ort · Datum; rechts daneben der letzte Post mit Datum und
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
  const { character } = useStore();
  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];
  const { posts, last: lastPost, lastHref, what, none } = useLastEntry(scene);
  const { onContextMenu, menu } = useSceneMenu(scene);
  // wer am Zug ist (nur in aktiven Szenen markiert)
  const turnId = scene.status === "active" ? whoseTurn(scene, posts) : null;
  const info = (
    <div className="truncate text-[0.875rem] text-text-tertiary">
      <SceneLocation scene={scene} />
      {formatInplayDateShort(scene.inplay_date)}
      {scene.au && (
        <>
          {" · "}
          <AuTag scene={scene} />
        </>
      )}
    </div>
  );

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
            <Link href={href ?? sceneHref(scene)} className={STRETCHED}>
              {scene.title}
            </Link>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {scene.draft && (
              <span
                title="Nur für dich sichtbar, bis du den ersten Post veröffentlichst"
                className="rounded bg-white/[0.06] px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-secondary"
              >
                Entwurf
              </span>
            )}
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

        {compact ? (
          <>
            <div className="mt-1">{info}</div>
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
              <span className="min-w-0 truncate">{joinNames(participants.map((c) => c.name.split(" ")[0]))}</span>
            </div>
          </>
        ) : (
          // Zweite Zeile: alle Beteiligten in einer Bubble und Ort · Datum – bricht
          // nicht um; was nicht passt, wird mit … gekürzt
          <div className="mt-2 flex min-w-0 items-center gap-3">
            <Bubble
              className="max-w-[65%] shrink-0 overflow-hidden whitespace-nowrap"
              leading={
                <span className="flex shrink-0 -space-x-1.5">
                  {participants.map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={c.id}
                      src={characterImage(c)}
                      alt=""
                      className={`h-5 w-5 rounded-full object-cover ring-2 ${
                        c.id === turnId ? "ring-accent" : "ring-bg-surface"
                      }`}
                    />
                  ))}
                </span>
              }
            >
              {/* wer dran ist: Name in der Akzentfarbe mit Flamme */}
              {participants.map((c, n) => (
                <span key={c.id} className={c.id === turnId ? "inline-flex items-center gap-0.5 text-accent" : undefined}>
                  {n > 0 && n === participants.length - 1 && <span className="text-text-secondary">&amp;&nbsp;</span>}
                  {c.name.split(" ")[0]}
                  {c.id === turnId && <Icon name="flame" size={12} />}
                  {participants.length > 2 && n < participants.length - 2 && (
                    <span className="text-text-secondary">,</span>
                  )}
                </span>
              ))}
            </Bubble>
            <div className="min-w-0 flex-1 truncate">{info}</div>
          </div>
        )}
      </div>
      {/* rechts, über beide Zeilen: der letzte Post (Klick springt dorthin) */}
      {!compact && (
        <div className="shrink-0 text-right text-[0.8125rem] leading-snug text-text-tertiary">
          {lastPost ? (
            <Link
              href={lastHref}
              title="Zum neuesten Beitrag springen"
              className="group/last relative z-10 block hover:text-accent"
            >
              <div className="text-text-secondary group-hover/last:text-accent group-hover/last:underline">{what}</div>
              <div className="group-hover/last:underline">{formatDateTimeShort(lastPost.created_at)}</div>
            </Link>
          ) : (
            none
          )}
        </div>
      )}
    </div>
  );
}

// Kompakte Zeile, überall gleich aufgebaut: Streichholz, Titel, Ort · Datum
// (numerisch); rechts wer zuletzt gepostet hat und wann (Klick springt zum
// neuesten Post).
export function SceneRow({ scene }: { scene: Scene }) {
  const { character } = useStore();
  const { last: lastPost, lastHref } = useLastEntry(scene);
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
          <Link href={sceneHref(scene)} className={STRETCHED}>
            {scene.title}
          </Link>
        </div>
        <div className="text-[0.875rem] text-text-tertiary truncate">
          <SceneLocation scene={scene} />
          {formatInplayDateShort(scene.inplay_date)}
        </div>
      </div>
      {lastPost && (
        <Link
          href={lastHref}
          title="Zum neuesten Beitrag springen"
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
