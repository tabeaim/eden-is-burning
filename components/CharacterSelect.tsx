"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/types";
import { characterImage } from "@/lib/avatar";
import { Icon } from "./Icon";

// Charakter-Auswahl als Aufklappliste im Stil der Plattform (statt des
// Browser-eigenen <select>): Avatar + Name, optional ein Hinweis je Eintrag.
export function CharacterSelect({
  characters,
  value,
  onChange,
  hint,
}: {
  characters: Character[];
  value: string | null;
  onChange: (id: string) => void;
  hint?: (c: Character) => string | null;
}) {
  const [open, setOpen] = useState(false);
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

  const current = characters.find((c) => c.id === value) ?? characters[0];
  const avatar = (c: Character, size: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={characterImage(c)} alt="" className={`${size} shrink-0 rounded-full object-cover bg-bg-primary`} />
  );
  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
          className="absolute left-0 z-30 mt-1 max-h-72 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface-2 p-1 shadow-2xl shadow-black/70"
        >
          {characters.map((c) => {
            const note = hint?.(c);
            return (
              <button
                type="button"
                key={c.id}
                role="option"
                aria-selected={c.id === current.id}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
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
        </div>
      )}
    </div>
  );
}
