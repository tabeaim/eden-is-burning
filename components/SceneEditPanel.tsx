"use client";

import { useTheme } from "@/lib/theme";
import { BannerPosition } from "./BannerPosition";
import { bannerStyle } from "@/lib/headers";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { PHONE_AREA, PHONE_LOCATION } from "@/lib/phone";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toggle } from "@/components/Toggle";
import { LocationField, locationComplete } from "@/components/LocationField";
import { sceneHeader } from "@/lib/headers";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { Icon } from "@/components/Icon";
import { CharacterPicker } from "@/components/CharacterPicker";
import { AuNameField, auNames } from "@/components/AuNameField";
import { DatePicker } from "@/components/DatePicker";
import type { Scene } from "@/lib/types";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

function Req() {
  return <span className="text-accent">*</span>;
}

// Editiermodus einer bestehenden Szene (analog zu "Neue Szene").
export function SceneEditPanel({
  scene,
  onClose,
}: {
  scene: Scene;
  onClose: () => void;
}) {
  const {
    updateScene,
    deleteScene,
    addLocation,
    characters,
    npcs,
    scenes,
    posts,
    currentPlayer,
    charactersOf,
  } = useStore();
  const { theme } = useTheme();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const postCount = posts.filter((p) => p.scene_id === scene.id).length;

  const [title, setTitle] = useState(scene.title);
  const [summary, setSummary] = useState(scene.summary ?? "");
  const [area, setArea] = useState<string>(scene.location_area);
  const [locationName, setLocationName] = useState(scene.location_name);
  const [locationDescription, setLocationDescription] = useState("");
  // Telefonat: keine Gegend/kein Ort, die Szene spielt „am Telefon"
  const [phone, setPhone] = useState(scene.location_area === PHONE_AREA);
  const [date, setDate] = useState(scene.inplay_date);
  const [time, setTime] = useState(scene.inplay_time);
  const [tw, setTw] = useState(scene.trigger_warning);
  const [au, setAu] = useState(Boolean(scene.au));
  const [auName, setAuName] = useState(scene.au_name ?? "");
  const [headerUrl, setHeaderUrl] = useState(scene.header_url ?? "");
  const [selected, setSelected] = useState<string[]>(scene.participant_ids);
  const fileRef = useRef<HTMLInputElement>(null);

  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const myCharIds = new Set(myChars.map((c) => c.id));
  const valid =
    title.trim() && (phone || locationComplete(area, locationName)) && date && selected.length > 0;

  async function onHeaderFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeaderUrl(await uploadImage(file, "scenes", IMAGE_SIZES.banner));
  }

  function save() {
    if (!valid) return;
    const loc = phone ? PHONE_LOCATION : locationName.trim();
    if (!phone) addLocation(area, loc, locationDescription.trim() || null);
    updateScene(scene.id, {
      title: title.trim(),
      location_area: phone ? PHONE_AREA : area,
      location_name: loc,
      inplay_date: date,
      inplay_time: time,
      trigger_warning: tw,
      au,
      // au_name nur mitschicken, wenn es etwas zu setzen oder zu löschen gibt
      ...(au && auName.trim()
        ? { au_name: auName.trim() }
        : scene.au_name
          ? { au_name: null }
          : {}),
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
          className="relative h-28 w-full rounded-md overflow-hidden border border-border-subtle bg-cover"
          style={bannerStyle(headerUrl || sceneHeader(title.trim() || scene.id, theme))}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="on-dark absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary"
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
        {headerUrl && <BannerPosition url={headerUrl} onChange={setHeaderUrl} />}
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

      <Toggle
        checked={phone}
        onChange={(on) => {
          setPhone(on);
          // zurück zu einem echten Ort: Ort neu wählen
          if (!on && area === PHONE_AREA) {
            setArea("");
            setLocationName("");
          }
        }}
      >
        Telefonat – die Szene spielt am Telefon (kein Ort)
      </Toggle>

      {!phone && (
        <div className="text-[0.875rem] text-text-secondary">
          <div className="mb-1">
            Ort <Req />
          </div>
          <LocationField
            area={area}
            name={locationName}
            onChange={(a, n) => {
              setArea(a);
              setLocationName(n);
            }}
            description={locationDescription}
            onDescription={setLocationDescription}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="text-[0.875rem] text-text-secondary">
          In-Game-Datum <Req />
          <DatePicker value={date} onChange={setDate} className="mt-1" />
        </div>
        <label className="text-[0.875rem] text-text-secondary">
          Tageszeit
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`mt-1 ${field}`}
          />
        </label>
      </div>

      <Toggle checked={tw} onChange={setTw}>
        Triggerwarnung anzeigen
      </Toggle>

      <Toggle checked={au} onChange={setAu}>
        <span className="italic">AU</span> – Alternate Universe
      </Toggle>
      {au && <AuNameField value={auName} onChange={setAuName} names={auNames(scenes)} />}

      <div>
        <div className="text-[0.875rem] text-text-secondary mb-2">
          Teilnehmende Charaktere <Req />{" "}
          <span className="text-text-tertiary">
            (Reihenfolge = Schreib-Reihenfolge)
          </span>
        </div>
        <CharacterPicker
          characters={[...characters, ...npcs]}
          selected={selected}
          onChange={setSelected}
          myCharIds={myCharIds}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={() => setConfirmDelete(true)}
          className="mr-auto flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
        >
          <Icon name="trash" size={14} /> Szene löschen
        </button>
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

      {confirmDelete && (
        <ConfirmDialog
          title="Szene löschen?"
          text={`„${scene.title}“ wird mit allen ${postCount} Posts und ihren Zitaten endgültig gelöscht. Das lässt sich nicht rückgängig machen.`}
          confirmLabel="Szene löschen"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            router.push("/szenen");
            deleteScene(scene.id);
          }}
        />
      )}
    </div>
  );
}
