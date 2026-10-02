"use client";

import { useEffect, useRef, useState } from "react";
import { formatInplayDate } from "@/lib/format";
import { Icon } from "./Icon";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Ohne gewähltes Datum öffnet der Kalender im Inplay-Jahr.
const DEFAULT_YEAR = 2021;

const pad = (n: number) => String(n).padStart(2, "0");

// Datumsfeld mit kleinem Kalender zum Aufklappen. `value` ist ein ISO-Datum
// ("2021-11-22") oder leer. Monat per Pfeile/Auswahl, Jahr frei eintippbar (für
// Rückblenden und AUs).
export function DatePicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: DEFAULT_YEAR, m: new Date().getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    // beim Öffnen zum gewählten Datum springen
    if (!open && valid) {
      setView({ y: parseInt(value.slice(0, 4), 10), m: parseInt(value.slice(5, 7), 10) - 1 });
    }
    setOpen((o) => !o);
  }

  function step(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Montag zuerst
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const iso = (d: number) => `${String(view.y).padStart(4, "0")}-${pad(view.m + 1)}-${pad(d)}`;

  const navBtn =
    "rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-left text-[0.875rem] outline-none focus:border-white/20"
      >
        <span className={valid ? "text-text-primary" : "text-text-tertiary"}>
          {valid ? formatInplayDate(value) : "Datum wählen"}
        </span>
        <Icon name="calendar" size={15} className="shrink-0 text-text-tertiary" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Datum wählen"
          className="absolute z-30 mt-1 w-[17rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-bg-surface-2 p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} aria-label="Voriger Monat" className={navBtn}>
              <Icon name="chevron-right" size={13} className="rotate-180" />
            </button>
            <select
              value={view.m}
              onChange={(e) => setView((v) => ({ ...v, m: parseInt(e.target.value, 10) }))}
              aria-label="Monat"
              className="min-w-0 flex-1 bg-bg-primary border border-border-subtle rounded-md px-1.5 py-1 text-[0.8125rem] text-text-primary outline-none"
            >
              {MONTHS_DE.map((name, i) => (
                <option key={name} value={i} className="bg-bg-surface">
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={view.y}
              min={1}
              max={9999}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                if (y >= 1 && y <= 9999) setView((v) => ({ ...v, y }));
              }}
              aria-label="Jahr"
              className="w-[4.5rem] bg-bg-primary border border-border-subtle rounded-md px-1.5 py-1 text-[0.8125rem] text-text-primary outline-none"
            />
            <button type="button" onClick={() => step(1)} aria-label="Nächster Monat" className={navBtn}>
              <Icon name="chevron-right" size={13} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[0.75rem] text-text-tertiary">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(iso(d));
                    setOpen(false);
                  }}
                  className={`rounded-md py-1 text-[0.8125rem] transition-colors ${
                    valid && value === iso(d)
                      ? "bg-accent font-medium text-black"
                      : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
                  }`}
                >
                  {d}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
