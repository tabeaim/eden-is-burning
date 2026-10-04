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
import { CharacterPicker } from "@/components/CharacterPicker";
import { sceneHeader } from "@/lib/headers";
import { AuNameField, auNames } from "@/components/AuNameField";
import { DatePicker } from "@/components/DatePicker";
import { PHONE_AREA, PHONE_LOCATION, phoneSceneTitle } from "@/lib/phone";

// Vorbelegung aus der Adresse — z.B. vom Handy: /szenen/neu?telefon=1&von=…&mit=…
// (`anruf`: dieser Anruf bekommt die Szene; `log`: Anruf in die Anrufliste eintragen)
function prefill() {
  const q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  return {
    phone: q.get("telefon") === "1",
    from: q.get("von"),
    to: q.get("mit"),
    date: q.get("datum"),
    time: q.get("zeit"),
    callId: q.get("anruf"),
    log: q.get("log") === "1",
  };
}

// Pflichtfeld-Stern
function Req() {
  return <span className="text-accent">*</span>;
}

export default function NewScenePage() {
  const router = useRouter();
  const {
    addScene,
    addLocation,
    addPost,
    addCall,
    updateCall,
    character,
    characters,
    npcs,
    scenes,
    currentPlayer,
    charactersOf,
  } = useStore();
  const [pre] = useState(prefill);
  // Telefonat: kein Bezirk/Ort — die Szene spielt „am Telefon"
  const [phone, setPhone] = useState(pre.phone);

  const [title, setTitle] = useState("");
  const [area, setArea] = useState<AreaKey>("rivers_edge");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState(pre.date ?? "2021-11-23");
  const [time, setTime] = useState(pre.time ?? "Nachmittag");
  const [tw, setTw] = useState(false);
  const [au, setAu] = useState(false);
  const [auName, setAuName] = useState("");
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState<string[]>(
    [pre.from, pre.to].filter((id): id is string => !!id),
  );
  // Ohne eigenen Titel heißt ein Telefonat „A & B on the phone"
  const phoneTitle = phoneSceneTitle(
    selected.map((id) => character(id)).filter((c): c is NonNullable<typeof c> => !!c),
  );
  const [firstPost, setFirstPost] = useState("");
  const [firstCharId, setFirstCharId] = useState<string | null>(null);

  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const myCharIds = new Set(myChars.map((c) => c.id));
  // Eigene Charaktere, die an dieser Szene teilnehmen (für den ersten Post)
  const eligibleFirst = myChars.filter((c) => selected.includes(c.id));
  const subtitle = phone ? "Eröffne ein Telefonat." : "Eröffne einen neuen Thread.";
  const firstChar =
    firstCharId && eligibleFirst.some((c) => c.id === firstCharId)
      ? firstCharId
      : eligibleFirst[0]?.id ?? null;

  const valid = phone
    ? date && selected.length > 0
    : title.trim() && locationName.trim() && date && selected.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const loc = phone ? PHONE_LOCATION : locationName.trim();
    // Neuer Ort wird angelegt und ist durch diese Szene direkt "bespielt".
    if (!phone) addLocation(area, loc);
    const id = addScene({
      title: title.trim() || phoneTitle,
      location_area: phone ? PHONE_AREA : area,
      location_name: loc,
      inplay_date: date,
      inplay_time: time,
      status: "active",
      trigger_warning: tw,
      au,
      ...(au && auName.trim() ? { au_name: auName.trim() } : {}),
      participant_ids: selected,
      summary: summary.trim() || null,
    });
    // Optionaler erster Post (kann auch später von einer teilnehmenden Person kommen)
    if (firstPost.trim() && firstChar) {
      addPost(id, firstChar, firstPost.trim());
    }
    // Vom Handy aus: Szene an den Anruf hängen bzw. den Anruf in die Liste eintragen
    if (phone && pre.callId) {
      updateCall(pre.callId, { scene_id: id });
    } else if (phone && pre.log && pre.from && pre.to) {
      addCall({
        caller_id: pre.from,
        callee_id: pre.to,
        inplay_date: date,
        inplay_time: time,
        status: "accepted",
        scene_id: id,
      });
    }
    router.push(`/szenen/${id}`);
  }

  const field =
    "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Neue Szene"  subtitle={subtitle} width="max-w-6xl" />

      <form onSubmit={submit} className="flex flex-col gap-5 max-w-2xl">
        <div>
          <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
            <span>Szenen-Header</span>
            <span className="text-[0.875rem] text-text-tertiary">Vorschau · nach Erstellen editierbar</span>
          </div>
          <div
            className="relative h-24 w-full rounded-md overflow-hidden border border-border-subtle bg-center bg-cover opacity-90"
            style={{ backgroundImage: `url("${sceneHeader(title.trim() || "neue-szene")}")` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.875rem] text-text-secondary">
          <input type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} />
          Telefonat — die Szene spielt am Telefon (kein Ort)
        </label>

        <label className="text-[0.875rem] text-text-secondary">
          Titel {phone ? <span className="text-text-tertiary">(optional)</span> : <Req />}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={phone ? phoneTitle : "z.B. Das Café und die Stille dazwischen"}
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

        {!phone && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-[0.875rem] text-text-secondary">
            Bezirk <Req />
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

          <label className="text-[0.875rem] text-text-secondary">
            Ort <Req />
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={LOCATION_SUGGESTIONS[area][0]}
              className={`mt-1 ${field}`}
            />
          </label>
        </div>
        )}

        <div className={`flex flex-wrap gap-1.5 -mt-2 ${phone ? "hidden" : ""}`}>
          {LOCATION_SUGGESTIONS[area].map((loc) => (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="text-[0.875rem] text-text-secondary">
            In-Game-Datum <Req />
            <DatePicker value={date} onChange={setDate} className="mt-1" />
          </div>
          <label className="text-[0.875rem] text-text-secondary">
            {phone ? "Uhrzeit" : "Tageszeit"}
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Nachmittag"
              className={`mt-1 ${field}`}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[0.875rem] text-text-secondary">
          <input type="checkbox" checked={tw} onChange={(e) => setTw(e.target.checked)} />
          Triggerwarnung anzeigen
        </label>

        <label className="flex items-center gap-2 text-[0.875rem] text-text-secondary">
          <input type="checkbox" checked={au} onChange={(e) => setAu(e.target.checked)} />
          <span className="italic">AU</span> — spielt in einem Alternate
          Universe (Nicht-Canon)
        </label>
        {au && (
          <AuNameField value={auName} onChange={setAuName} names={auNames(scenes)} />
        )}

        <div>
          <div className="text-[0.875rem] text-text-secondary mb-2">
            Teilnehmende Charaktere <Req />{" "}
            <span className="text-text-tertiary">
              (Reihenfolge = Schreib-Reihenfolge)
            </span>
          </div>
          <CharacterPicker
            characters={phone ? [...characters, ...npcs] : characters}
            selected={selected}
            onChange={setSelected}
            myCharIds={myCharIds}
          />
        </div>

        {/* Optionaler erster Post */}
        {eligibleFirst.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-2">
              <span>
                Erster Post{" "}
                <span className="text-text-tertiary">
                  (optional — kann auch später von einer teilnehmenden Person kommen)
                </span>
              </span>
              {eligibleFirst.length > 1 && (
                <select
                  value={firstChar ?? ""}
                  onChange={(e) => setFirstCharId(e.target.value)}
                  className="bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.8125rem] text-text-primary outline-none focus:border-white/20"
                >
                  {eligibleFirst.map((c) => (
                    <option key={c.id} value={c.id} className="bg-bg-surface">
                      als {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              value={firstPost}
              onChange={(e) => setFirstPost(e.target.value)}
              rows={4}
              placeholder="Schreibe den ersten Post… (*Sternchen* für kursiv)"
              className={`${field} resize-y`}
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={!valid}
            className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-40 border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary"
          >
            Szene erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
