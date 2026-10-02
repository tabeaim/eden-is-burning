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

  return (
    <div className="relative px-4 sm:px-8 py-4 text-center">
      {quotes.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            title="Vorheriges Zitat"
            className="absolute left-0 top-1/2 -translate-y-1/2 rotate-180 text-text-tertiary hover:text-accent transition-colors"
          >
            <Icon name="arrow-right" size={18} />
          </button>
          <button
            onClick={() => go(1)}
            title="Nächstes Zitat"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-accent transition-colors"
          >
            <Icon name="arrow-right" size={18} />
          </button>
        </>
      )}

      <span className="text-accent text-[3.375rem] leading-none font-display">“</span>
      <blockquote
        key={q.id}
        className="prose-serif !text-center !text-[1rem] text-text-primary mx-auto max-w-xl mt-1 animate-[fadein_0.5s_ease]"
      >
        {q.text}
      </blockquote>
      <div className="mt-3 text-[0.875rem] text-text-secondary">
        {c && (
          <Link
            href={`/charaktere/${c.id}`}
            className="text-text-primary hover:text-accent"
          >
            {c.name}
          </Link>
        )}
        {scene && (
          <>
            {" "}in{" "}
            <Link
              href={`/szenen/${scene.id}`}
              className="italic hover:text-accent"
            >
              {scene.title}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
