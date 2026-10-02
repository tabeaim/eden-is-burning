"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";

// Teilnehmende Charaktere per Tippen suchen und hinzufügen (statt langer Liste).
// Reihenfolge der Auswahl = Schreib-Reihenfolge.
export function CharacterPicker({
  characters,
  selected,
  onChange,
  myCharIds,
}: {
  characters: Character[];
  selected: string[];
  onChange: (next: string[]) => void;
  myCharIds?: Set<string>;
}) {
  const [q, setQ] = useState("");
  const selectedChars = selected
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean) as Character[];
  const query = q.trim().toLowerCase();
  const suggestions = query
    ? characters
        .filter(
          (c) => !selected.includes(c.id) && c.name.toLowerCase().includes(query),
        )
        .slice(0, 6)
    : [];

  function add(id: string) {
    onChange([...selected, id]);
    setQ("");
  }
  function remove(id: string) {
    onChange(selected.filter((x) => x !== id));
  }

  return (
    <div>
      {selectedChars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedChars.map((c, i) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] pl-1 pr-2 py-0.5 text-[0.8125rem] text-text-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.faceclaim_image_url ?? ""}
                alt={c.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-text-tertiary">#{i + 1}</span>
              {c.name}
              <button
                type="button"
                onClick={() => remove(c.id)}
                title="Entfernen"
                className="ml-0.5 text-text-tertiary hover:text-red-400"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Charakter suchen und hinzufügen…"
          className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border-subtle bg-bg-surface-2 p-1 shadow-xl">
            {suggestions.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => add(c.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.875rem] text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.faceclaim_image_url ?? ""}
                  alt={c.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1 truncate">
                  {c.name}{" "}
                  <span className="text-text-tertiary">
                    {c.role}
                    {myCharIds?.has(c.id) ? " · du" : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
