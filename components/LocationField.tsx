"use client";

import { useStore } from "@/lib/store";
import { PLACE_AREAS, areaName } from "@/lib/world";
import { PHONE_AREA } from "@/lib/phone";
import { SuggestInput } from "./SuggestInput";
import { LocationCategoryPicker } from "./LocationCategoryPicker";

// Ort einer Szene: beim Tippen werden vorhandene Orte vorgeschlagen (die Gegend
// kommt vom Ort). Gibt es den Namen noch nicht, wird ein neuer Ort angelegt – dann
// fragt das Feld Gegend, Kategorie und Beschreibung ab (der Name steht schon im Feld). Bleibt
// der Name leer, spielt die Szene nur in einer Gegend; dann wird nur sie abgefragt
// – außer mit `nameRequired` (neue Szenen brauchen einen Ortsnamen).
export function LocationField({
  area,
  name,
  onChange,
  description,
  onDescription,
  category,
  onCategory,
  nameRequired = false,
}: {
  area: string;
  name: string;
  onChange: (area: string, name: string) => void;
  description: string; // nur für neue Orte
  onDescription: (text: string) => void;
  category: string | null; // nur für neue Orte
  onCategory: (category: string) => void;
  nameRequired?: boolean;
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
          // getippter Name passt genau auf einen vorhandenen Ort: dessen Gegend übernehmen
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
      {!query && !nameRequired && (
        <label className="mt-2 block text-[0.8125rem] text-text-secondary">
          Gegend <span className="text-accent">*</span>{" "}
          <span className="text-text-tertiary">– ohne Ortsnamen spielt die Szene nur dort</span>
          <AreaSelect area={area} onChange={(a) => onChange(a, name)} />
        </label>
      )}
      {isNew && (
        <div className="mt-2 flex flex-col gap-3 rounded-md border border-border-subtle p-3">
          <div className="text-[0.8125rem]">
            <span className="text-accent">Neuer Ort</span>{" "}
            <span className="text-text-tertiary">– wird mit dieser Szene angelegt</span>
          </div>
          <label className="text-[0.8125rem] text-text-secondary">
            Gegend <span className="text-accent">*</span>
            <AreaSelect area={area} onChange={(a) => onChange(a, name)} />
          </label>
          <div className="text-[0.8125rem] text-text-secondary">
            Kategorie
            <div className="mt-1">
              <LocationCategoryPicker value={category} name={name} onChange={onCategory} />
            </div>
          </div>
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

// Gegend-Auswahl: Stadtteile plus Industrial District, „Eden (ohne Bezirk)" und
// „Rest der Welt"
function AreaSelect({ area, onChange }: { area: string; onChange: (area: string) => void }) {
  return (
    <select
      value={PLACE_AREAS.includes(area) ? area : ""}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 ${field}`}
    >
      <option value="" disabled className="bg-bg-surface">
        Gegend wählen
      </option>
      {PLACE_AREAS.map((k) => (
        <option key={k} value={k} className="bg-bg-surface">
          {areaName(k)}
        </option>
      ))}
    </select>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Ist die Ortsangabe vollständig? Die Gegend ist Pflicht (bestehende Orte bringen
// sie mit). Der Ortsname ist nur beim Erstellen Pflicht (`name` übergeben) – beim
// Bearbeiten nicht, damit Szenen ohne Ortsnamen (Altbestand) speicherbar bleiben.
export function locationComplete(area: string, name?: string): boolean {
  return !!area && area !== PHONE_AREA && (name === undefined || !!name.trim());
}
