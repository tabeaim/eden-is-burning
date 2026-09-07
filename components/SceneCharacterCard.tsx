"use client";

import Link from "next/link";
import { useState } from "react";
import type { Character, Player } from "@/lib/types";
import { Icon } from "./Icon";

// Große Charakterkarte für die Szenenansicht. Bildformat 600×502; die
// Beschreibung (Bio) erscheint als Overlay beim Hovern über das Bild.
export function SceneCharacterCard({
  character,
  player,
}: {
  character: Character;
  player?: Player;
}) {
  const [showBio, setShowBio] = useState(false);

  return (
    <div className="w-[260px] max-w-full shrink-0">
      <div
        className="group relative aspect-[600/502] w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
        onMouseEnter={() => setShowBio(true)}
        onMouseLeave={() => setShowBio(false)}
      >
        <Link href={`/charaktere/${character.id}`} className="block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={character.faceclaim_image_url ?? ""}
            alt={character.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </Link>

        {/* Bio-Overlay beim Hover */}
        {character.bio && (
          <div
            className={`pointer-events-none absolute inset-0 flex flex-col justify-center bg-black/90 px-5 py-4 text-center transition-opacity duration-200 ${
              showBio ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-text-primary">
              {[character.role, character.age ? `${character.age}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <p className="text-[13px] leading-relaxed text-text-primary/90 line-clamp-[9]">
              {character.bio}
            </p>
          </div>
        )}
      </div>

      {/* Name (mit Aufklapp-Marker für die Bio) */}
      <button
        onClick={() => setShowBio((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 font-serif font-bold text-[18px] uppercase tracking-wide text-text-primary hover:text-accent"
        title="Beschreibung ein-/ausblenden"
      >
        {character.name}
        <span className={`text-[13px] transition-transform ${showBio ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {/* Tagline */}
      {character.tagline && (
        <div className="mt-1.5 flex justify-center">
          <span className="rounded-full border border-border-subtle bg-white/[0.03] px-3 py-0.5 text-[12px] uppercase tracking-wider text-text-secondary">
            {character.tagline}
          </span>
        </div>
      )}

      {/* Social-Icons */}
      <div className="mt-2.5 flex items-center justify-center gap-3 text-text-tertiary">
        {character.pinterest_url && (
          <a
            href={character.pinterest_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent"
            title="Pinterest"
          >
            <Icon name="pinterest" size={16} />
          </a>
        )}
        <span title="Social Media (folgt)" className="hover:text-accent cursor-pointer">
          <Icon name="camera" size={16} />
        </span>
        <span title="Spotify (folgt)" className="hover:text-accent cursor-pointer">
          <Icon name="spotify" size={16} />
        </span>
      </div>

      {/* by player */}
      {player && (
        <div className="mt-1.5 text-center text-[13px] italic text-text-tertiary">
          by{" "}
          <Link
            href={`/spieler/${player.username}`}
            className="hover:text-text-secondary"
          >
            {player.username}
          </Link>
        </div>
      )}
    </div>
  );
}
