"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  AREA_ORDER,
  AREAS,
  LOCATION_SUGGESTIONS,
  type AreaKey,
} from "@/lib/world";
import { PageHeader } from "@/components/PageHeader";
import { sceneHeader } from "@/lib/headers";

export default function NewScenePage() {
  const router = useRouter();
  const { addScene, addLocation, characters, currentPlayer, charactersOf } =
    useStore();

  const [title, setTitle] = useState("");
  const [area, setArea] = useState<AreaKey>("rivers_edge");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState("2021-11-23");
  const [time, setTime] = useState("Nachmittag");
  const [tw, setTw] = useState(false);
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || selected.length === 0) return;
    const loc = locationName.trim() || LOCATION_SUGGESTIONS[area][0];
    // Ort anlegen, falls neu — wird durch diese Szene direkt "bespielt"
    addLocation(area, loc);
    const id = addScene({
      title: title.trim(),
      location_area: area,
      location_name: loc,
      inplay_date: date,
      inplay_time: time,
      status: "active",
      trigger_warning: tw,
      participant_ids: selected,
      summary: summary.trim() || null,
    });
    router.push(`/szenen/${id}`);
  }

  const field =
    "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20";

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <PageHeader title="Neue Szene" subtitle="Eröffne einen neuen Thread." width="max-w-2xl" />

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Header-Andeutung — jede Szene hat einen eigenen Header. Die Auswahl
            folgt später; hier nur eine Vorschau (verändert sich mit dem Titel). */}
        <div>
          <div className="flex items-center justify-between text-[12px] text-text-secondary mb-1">
            <span>Szenen-Header</span>
            <span className="text-[10px] text-text-tertiary">Auswahl folgt · Vorschau</span>
          </div>
          <div
            className="relative h-24 w-full rounded-md overflow-hidden border border-border-subtle bg-center bg-cover opacity-90"
            style={{ backgroundImage: `url("${sceneHeader(title.trim() || "neue-szene")}")` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
            <span className="absolute bottom-2 left-3 text-[10px] text-text-tertiary">
              Automatisch generiert · bald selbst einstellbar
            </span>
          </div>
        </div>

        <label className="text-[12px] text-text-secondary">
          Titel
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Das Café und die Stille dazwischen"
            className={`mt-1 ${field}`}
          />
        </label>

        <label className="text-[12px] text-text-secondary">
          Zusammenfassung <span className="text-text-tertiary">(optional, ein Satz — kann auch später beim Schließen ergänzt werden)</span>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Worum geht es in dieser Szene?"
            className={`mt-1 ${field}`}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-[12px] text-text-secondary">
            Bezirk
            <select
              value={area}
              onChange={(e) => {
                setArea(e.target.value as AreaKey);
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

          <label className="text-[12px] text-text-secondary">
            Ort
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={LOCATION_SUGGESTIONS[area][0]}
              className={`mt-1 ${field}`}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5 -mt-2">
          {LOCATION_SUGGESTIONS[area].map((loc) => (
            <button
              type="button"
              key={loc}
              onClick={() => setLocationName(loc)}
              className="rounded-full bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[10px] text-text-secondary"
            >
              {loc}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-[12px] text-text-secondary">
            In-Game-Datum
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1 ${field}`}
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            Tageszeit
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Nachmittag"
              className={`mt-1 ${field}`}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-text-secondary">
          <input
            type="checkbox"
            checked={tw}
            onChange={(e) => setTw(e.target.checked)}
          />
          Triggerwarnung anzeigen
        </label>

        <div>
          <div className="text-[12px] text-text-secondary mb-2">
            Teilnehmende Charaktere{" "}
            <span className="text-text-tertiary">
              (Reihenfolge = Schreib-Reihenfolge)
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {characters.map((c) => {
              const isMine = myChars.some((m) => m.id === c.id);
              const checked = selected.includes(c.id);
              const order = selected.indexOf(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                    checked
                      ? "border-white/25 bg-white/[0.06]"
                      : "border-border-subtle bg-bg-surface hover:bg-white/[0.03]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.faceclaim_image_url ?? ""}
                    alt={c.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-text-primary truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-text-tertiary truncate">
                      {c.role}
                      {isMine ? " · du" : ""}
                    </div>
                  </div>
                  {checked && (
                    <span className="text-[10px] text-text-secondary">
                      #{order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={!title.trim() || selected.length === 0}
            className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-40 border border-border-subtle px-5 py-2 text-[12px] text-text-primary"
          >
            Szene erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
