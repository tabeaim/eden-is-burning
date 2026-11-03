"use client";

import { useState } from "react";

// Aufklappbarer Abschnitt in Formularen (z.B. Charakter-Einstellungen): Überschrift
// als Zeile mit Pfeil. `forceOpen` klappt ihn auf (z.B. wenn darin eine
// Pflichtangabe fehlt oder gezielt hingesprungen wurde) – zuklappen lässt er sich
// trotzdem; er öffnet sich erst wieder, wenn `forceOpen` erneut auf true springt.
export function Collapsible({
  title,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  const [wasForced, setWasForced] = useState(forceOpen);
  if (forceOpen !== wasForced) {
    setWasForced(forceOpen);
    if (forceOpen) setOpen(true);
  }
  return (
    <div className="rounded-lg border border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[0.8125rem] font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary sm:px-4"
      >
        {title}
        <span className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="flex flex-col gap-4 border-t border-border-subtle p-3 sm:p-4">{children}</div>}
    </div>
  );
}
