"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/types";
import { characterImage } from "@/lib/avatar";
import { tierLabel } from "@/lib/characters";
import { Icon } from "./Icon";

// Charakter-Auswahl als Aufklappliste im Stil der Plattform (statt des
// Browser-eigenen <select>): Avatar + Name, optional ein Hinweis je Eintrag.
export function CharacterSelect({
  characters,
  value,
  onChange,
  hint,
  search,
}: {
  characters: Character[];
  value: string | null;
  onChange: (id: string) => void;
  hint?: (c: Character) => string | null;
  // Weitere Charaktere, die nicht in der Liste stehen, aber über ein Suchfeld
  // wählbar sind (z.B. „SC oder Statist*in …")
  search?: { placeholder: string; characters: Character[] };
}) {
  const [open, setOpen] = useState(false);
  // nach oben aufklappen, wenn unter dem Feld zu wenig Platz ist (sonst
  // schneidet der Seitenrand die Liste ab)
  const [up, setUp] = useState(false);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const found = search
    ? search.characters
        .filter((c) => !query || c.name.toLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
        .slice(0, 8)
    : [];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current =
    [...characters, ...(search?.characters ?? [])].find((c) => c.id === value) ?? characters[0];
  const avatar = (c: Character, size: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={characterImage(c)} alt="" className={`${size} shrink-0 rounded-full object-cover bg-bg-primary`} />
  );
  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const below = window.innerHeight - box.bottom;
          setUp(below < 320 && box.top > below);
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex max-w-full items-center gap-2 rounded-md border border-border-subtle bg-bg-primary py-1.5 pl-1.5 pr-2.5 text-[0.875rem] text-text-primary hover:border-white/25"
      >
        {avatar(current, "h-7 w-7")}
        <span className="min-w-0 truncate">{current.name}</span>
        <Icon
          name="chevron-right"
          size={14}
          className={`shrink-0 text-text-tertiary transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute left-0 z-30 ${up ? "bottom-full mb-1" : "mt-1"} max-h-72 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface-2 p-1 shadow-2xl shadow-black/70`}
        >
          {/* zuerst die eigene Liste, darunter das Suchfeld für weitere (SC/Statist*in) */}
          {characters.map((c) => {
            const note = tierLabel(c) ?? hint?.(c);
            return (
              <button
                type="button"
                key={c.id}
                role="option"
                aria-selected={c.id === current.id}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setQ("");
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.875rem] hover:bg-white/[0.06] ${
                  c.id === current.id ? "text-accent" : "text-text-primary"
                }`}
              >
                {avatar(c, "h-6 w-6")}
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {note && <span className="shrink-0 text-[0.75rem] text-text-tertiary">{note}</span>}
              </button>
            );
          })}
          {search && (
            <div className="mt-1 border-t border-border-subtle pt-1.5">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={search.placeholder}
                className="w-full rounded-md border border-border-subtle bg-bg-primary px-2 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
              />
              {query &&
                found.map((c) => {
                  const note = tierLabel(c) ?? hint?.(c);
                  return (
              <button
                      type="button"
                      key={c.id}
                      role="option"
                      aria-selected={c.id === current.id}
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.875rem] hover:bg-white/[0.06] ${
                        c.id === current.id ? "text-accent" : "text-text-primary"
                      }`}
                    >
                      {avatar(c, "h-6 w-6")}
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {note && <span className="shrink-0 text-[0.75rem] text-text-tertiary">{note}</span>}
                    </button>
                  );
                })}
              {query && found.length === 0 && (
                <div className="px-2 py-2 text-[0.8125rem] text-text-tertiary">Niemand gefunden.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
