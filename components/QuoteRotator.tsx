"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// Wechselnde Szenenzitate (wie "ALLE SZENENZITATE" im Forum-Header)
export function QuoteRotator() {
  const { quotes, character, scenes } = useStore();
  const [idx, setIdx] = useState(0);

  // Stabile, gemischte Reihenfolge
  const order = useMemo(
    () => quotes.map((_, i) => i).sort(() => Math.random() - 0.5),
    [quotes.length],
  );

  if (quotes.length === 0) {
    return (
      <div className="text-left text-[0.875rem] text-text-tertiary">
        Noch keine Zitate gehighlightet. Markiere in einer Szene eine Textstelle
        und klicke auf das Zitat-Symbol.
      </div>
    );
  }

  const go = (dir: number) =>
    setIdx((i) => (i + dir + quotes.length) % quotes.length);

  const q = quotes[order[idx % order.length] ?? 0];
  const c = character(q.character_id);
  const scene = scenes.find((s) => s.id === q.scene_id);

  // Wie das Zitat im Profil: großes „ in der Zeile, der Text fließt um den Knopf
  // für ein anderes Zitat rechts oben; darunter die Quelle.
  return (
    <div className="flow-root">
      {quotes.length > 1 && (
        <button
          onClick={() => go(1)}
          title="Anderes Zitat"
          aria-label="Anderes Zitat"
          className="float-right mb-2 ml-4 rounded p-1 text-text-tertiary transition-colors hover:text-accent"
        >
          <Icon name="refresh" size={18} />
        </button>
      )}
      <div key={q.id} className="animate-[fadein_0.5s_ease]">
        <p className="text-left text-[1.125rem] leading-snug text-text-primary">
          <span aria-hidden className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
          {q.text}
        </p>
        <div className="mt-1.5 text-[0.875rem] text-text-secondary">
          {c && (
            <Link href={`/charaktere/${c.id}`} className="text-text-primary hover:text-accent">
              {c.name}
            </Link>
          )}
          {scene && (
            <>
              {" "}in{" "}
              <Link href={`/szenen/${scene.id}`} className="italic hover:text-accent">
                {scene.title}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
