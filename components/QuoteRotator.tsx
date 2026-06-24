"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";

// Wechselnde Szenenzitate (wie "ALLE SZENENZITATE" im Forum-Header)
export function QuoteRotator() {
  const { quotes, character, scenes } = useStore();
  const [idx, setIdx] = useState(0);

  // Stabile, gemischte Reihenfolge
  const order = useMemo(
    () => quotes.map((_, i) => i).sort(() => Math.random() - 0.5),
    [quotes.length],
  );

  useEffect(() => {
    if (quotes.length <= 1) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % quotes.length),
      7000,
    );
    return () => clearInterval(t);
  }, [quotes.length]);

  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-surface px-6 py-8 text-center text-[13px] text-text-tertiary">
        Noch keine Zitate gehighlightet. Markiere in einer Szene eine Textstelle
        und klicke auf das Zitat-Symbol.
      </div>
    );
  }

  const q = quotes[order[idx % order.length] ?? 0];
  const c = character(q.character_id);
  const scene = scenes.find((s) => s.id === q.scene_id);

  return (
    <div className="relative rounded-xl border border-border-subtle bg-bg-surface overflow-hidden">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(80% 120% at 0% 0%, rgba(232,154,60,0.10), transparent 55%)",
        }}
      />
      <div className="relative px-6 py-7 text-center">
        <span className="text-accent text-2xl leading-none font-serif">“</span>
        <blockquote
          key={q.id}
          className="prose-serif !text-center !text-[15px] text-text-primary mx-auto max-w-xl mt-1 animate-[fadein_0.5s_ease]"
        >
          {q.text}
        </blockquote>
        <div className="mt-3 text-[12px] text-text-secondary">
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
        {quotes.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {quotes.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-1 rounded-full transition-colors ${
                  i === idx % quotes.length ? "bg-accent" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
