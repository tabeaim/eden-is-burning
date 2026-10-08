"use client";

import { capFirst } from "@/lib/format";
import { characterImage } from "@/lib/avatar";
import Link from "next/link";
import { RichText } from "./RichText";
import type { Character, Player } from "@/lib/types";
import { ageAt } from "@/lib/characters";
import { GONE_CLASS, GONE_PLAYER_CLASS, useCharacterGone } from "@/lib/gone";

// Charakterkarte für die Szenenansicht. Ab `md` groß neben dem Post (Bildformat
// 600×502; die Bio erscheint als Overlay, solange die Maus über dem Bild ist –
// benannte Gruppe `ava`, nicht schon beim Hovern über dem ganzen Post). Auf dem
// Handy eine schmale Kopfzeile über dem Post: kleiner Avatar, daneben Name,
// Tagline und Spieler*in.
export function SceneCharacterCard({
  character,
  player,
  at,
}: {
  character: Character;
  player?: Player;
  at?: string; // Inplay-Datum der Szene: Alter zu diesem Zeitpunkt
}) {
  const age = ageAt(character, at);
  const gone = useCharacterGone(character);
  const href = `/charaktere/${character.id}`;
  const byPlayer = player && (
    <>
      by{" "}
      {player.deleted_at ? (
        // gelöschtes Konto: nur noch der ausgegraute Name, kein Link
        <span className={GONE_PLAYER_CLASS} title="Konto gelöscht">
          {player.username}
        </span>
      ) : (
        <Link href={`/spieler/${player.username}`} className="hover:text-text-secondary">
          {player.username}
        </Link>
      )}
    </>
  );
  const gif = character.profile?.scene_gif_url;
  return (
    <>
      {/* Handy: Kopfzeile über dem Post */}
      <div className="flex w-full items-center gap-3 md:hidden">
        <Link href={href} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterImage(character)}
            alt={character.name}
            className="h-14 w-14 rounded-lg border border-border-subtle object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            title={gone ? "Charakter gelöscht" : undefined}
            className={`block truncate font-serif text-[0.9375rem] font-bold uppercase tracking-wide text-text-primary ${
              gone ? GONE_CLASS : ""
            }`}
          >
            {character.name}
          </Link>
          {character.tagline && (
            <div className="truncate text-[0.6875rem] uppercase tracking-wider text-text-secondary">
              {character.tagline}
            </div>
          )}
          {player && <div className="font-display text-[0.875rem] leading-tight text-text-tertiary">{byPlayer}</div>}
        </div>
        {/* GIF des Charakters: so hoch wie der Avatar */}
        {gif && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gif} alt="" loading="lazy" draggable={false} className="max-h-14 max-w-[30%] shrink-0 rounded-md" />
        )}
      </div>

      {/* ab md: große Karte neben dem Post */}
      <div className="hidden w-[280px] shrink-0 [container-type:inline-size] md:block">
        <div className="group/ava relative aspect-[600/502] w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
          <Link href={href} className="block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterImage(character)}
              alt={character.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Bio-Overlay beim Hover – langer Text lässt sich darin scrollen */}
            {character.bio && (
              <div className="on-dark absolute inset-0 flex flex-col overflow-y-auto bg-black/90 px-5 py-4 text-center opacity-0 transition-opacity duration-200 group-hover/ava:opacity-100">
                <div className="my-auto">
                  <div className="mb-2 text-[0.875rem] font-semibold uppercase tracking-wider text-text-primary">
                    {[capFirst(character.role), age != null ? `${age}` : null].filter(Boolean).join(" · ")}
                  </div>
                  <RichText html={character.bio} className="text-[0.875rem] leading-relaxed text-text-primary/90" />
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* GIF des Charakters: höchstens so breit wie der Avatar und halb so hoch */}
        {gif && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gif}
            alt=""
            loading="lazy"
            draggable={false}
            className="mx-auto mt-2 block max-h-[calc(100cqw*251/600)] max-w-full rounded-md"
          />
        )}

        {/* Name – führt wie das Bild aufs Profil. Überall gleich groß; die Karte ist
            so breit, dass ein langer Name wie „Reece Logan Henderson“ in eine Zeile passt. */}
        <Link
          href={href}
          title={gone ? "Charakter gelöscht" : undefined}
          className={`mt-3 block text-center font-serif text-[1.125rem] font-bold uppercase tracking-wide text-text-primary hover:text-accent ${
            gone ? GONE_CLASS : ""
          }`}
        >
          {character.name}
        </Link>

        {/* Tagline */}
        {character.tagline && (
          <div className="mt-1.5 flex justify-center">
            <span className="rounded-full border border-border-subtle bg-white/[0.03] px-3 py-0.5 text-[0.6875rem] uppercase tracking-wider text-text-secondary">
              {character.tagline}
            </span>
          </div>
        )}

        {/* by player */}
        {player && <div className="mt-1.5 text-center font-display text-[1rem] text-text-tertiary">{byPlayer}</div>}
      </div>
    </>
  );
}
