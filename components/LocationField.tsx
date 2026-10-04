"use client";

import { useStore } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName } from "@/lib/world";
import { PHONE_AREA } from "@/lib/phone";
import { SuggestInput } from "./SuggestInput";

// Ort einer Szene: beim Tippen werden vorhandene Orte vorgeschlagen (der Bezirk
// kommt vom Ort). Gibt es den Namen noch nicht, wird ein neuer Ort angelegt - nur
// dann fragt das Feld nach dem Bezirk, damit der Ort auf der Karte landet.
export function LocationField({
  area,
  name,
  onChange,
}: {
  area: string;
  name: string;
  onChange: (area: string, name: string) => void;
}) {
  const { locations } = useStore();
  const places = locations.filter((l) => l.area !== PHONE_AREA);
  const query = name.trim().toLowerCase();
  const sameName = places.filter((l) => l.name.toLowerCase() === query);
  const existing = sameName.find((l) => l.area === area);
  const isNew = !!query && !existing;
  const matches = places
    .filter((l) => !query || l.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .slice(0, 8);

  return (
    <div>
      <SuggestInput
        value={name}
        placeholder="Ort eintippen ..."
        onChange={(text) => {
          // getippter Name passt genau auf einen vorhandenen Ort: dessen Bezirk übernehmen
          const hit = places.filter((l) => l.name.toLowerCase() === text.trim().toLowerCase());
          onChange(hit.find((l) => l.area === area)?.area ?? hit[0]?.area ?? area, text);
        }}
        suggestions={matches.map((l) => ({ key: l.id, label: l.name, hint: areaName(l.area) }))}
        onPick={(id) => {
          const l = places.find((x) => x.id === id);
          if (l) onChange(l.area, l.name);
        }}
        createLabel={isNew && sameName.length === 0 ? `Neuen Ort „${name.trim()}“ erstellen` : null}
      />
      {existing && (
        <div className="mt-1 text-[0.8125rem] text-text-tertiary">
          Bestehender Ort · {areaName(existing.area)}
        </div>
      )}
      {isNew && (
        <label className="mt-2 flex flex-wrap items-center gap-2 text-[0.8125rem] text-text-secondary">
          <span className="text-accent">Neuer Ort</span> - in welchem Bezirk liegt er?
          <select
            value={AREA_ORDER.includes(area as (typeof AREA_ORDER)[number]) ? area : ""}
            onChange={(e) => onChange(e.target.value, name)}
            className="bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.8125rem] text-text-primary outline-none focus:border-white/20"
          >
            <option value="" disabled className="bg-bg-surface">
              Bezirk wählen
            </option>
            {AREA_ORDER.map((k) => (
              <option key={k} value={k} className="bg-bg-surface">
                {AREAS[k].name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

// Ist die Ortsangabe vollständig? (Name und - bei neuen Orten - ein Bezirk)
export function locationComplete(area: string, name: string): boolean {
  return !!name.trim() && !!area && area !== PHONE_AREA;
}
