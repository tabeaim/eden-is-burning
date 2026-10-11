"use client";

import { useState } from "react";
import type { Scene } from "@/lib/types";
import { SCENE_KINDS, sceneKind, type SceneKind } from "@/lib/chats";
import { SceneCard } from "./SceneCard";
import { compareInplay } from "@/lib/format";

type Status = "all" | "active" | "closed";
const STATUS: [Status, string][] = [
  ["all", "Alle"],
  ["active", "Aktiv"],
  ["closed", "Abgeschlossen"],
];
const KIND_PLURAL: Record<SceneKind, string> = { scene: "Szenen", call: "Anrufe", sms: "SMS" };

const pill = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
    active
      ? "bg-accent text-black font-medium"
      : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
  }`;

// Szenenliste der Profile (Charakter, Spieler*in): kompakte Karten mit einfachen
// Filtern darüber – Art (Szenen · Anrufe · SMS, mehrere wählbar; nichts gewählt =
// alle) und Status (Alle · Aktiv · Abgeschlossen, immer da); sortiert nach
// In-Game-Datum, das Neueste zuerst. Die Art erscheint nur,
// wenn es mehr als eine gibt.
export function SceneFilterList({ scenes, className }: { scenes: Scene[]; className: string }) {
  const [kinds, setKinds] = useState<SceneKind[]>([]);
  const [status, setStatus] = useState<Status>("all");
  const present = SCENE_KINDS.filter((k) => scenes.some((s) => sceneKind(s) === k.value));
  // Das Aktuellste zuerst (In-Game: Datum, dann Tageszeit) – die beiden neuesten
  // stehen so in der ersten Zeile nebeneinander
  const shown = scenes
    .filter(
      (s) =>
        (kinds.length === 0 || kinds.includes(sceneKind(s))) && (status === "all" || s.status === status),
    )
    .sort((a, b) => compareInplay(b, a));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS.map(([key, label]) => (
              <button key={key} aria-pressed={status === key} onClick={() => setStatus(key)} className={pill(status === key)}>
                {label}
              </button>
            ))}
          </div>
          {present.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {present.map((k) => (
                <button
                  key={k.value}
                  aria-pressed={kinds.includes(k.value)}
                  onClick={() =>
                    setKinds((cur) =>
                      cur.includes(k.value) ? cur.filter((x) => x !== k.value) : [...cur, k.value],
                    )
                  }
                  className={pill(kinds.includes(k.value))}
                >
                  {KIND_PLURAL[k.value]}
                </button>
              ))}
            </div>
          )}
      </div>
      {shown.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">Keine Szenen für diese Filter.</p>
      ) : (
        <div className={className}>
          {shown.map((s) => (
            <SceneCard key={s.id} scene={s} compact />
          ))}
        </div>
      )}
    </>
  );
}
