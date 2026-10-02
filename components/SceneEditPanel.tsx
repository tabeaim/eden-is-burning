"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  AREA_ORDER,
  AREAS,
  LOCATION_SUGGESTIONS,
  type AreaKey,
} from "@/lib/world";
import { sceneHeader } from "@/lib/headers";
import { Icon } from "@/components/Icon";
import { CharacterPicker } from "@/components/CharacterPicker";
import type { Scene } from "@/lib/types";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

function Req() {
  return <span className="text-accent">*</span>;
}

// Prototyp: Bild als Data-URL (später Supabase Storage).
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Editiermodus einer bestehenden Szene (analog zu "Neue Szene").
export function SceneEditPanel({
  scene,
  onClose,
}: {
  scene: Scene;
  onClose: () => void;
}) {
  const { updateScene, addLocation, characters, currentPlayer, charactersOf } =
    useStore();

  const [title, setTitle] = useState(scene.title);
  const [summary, setSummary] = useState(scene.summary ?? "");
  const [area, setArea] = useState<string>(scene.location_area);
  const [locationName, setLocationName] = useState(scene.location_name);
  const [date, setDate] = useState(scene.inplay_date);
  const [time, setTime] = useState(scene.inplay_time);
  const [tw, setTw] = useState(scene.trigger_warning);
  const [au, setAu] = useState(Boolean(scene.au));
  const [headerUrl, setHeaderUrl] = useState(scene.header_url ?? "");
  const [selected, setSelected] = useState<string[]>(scene.participant_ids);
  const fileRef = useRef<HTMLInputElement>(null);

  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const myCharIds = new Set(myChars.map((c) => c.id));
  const suggestions = LOCATION_SUGGESTIONS[area as AreaKey] ?? [];
  const valid =
    title.trim() && locationName.trim() && date && selected.length > 0;

  async function onHeaderFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeaderUrl(await readFileAsDataURL(file));
  }

  function save() {
    if (!valid) return;
    const loc = locationName.trim();
    addLocation(area, loc);
    updateScene(scene.id, {
      title: title.trim(),
      location_area: area,
      location_name: loc,
      inplay_date: date,
      inplay_time: time,
      trigger_warning: tw,
      au,
      header_url: headerUrl || null,
      participant_ids: selected,
      summary: summary.trim() || null,
    });
    onClose();
  }

  return (
    <div className="mb-8 rounded-xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-4">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
        Szene bearbeiten
      </div>

      {/* Szenen-Header */}
      <div>
        <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
          <span>Szenen-Header</span>
          {headerUrl && (
            <button
              type="button"
              onClick={() => setHeaderUrl("")}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Entfernen
            </button>
          )}
        </div>
        <div
          className="relative h-28 w-full rounded-md overflow-hidden border border-border-subtle bg-center bg-cover"
          style={{
            backgroundImage: `url("${headerUrl || sceneHeader(title.trim() || scene.id)}")`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary"
          >
            <Icon name="upload" size={14} /> Bild hochladen
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onHeaderFile}
          className="hidden"
        />
      </div>

      <label className="text-[0.875rem] text-text-secondary">
        Titel <Req />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`mt-1 ${field}`}
        />
      </label>

      <label className="text-[0.875rem] text-text-secondary">
        Zusammenfassung <span className="text-text-tertiary">(optional)</span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Worum geht es in dieser Szene?"
          className={`mt-1 ${field}`}
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-[0.875rem] text-text-secondary">
          Bezirk <Req />
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setLocationName("");
            }}
            className={`mt-1 ${field}`}
          >
            {AREA_ORDER.map((k) => (
              <option key={k} value={k} className="bg-bg-surface">
                {AREAS[k].name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[0.875rem] text-text-secondary">
          Ort <Req />
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder={suggestions[0]}
            className={`mt-1 ${field}`}
          />
        </label>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {suggestions.map((loc) => (
            <button
              type="button"
              key={loc}
              onClick={() => setLocationName(loc)}
              className="rounded-full bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[0.8125rem] text-text-secondary"
            >
              {loc}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-[0.875rem] text-text-secondary">
          In-Game-Datum <Req />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-1 ${field}`}
          />
        </label>
        <label className="text-[0.875rem] text-text-secondary">
          Tageszeit
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`mt-1 ${field}`}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[0.875rem] text-text-secondary">
        <input
          type="checkbox"
          checked={tw}
          onChange={(e) => setTw(e.target.checked)}
        />
        Triggerwarnung anzeigen
      </label>

      <label className="flex items-center gap-2 text-[0.875rem] text-text-secondary">
        <input
          type="checkbox"
          checked={au}
          onChange={(e) => setAu(e.target.checked)}
        />
        <span className="italic">AU</span> — Alternate Universe
      </label>

      <div>
        <div className="text-[0.875rem] text-text-secondary mb-2">
          Teilnehmende Charaktere <Req />{" "}
          <span className="text-text-tertiary">
            (Reihenfolge = Schreib-Reihenfolge)
          </span>
        </div>
        <CharacterPicker
          characters={characters}
          selected={selected}
          onChange={setSelected}
          myCharIds={myCharIds}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
        >
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={!valid}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-40 border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
