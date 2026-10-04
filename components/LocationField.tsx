"use client";

import { useStore } from "@/lib/store";
import { AREA_ORDER, AREAS, areaName } from "@/lib/world";
import { PHONE_AREA } from "@/lib/phone";
import { SuggestInput } from "./SuggestInput";

// Ort einer Szene: beim Tippen werden vorhandene Orte vorgeschlagen (der Bezirk
// kommt vom Ort). Gibt es den Namen noch nicht, wird ein neuer Ort angelegt – dann
// fragt das Feld Bezirk und Beschreibung ab (der Name steht schon im Feld).
export function LocationField({
  area,
  name,
  onChange,
  description,
  onDescription,
}: {
  area: string;
  name: string;
  onChange: (area: string, name: string) => void;
  description: string; // nur für neue Orte
  onDescription: (text: string) => void;
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
        <div className="mt-2 flex flex-col gap-3 rounded-md border border-border-subtle p-3">
          <div className="text-[0.8125rem]">
            <span className="text-accent">Neuer Ort</span>{" "}
            <span className="text-text-tertiary">– wird mit dieser Szene angelegt</span>
          </div>
          <label className="text-[0.8125rem] text-text-secondary">
            Bezirk <span className="text-accent">*</span>
            <select
              value={AREA_ORDER.includes(area as (typeof AREA_ORDER)[number]) ? area : ""}
              onChange={(e) => onChange(e.target.value, name)}
              className={`mt-1 ${field}`}
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
          <label className="text-[0.8125rem] text-text-secondary">
            Beschreibung <span className="text-text-tertiary">(optional)</span>
            <textarea
              value={description}
              rows={2}
              onChange={(e) => onDescription(e.target.value)}
              placeholder="Was ist das für ein Ort?"
              className={`mt-1 resize-y ${field}`}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Ist die Ortsangabe vollständig? (Name und – bei neuen Orten – ein Bezirk)
export function locationComplete(area: string, name: string): boolean {
  return !!name.trim() && !!area && area !== PHONE_AREA;
}
