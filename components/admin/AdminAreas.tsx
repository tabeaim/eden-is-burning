"use client";

import { useStore } from "@/lib/store";
import { PLACE_AREAS, areaDefaults, areaInfo, type AreaTexts } from "@/lib/world";
import { CommitRichEditor } from "../RichEditor";
import { field, hint, label, row } from "./ui";

// Welche Felder Pflicht sind: Ohne Namen oder Beschreibung gilt wieder der Standard,
// ein leeres Preislevel bzw. „Hier wohnen" blendet die Zeile im Bezirk aus.
const REQUIRED: (keyof AreaTexts)[] = ["name", "character"];

// --- Bezirke -----------------------------------------------------------------
// Name, Beschreibung und Steckbrief der Bezirke, wie sie auf der Karte unter „Orte"
// und überall sonst als Gegend erscheinen. Gespeichert wird beim Verlassen des Felds.
export function AdminAreas() {
  const { appSettings, updateAppSettings } = useStore();
  const areas = appSettings.areas ?? {};

  function save(key: string, f: keyof AreaTexts, raw: string) {
    const base = areaDefaults(key);
    if (!base) return;
    const value = raw.trim();
    const entry = { ...areas[key] };
    if (value === base[f] || (!value && REQUIRED.includes(f))) delete entry[f];
    else entry[f] = value;
    const next = { ...areas };
    if (Object.keys(entry).length) next[key] = entry;
    else delete next[key];
    updateAppSettings({ areas: next });
  }

  function reset(key: string) {
    const next = { ...areas };
    delete next[key];
    updateAppSettings({ areas: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className={hint}>
        Name, Beschreibung und Steckbrief jedes Bezirks. Änderungen gelten sofort für alle, auf der Karte, im
        Bezirks-Panel unter „Orte“ und überall, wo die Gegend genannt wird. Leeres Preislevel oder „Hier wohnen“ blendet
        die Zeile aus. Die Bilder der Bezirke stehen unter Design.
      </p>
      {PLACE_AREAS.map((key) => {
        const info = areaInfo(key);
        if (!info) return null;
        // Felder sind unkontrolliert; der Schlüssel setzt sie nach „Standard" neu auf
        const stamp = JSON.stringify(areas[key] ?? null);
        return (
          <div key={key} className={`${row} p-3`}>
            <div className="mb-2 flex items-center justify-between gap-2 text-[0.875rem] text-text-primary">
              {info.name}
              {areas[key] && (
                <button
                  onClick={() => reset(key)}
                  title="Setzt alle Texte dieses Bezirks auf die festen Angaben zurück"
                  className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
                >
                  Standard
                </button>
              )}
            </div>
            <div key={stamp} className={`grid gap-3 sm:grid-cols-2 ${label}`}>
              <label className="sm:col-span-2">
                Name
                <input
                  defaultValue={info.name}
                  onBlur={(e) => save(key, "name", e.target.value)}
                  className={`mt-1 ${field}`}
                />
              </label>
              <div className="sm:col-span-2">
                Beschreibung
                <div className="mt-1">
                  <CommitRichEditor value={info.character} onCommit={(v) => save(key, "character", v)} />
                </div>
              </div>
              <label>
                Preislevel
                <input
                  defaultValue={info.priceLevel}
                  onBlur={(e) => save(key, "priceLevel", e.target.value)}
                  placeholder="z.B. $$"
                  className={`mt-1 ${field}`}
                />
              </label>
              <label>
                Hier wohnen
                <input
                  defaultValue={info.residents}
                  onBlur={(e) => save(key, "residents", e.target.value)}
                  placeholder="z.B. Studierende, junge Familien"
                  className={`mt-1 ${field}`}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
