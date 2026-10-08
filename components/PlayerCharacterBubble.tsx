"use client";

import { playerImage } from "@/lib/avatar";
import { characterImage } from "@/lib/avatar";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Character, Player } from "@/lib/types";

// Spieler-Bubble, die zu einzelnen Charakteren ausfächert.
// Tokens: "player:<id>" | "char:<id>". Geteilt von Szenen-Übersicht und Timeline.
// Klick auf den Namen schaltet alle Charaktere der Person an – und, sobald
// irgendetwas von ihr gewählt ist, wieder komplett aus.
export function PlayerCharacterBubble({
  player,
  chars,
  tokens,
  setTokens,
}: {
  player: Player;
  chars: Character[];
  tokens: string[];
  setTokens: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const playerOn = tokens.includes(`player:${player.id}`);
  const selectedCharCount = chars.filter((c) =>
    tokens.includes(`char:${c.id}`),
  ).length;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = playerOn || selectedCharCount > 0;

  const playerToken = `player:${player.id}`;
  const ownTokens = new Set([playerToken, ...chars.map((c) => `char:${c.id}`)]);
  const withoutOwn = tokens.filter((t) => !ownTokens.has(t));

  // Name: alles von dieser Person an bzw. wieder aus
  function onTogglePlayer() {
    setTokens(active ? withoutOwn : [...withoutOwn, playerToken]);
  }
  // Einzelner Charakter: an/aus; war „alle" gewählt, wird auf diesen einen eingegrenzt
  function onToggleChar(id: string) {
    const token = `char:${id}`;
    if (playerOn) setTokens([...withoutOwn, token]);
    else if (tokens.includes(token)) setTokens(tokens.filter((t) => t !== token));
    else setTokens([...tokens, token]);
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-full border pl-1 pr-1 py-0.5 transition-colors ${
          active
            ? "border-accent/60 bg-accent-soft"
            : "border-border-subtle bg-bg-primary"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playerImage(player)}
          alt={player.username}
          className="w-5 h-5 rounded-full object-cover"
        />
        <button
          onClick={onTogglePlayer}
          title="Ganzen Spieler (alle Charaktere) wählen"
          className={`px-2 text-[0.8125rem] ${
            playerOn ? "text-text-primary font-medium" : "text-text-secondary"
          }`}
        >
          {player.username}
          {selectedCharCount > 0 && !playerOn && (
            <span className="ml-1 text-accent">·{selectedCharCount}</span>
          )}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Einzelne Charaktere wählen"
          className="px-1 text-text-tertiary hover:text-text-primary"
        >
          <span className={`inline-flex transition-transform ${open ? "rotate-90" : ""}`}>
            <Icon name="arrow-right" size={11} />
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-48 rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 shadow-xl">
          <button
            onClick={onTogglePlayer}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] hover:bg-white/[0.04]"
          >
            <span
              className={`flex items-center justify-center w-3.5 h-3.5 rounded border text-[0.75rem] ${
                playerOn ? "bg-accent border-accent text-black" : "border-border-strong"
              }`}
            >
              {playerOn ? "✓" : ""}
            </span>
            <span className={playerOn ? "text-text-primary" : "text-text-secondary"}>
              Alle von {player.username}
            </span>
          </button>
          <div className="my-1 border-t border-border-subtle" />
          {chars.map((c) => {
            const on = playerOn || tokens.includes(`char:${c.id}`);
            return (
              <button
                key={c.id}
                onClick={() => onToggleChar(c.id)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] hover:bg-white/[0.04]"
              >
                <span
                  className={`flex items-center justify-center w-3.5 h-3.5 rounded border text-[0.75rem] ${
                    on ? "bg-accent border-accent text-black" : "border-border-strong"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={characterImage(c)}
                  alt={c.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className={on ? "text-text-primary" : "text-text-secondary"}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
