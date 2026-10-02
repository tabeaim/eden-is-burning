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

  // Pfeile links und rechts dicht am Text, Anführungszeichen links vor dem Zitat,
  // Text linksbündig und etwas breiter.
  return (
    <div className="mx-auto flex max-w-4xl items-center gap-2 py-4 sm:gap-4">
      {quotes.length > 1 && (
        <button onClick={() => go(-1)} title="Vorheriges Zitat" className={arrow}>
          <Icon name="arrow-right" size={18} className="rotate-180" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="shrink-0 font-display text-[3.375rem] leading-[0.8] text-accent">“</span>
        <div className="min-w-0">
          <blockquote
            key={q.id}
            className="prose-serif !text-left !text-[1rem] text-text-primary animate-[fadein_0.5s_ease]"
          >
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
      </div>

      {quotes.length > 1 && (
        <button onClick={() => go(1)} title="Nächstes Zitat" className={arrow}>
          <Icon name="arrow-right" size={18} />
        </button>
      )}
    </div>
  );
}
