"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

// Mehrfach-Auswahl-Dropdown mit Checkboxen. Mit `single` nur eine Auswahl
// (runde Marker, die Liste schließt nach dem Klick, die Taste zeigt die Wahl);
// das Umschalten übernimmt weiter `onToggle`.
export function MultiSelect({
  label,
  icon,
  options,
  selected,
  onToggle,
  onClear,
  single = false,
}: {
  label: string;
  icon?: IconName; // optionales Icon vor dem Label
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  single?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Liegt die Taste weit rechts, klappt die Liste nach links auf (sonst würde der
  // Bildschirmrand sie abschneiden)
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          const left = ref.current?.getBoundingClientRect().left ?? 0;
          setAlignRight(left + 224 > window.innerWidth - 8);
          setOpen((o) => !o);
        }}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
          selected.length > 0
            ? "border-accent/50 bg-accent-soft text-text-primary"
            : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
        }`}
      >
        {icon && <Icon name={icon} size={14} />}
        {single && selected.length === 1 ? (
          <span className="max-w-[12rem] truncate">
            {label}: {options.find((o) => o.value === selected[0])?.label ?? selected[0]}
          </span>
        ) : (
          label
        )}
        {!single && selected.length > 0 && (
          <span className="rounded-full bg-accent text-black px-1.5 text-[0.8125rem] font-medium">
            {selected.length}
          </span>
        )}
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
          <Icon name="arrow-right" size={11} />
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-1 w-56 max-w-[calc(100vw-1rem)] max-h-72 overflow-auto ${
            alignRight ? "right-0" : "left-0"
          } rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 shadow-xl`}
        >
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => {
                  onToggle(o.value);
                  if (single) setOpen(false);
                }}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-text-secondary hover:bg-white/[0.04]"
              >
                <span
                  className={`flex items-center justify-center w-3.5 h-3.5 ${single ? "rounded-full" : "rounded"} border text-[0.75rem] ${
                    on
                      ? "bg-accent border-accent text-black"
                      : "border-border-strong"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className={on ? "text-text-primary" : ""}>{o.label}</span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <button
              onClick={() => {
                onClear();
                if (single) setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Auswahl leeren
            </button>
          )}
        </div>
      )}
    </div>
  );
}
