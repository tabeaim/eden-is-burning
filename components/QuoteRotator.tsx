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
      <div className="px-4 py-8 text-center text-[0.875rem] text-text-tertiary">
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

  const arrow =
    "shrink-0 rounded p-1 text-text-tertiary hover:text-accent transition-colors";

  // Linksbündig über die volle Breite: Pfeil am linken Rand, direkt daneben das
  // Zitat (mit deutschem Anführungszeichen unten), zweiter Pfeil am rechten Rand.
  return (
    <div className="flex items-center gap-2 py-4 sm:gap-3">
      {quotes.length > 1 && (
        <button onClick={() => go(-1)} title="Vorheriges Zitat" className={`-ml-1 ${arrow}`}>
          <Icon name="arrow-right" size={18} className="rotate-180" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <blockquote
          key={q.id}
          className="prose-serif !text-left !text-[1rem] text-text-primary animate-[fadein_0.5s_ease]"
        >
          {/* großes „ links, über zwei Textzeilen (wie eine Initiale) */}
          <span aria-hidden className="float-left mr-2 h-[3.6rem] text-[3.6rem] leading-none text-accent">
            „
          </span>
          {q.text}
        </blockquote>
        <div className="mt-2 text-[0.875rem] text-text-secondary">
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

      {quotes.length > 1 && (
        <button onClick={() => go(1)} title="Nächstes Zitat" className={arrow}>
          <Icon name="arrow-right" size={18} />
        </button>
      )}
    </div>
  );
}
