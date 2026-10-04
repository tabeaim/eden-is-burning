"use client";

import type { Scene } from "@/lib/types";
import { SuggestInput } from "./SuggestInput";

export { AU_UNNAMED } from "@/lib/plots";

// Alle bisher vergebenen AU-Namen, alphabetisch.
export function auNames(scenes: Scene[]): string[] {
  const set = new Set<string>();
  for (const s of scenes) if (s.au && s.au_name) set.add(s.au_name);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
}

// Name des Alternate Universe: beim Tippen werden vorhandene AUs vorgeschlagen;
// gibt es den Namen noch nicht, entsteht ein neues.
export function AuNameField({
  value,
  onChange,
  names,
}: {
  value: string;
  onChange: (v: string) => void;
  names: string[];
}) {
  const query = value.trim().toLowerCase();
  const exact = names.find((n) => n.toLowerCase() === query);
  const matches = names.filter((n) => !query || n.toLowerCase().includes(query)).slice(0, 8);
  return (
    <div className="text-[0.875rem] text-text-secondary">
      Name des AUs
      <SuggestInput
        className="mt-1"
        value={value}
        onChange={onChange}
        placeholder="AU eintippen, z. B. Noir 1947"
        suggestions={matches.map((n) => ({ key: n, label: n }))}
        onPick={onChange}
        createLabel={query && !exact ? `Neues AU „${value.trim()}“ erstellen` : null}
      />
      {query && (
        <div className="mt-1 text-[0.8125rem] text-text-tertiary">
          {exact ? "Bestehendes AU" : <span className="text-accent">Neues AU</span>}
        </div>
      )}
    </div>
  );
}
