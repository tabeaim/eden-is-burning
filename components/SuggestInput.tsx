"use client";

import { useEffect, useRef, useState } from "react";

export interface Suggestion {
  key: string;
  label: string;
  hint?: string; // grau dahinter, z.B. der Bezirk
}

// Textfeld mit Vorschlägen beim Tippen (siehe DESIGN.md): Vorhandenes wählen oder,
// wenn es das Getippte noch nicht gibt, neu anlegen (`createLabel`).
export function SuggestInput({
  value,
  onChange,
  suggestions,
  onPick,
  createLabel,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (text: string) => void;
  suggestions: Suggestion[];
  onPick: (key: string) => void;
  createLabel?: string | null; // z.B. „Neuen Ort „X" erstellen" – nur wenn neu
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const item =
    "flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-[0.875rem] hover:bg-white/[0.05]";
  const show = open && (suggestions.length > 0 || !!createLabel);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
      />
      {show && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border-subtle bg-bg-surface-2 p-1 shadow-xl">
          {suggestions.map((s) => (
            <button
              type="button"
              key={s.key}
              onClick={() => {
                onPick(s.key);
                setOpen(false);
              }}
              className={`${item} text-text-secondary hover:text-text-primary`}
            >
              <span className="min-w-0 truncate">{s.label}</span>
              {s.hint && <span className="shrink-0 text-[0.8125rem] text-text-tertiary">{s.hint}</span>}
            </button>
          ))}
          {createLabel && (
            <button type="button" onClick={() => setOpen(false)} className={`${item} text-accent`}>
              + {createLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
