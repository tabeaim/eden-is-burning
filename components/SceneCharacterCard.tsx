"use client";

import Link from "next/link";
import { useState } from "react";
import type { Character, Player } from "@/lib/types";
import { Icon } from "./Icon";

// Charakterkarte für die Ping-Pong-Ansicht (130px breit).
export function SceneCharacterCard({
  character,
  player,
}: {
  character: Character;
  player?: Player;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative w-[130px] shrink-0"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={`/charaktere/${character.id}`} className="block">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-bg-surface border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={character.faceclaim_image_url ?? ""}
            alt={character.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient + Name-Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-8 pb-1.5 px-2">
            <div className="font-serif text-[13px] leading-tight text-white drop-shadow">
              {character.name}
            </div>
          </div>
        </div>
      </Link>

      {character.tagline && (
        <div className="mt-1.5 inline-block rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-text-secondary">
          {character.tagline}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 text-text-tertiary">
        {character.pinterest_url && (
          <a
            href={character.pinterest_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-text-primary"
            title="Pinterest"
          >
            <Icon name="pinterest" size={14} />
          </a>
        )}
        <span title="Faceclaim-Foto" className="opacity-70">
          <Icon name="photo" size={14} />
        </span>
        <span title="Nachricht" className="opacity-70">
          <Icon name="message" size={14} />
        </span>
      </div>

      {player && (
        <div className="mt-1 text-[10px] italic text-text-tertiary">
          by{" "}
          <Link
            href={`/spieler/${player.username}`}
            className="hover:text-text-secondary"
          >
            {player.username}
          </Link>
        </div>
      )}

      {/* Hover Mini-Steckbrief */}
      {hover && character.bio && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border-subtle bg-bg-surface p-3 shadow-xl">
          <div className="text-[11px] text-text-tertiary mb-1">
            {[character.role, character.age ? `${character.age}` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <p className="text-[12px] leading-relaxed text-text-secondary line-clamp-4">
            {character.bio}
          </p>
          <Link
            href={`/charaktere/${character.id}`}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-text-primary"
          >
            Zum Profil <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
