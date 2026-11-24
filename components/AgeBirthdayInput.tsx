"use client";

import { useState } from "react";
import { DEFAULT_AGE_DATE, ageAt, birthdateFrom } from "@/lib/characters";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Alter + Geburtstag (Tag und Monat, ohne Jahr). Das Geburtsjahr wird daraus
// berechnet: das Alter gilt am Stichtag `at` (neueste Szene des Charakters, sonst
// der feste Stichtag) – so steht im Profil genau das eingetippte Alter.
// Gespeichert wird weiter ein volles Geburtsdatum (`birthdate`); ohne
// Geburtstag bleibt nur die Alterszahl (`age`).
export function AgeBirthdayInput({
  birthdate,
  age,
  at = DEFAULT_AGE_DATE,
  onChange,
  field,
  highlightBirthday = false,
}: {
  birthdate: string | null | undefined;
  age: number | null | undefined;
  at?: string;
  onChange: (birthdate: string | null, age: number | null) => void;
  field: string; // Klassen der Eingabefelder
  highlightBirthday?: boolean; // Geburtstag fehlt noch (importierter Charakter)
}) {
  const m = birthdate ? /^\d{4}-(\d{2})-(\d{2})/.exec(birthdate) : null;
  const [ageText, setAgeText] = useState(() => {
    const a = birthdate ? ageAt({ age: age ?? null, profile: { birthdate } }, at) : age;
    return a != null ? String(a) : "";
  });
  const [month, setMonth] = useState(m ? parseInt(m[1], 10) : 0);
  const [day, setDay] = useState(m ? parseInt(m[2], 10) : 0);

  function update(next: { ageText?: string; month?: number; day?: number }) {
    const a = next.ageText ?? ageText;
    const mo = next.month ?? month;
    let d = next.day ?? day;
    if (mo && d > DAYS_IN[mo - 1]) d = DAYS_IN[mo - 1];
    setAgeText(a);
    setMonth(mo);
    setDay(d);
    const n = /^\d{1,3}$/.test(a.trim()) ? parseInt(a, 10) : null;
    const iso = n != null && mo && d ? birthdateFrom(n, mo, d, at) : null;
    onChange(iso, n);
  }

  const ring = highlightBirthday ? "ring-2 ring-accent/70" : "";
  return (
    <div className="flex min-w-0 gap-2">
      <input
        inputMode="numeric"
        value={ageText}
        onChange={(e) => update({ ageText: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        placeholder="Alter"
        aria-label="Alter"
        className={`${field} !w-16 shrink-0 text-center`}
      />
      <select
        value={day || ""}
        onChange={(e) => update({ day: parseInt(e.target.value, 10) || 0 })}
        aria-label="Geburtstag: Tag"
        className={`${field} !w-[4.5rem] shrink-0 ${day ? "" : "text-text-tertiary"} ${ring}`}
      >
        <option value="" className="bg-bg-surface">
          Tag
        </option>
        {Array.from({ length: month ? DAYS_IN[month - 1] : 31 }, (_, i) => (
          <option key={i + 1} value={i + 1} className="bg-bg-surface text-text-primary">
            {i + 1}.
          </option>
        ))}
      </select>
      <select
        value={month || ""}
        onChange={(e) => update({ month: parseInt(e.target.value, 10) || 0 })}
        aria-label="Geburtstag: Monat"
        className={`${field} !w-auto min-w-0 flex-1 ${month ? "" : "text-text-tertiary"} ${ring}`}
      >
        <option value="" className="bg-bg-surface">
          Monat
        </option>
        {MONTHS_DE.map((name, i) => (
          <option key={name} value={i + 1} className="bg-bg-surface text-text-primary">
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
