"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { areaName } from "@/lib/world";
import { pageHeader } from "@/lib/headers";
import { Icon } from "@/components/Icon";
import { CharacterBubble } from "@/components/Bubble";
import { SceneCard } from "@/components/SceneCard";
import type { Location, LocationPerson } from "@/lib/types";

const MAX_IMAGES = 12;

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Prototyp: Bild als Data-URL (später Supabase Storage). Vorher verkleinert,
// damit die Orts-Zeile in der DB nicht unnötig groß wird.
function readImageFile(file: File, maxSide = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(reader.result as string);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Ortsprofil: Beschreibung, Vibes-Fotos, Characters & NPCs, Szenen und Charaktere an diesem Ort.
// Bearbeiten dürfen Admins und wer den Ort erstellt hat.
export default function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { location, scenes, characters, player, postsOf, canEditLocation } =
    useStore();
  const loc = location(id);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  // Ortsname als Seitentitel; Banner ist standardmäßig der der Karte, bis ein
  // eigenes Bild hinterlegt wird.
  useSetPageMeta(loc?.name ?? "Ort", undefined, loc?.image_url ?? undefined, "max-w-6xl");

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (!loc) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-text-tertiary">
        Ort nicht gefunden.{" "}
        <Link href="/orte" className="underline">
          Zur Karte
        </Link>
      </div>
    );
  }

  const canEdit = canEditLocation(loc);
  const scenesHere = scenes
    .filter((s) => s.location_area === loc.area && s.location_name === loc.name)
    .sort(
      (a, b) =>
        Number(b.status === "active") - Number(a.status === "active") ||
        b.inplay_date.localeCompare(a.inplay_date),
    );
  const postCount = scenesHere.reduce((sum, s) => sum + postsOf(s.id).length, 0);
  const visitorIds = new Set(scenesHere.flatMap((s) => s.participant_ids));
  const visitors = characters.filter((c) => visitorIds.has(c.id));
  const creator = loc.created_by ? player(loc.created_by) : undefined;
  const images = loc.images ?? [];
  const people = loc.people ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-8">
      {/* Kopf über der Trennlinie (wie in der Szenenansicht): Bearbeiten-Button
          bzw. das Editier-Panel */}
      {editing ? (
        <LocationEditPanel loc={loc} onClose={() => setEditing(false)} />
      ) : (
        canEdit && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
            >
              <Icon name="edit" size={14} /> Bearbeiten
            </button>
          </div>
        )
      )}

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-6" />

      <div className="grid md:grid-cols-[1fr_260px] gap-14 items-start">
        <div className="flex flex-col gap-9 min-w-0">
          <section>
            <Heading>about.</Heading>
            {loc.description ? (
              <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-text-secondary">
                {loc.description}
              </p>
            ) : (
              <p className="text-[0.875rem] text-text-tertiary">
                Noch keine Beschreibung hinterlegt.
              </p>
            )}
          </section>

          {/* Vibes — nur wenn Fotos hinterlegt sind */}
          {images.length > 0 && (
            <section>
              <Heading>vibes.</Heading>
              <div className="columns-2 sm:columns-3 gap-3">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setZoom(src)}
                    className="mb-3 block w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-surface hover:border-accent/50 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="block w-full h-auto" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Characters & NPCs — nur wenn welche hinterlegt sind */}
          {people.length > 0 && (
            <section>
              <Heading>characters &amp; npcs.</Heading>
              <div className="flex flex-col gap-4">
                {people.map((p) => (
                  <PersonCard key={`${p.kind}:${p.id}`} person={p} />
                ))}
              </div>
            </section>
          )}

          <section>
            <Heading>scenes.</Heading>
            {scenesHere.length === 0 ? (
              <p className="text-[0.875rem] text-text-tertiary">
                Hier wurde noch nicht gespielt.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {scenesHere.map((s) => (
                  <SceneCard key={s.id} scene={s} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Seitenspalte */}
        <aside className="flex flex-col gap-7">
          <section>
            <Heading>facts.</Heading>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[0.875rem]">
              <dt className="text-text-tertiary">Bezirk:</dt>
              <dd className="text-text-secondary">{areaName(loc.area)}</dd>
              <dt className="text-text-tertiary">Status:</dt>
              <dd className="text-text-secondary">
                {scenesHere.length > 0 ? "Bespielt" : "Idee"}
              </dd>
              <dt className="text-text-tertiary">Szenen:</dt>
              <dd className="text-text-secondary">{scenesHere.length}</dd>
              <dt className="text-text-tertiary">Posts:</dt>
              <dd className="text-text-secondary">{postCount}</dd>
              {creator && (
                <>
                  <dt className="text-text-tertiary">Erstellt von:</dt>
                  <dd>
                    <Link
                      href={`/spieler/${creator.username}`}
                      className="text-text-secondary hover:text-accent"
                    >
                      {creator.username}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </section>

          {visitors.length > 0 && (
            <section>
              <Heading>spotted here.</Heading>
              <div className="flex flex-wrap gap-1.5">
                {visitors.map((c) => (
                  <CharacterBubble key={c.id} character={c} />
                ))}
              </div>
            </section>
          )}

          {loc.pinterest_url && (
            <a
              href={loc.pinterest_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 self-start text-[0.875rem] text-olive hover:text-accent"
            >
              <Icon name="pinterest" size={20} /> Pinterest-Board
            </a>
          )}
        </aside>
      </div>

      {/* Großansicht eines Vibes-Fotos */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display lowercase text-[2rem] text-accent leading-none mb-3">
      {children}
    </h2>
  );
}

// Ein am Ort hinterlegter Charakter/NPC — Aufbau wie die Relations im Charakterprofil:
// Bubble + Alter | Beruf in Caps, darunter der Bezug zum Ort.
function PersonCard({ person }: { person: LocationPerson }) {
  const { character } = useStore();
  const c = character(person.id);
  if (!c) return null;

  const facts = [c.age ? `${c.age}` : null, c.role].filter(Boolean).join(" | ");

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CharacterBubble character={c} />
        {facts && (
          <span className="text-[0.875rem] uppercase tracking-wider text-text-secondary">
            {facts}
          </span>
        )}
      </div>
      {person.note && (
        <p className="mt-2 text-[0.875rem] text-text-secondary leading-relaxed">
          {person.note}
        </p>
      )}
    </div>
  );
}

// Bearbeiten der „Characters & NPCs" eines Orts: bestehende Charaktere/NPCs
// auswählen oder einen neuen NPC direkt anlegen (Basis-Infos; das Profil lässt
// sich später in den Einstellungen ausfüllen).
function PeopleEditor({
  people,
  setPeople,
}: {
  people: LocationPerson[];
  setPeople: React.Dispatch<React.SetStateAction<LocationPerson[]>>;
}) {
  const { characters, npcs, character, addNpc } = useStore();
  const [pick, setPick] = useState("");
  const [creating, setCreating] = useState(false);
  const [npcName, setNpcName] = useState("");
  const [npcRole, setNpcRole] = useState("");
  const [npcAge, setNpcAge] = useState("");

  const has = (kind: LocationPerson["kind"], id: string) =>
    people.some((p) => p.kind === kind && p.id === id);
  const freeChars = characters
    .filter((c) => !has("character", c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const freeNpcs = npcs
    .filter((n) => !has("npc", n.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  function addPicked() {
    const [kind, id] = pick.split(":") as [LocationPerson["kind"], string];
    if (!id) return;
    setPeople((cur) => [...cur, { kind, id, note: null }]);
    setPick("");
  }

  // Der NPC wird sofort angelegt (auch für andere Orte nutzbar) und hier hinterlegt.
  function createNpc() {
    if (!npcName.trim()) return;
    const age = parseInt(npcAge, 10);
    const id = addNpc({
      name: npcName,
      role: npcRole.trim() || null,
      age: Number.isFinite(age) ? age : null,
    });
    setPeople((cur) => [...cur, { kind: "npc", id, note: null }]);
    setNpcName("");
    setNpcRole("");
    setNpcAge("");
    setCreating(false);
  }

  return (
    <div>
      <div className="text-[0.875rem] text-text-secondary mb-1">Characters &amp; NPCs</div>

      {people.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {people.map((p, i) => {
            const c = character(p.id);
            if (!c) return null;
            return (
              <div
                key={`${p.kind}:${p.id}`}
                className="rounded-lg border border-border-subtle bg-bg-primary p-3"
              >
                <div className="flex items-center gap-2">
                  <CharacterBubble character={c} linked={false} />
                  <button
                    type="button"
                    onClick={() => setPeople((cur) => cur.filter((_, j) => j !== i))}
                    title="Entfernen"
                    className="ml-auto text-text-tertiary hover:text-accent"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <textarea
                  value={p.note ?? ""}
                  onChange={(e) =>
                    setPeople((cur) =>
                      cur.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)),
                    )
                  }
                  placeholder="Was hat die Person mit diesem Ort zu tun?"
                  rows={2}
                  className={`mt-2 ${field} resize-y`}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className={`${field} flex-1 min-w-[200px]`}
        >
          <option value="">Charakter oder NPC auswählen…</option>
          {freeChars.length > 0 && (
            <optgroup label="Charaktere">
              {freeChars.map((c) => (
                <option key={c.id} value={`character:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {freeNpcs.length > 0 && (
            <optgroup label="NPCs">
              {freeNpcs.map((n) => (
                <option key={n.id} value={`npc:${n.id}`}>
                  {n.name}
                  {n.role ? ` (${n.role})` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          type="button"
          onClick={addPicked}
          disabled={!pick}
          className="rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-[0.8125rem] text-text-primary disabled:opacity-40"
        >
          Hinzufügen
        </button>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-[0.8125rem] text-text-primary"
          >
            <Icon name="plus" size={13} /> Neuer NPC
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-2 rounded-lg border border-border-subtle bg-bg-primary p-3 flex flex-col gap-2">
          <div className="text-[0.875rem] text-text-secondary">
            Neuer NPC{" "}
            <span className="text-text-tertiary">
              — Basis-Infos; das Profil kannst du später in den Einstellungen ausfüllen
            </span>
          </div>
          <div className="grid sm:grid-cols-[1fr_1fr_90px] gap-2">
            <input
              value={npcName}
              onChange={(e) => setNpcName(e.target.value)}
              placeholder="Name"
              autoFocus
              className={field}
            />
            <input
              value={npcRole}
              onChange={(e) => setNpcRole(e.target.value)}
              placeholder="Rolle / Beruf (optional)"
              className={field}
            />
            <input
              value={npcAge}
              onChange={(e) => setNpcAge(e.target.value.replace(/\D/g, ""))}
              placeholder="Alter"
              inputMode="numeric"
              className={field}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={createNpc}
              disabled={!npcName.trim()}
              className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40"
            >
              NPC anlegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Editiermodus des Ortsprofils (Admins + Ersteller*in).
function LocationEditPanel({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const { updateLocation, locationsOf } = useStore();
  const [name, setName] = useState(loc.name);
  const [description, setDescription] = useState(loc.description ?? "");
  const [imageUrl, setImageUrl] = useState(loc.image_url ?? "");
  const [images, setImages] = useState<string[]>(loc.images ?? []);
  const [pinterest, setPinterest] = useState(loc.pinterest_url ?? "");
  const [people, setPeople] = useState<LocationPerson[]>(loc.people ?? []);
  const [newUrl, setNewUrl] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const trimmed = name.trim();
  const nameTaken = locationsOf(loc.area).some(
    (l) => l.id !== loc.id && l.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const full = images.length >= MAX_IMAGES;
  const valid = trimmed && !nameTaken;

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setImageUrl(await readImageFile(file, 1800));
    e.target.value = "";
  }

  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const added = await Promise.all(files.map((f) => readImageFile(f)));
    setImages((cur) => [...cur, ...added].slice(0, MAX_IMAGES));
  }

  function addUrl() {
    const url = newUrl.trim();
    if (!/^https?:\/\//i.test(url) || full) return;
    setImages((cur) => [...cur, url]);
    setNewUrl("");
  }

  function save() {
    if (!valid) return;
    updateLocation(loc.id, {
      name: trimmed,
      description: description.trim() || null,
      image_url: imageUrl || null,
      images,
      pinterest_url: pinterest.trim() || null,
      people: people.map((p) => ({ ...p, note: p.note?.trim() || null })),
    });
    onClose();
  }

  return (
    <div className="mb-8 rounded-xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-4">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
        Ort bearbeiten
      </div>

      {/* Banner — ohne eigenes Bild gilt der Banner der Karte */}
      <div>
        <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
          <span>
            Banner{" "}
            {!imageUrl && <span className="text-text-tertiary">(Standard: wie Karte)</span>}
          </span>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Entfernen
            </button>
          )}
        </div>
        <div
          className="relative h-28 w-full rounded-md overflow-hidden border border-border-subtle bg-bg-primary bg-center bg-cover"
          style={{ backgroundImage: `url("${imageUrl || pageHeader("orte")}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary"
          >
            <Icon name="upload" size={14} /> Bild hochladen
          </button>
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          onChange={onCoverFile}
          className="hidden"
        />
      </div>

      <label className="text-[0.875rem] text-text-secondary">
        Name <span className="text-accent">*</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 ${field}`}
        />
        {nameTaken && (
          <span className="mt-1 block text-[0.8125rem] text-accent">
            Diesen Ort gibt es in {areaName(loc.area)} schon.
          </span>
        )}
      </label>

      <label className="text-[0.875rem] text-text-secondary">
        Beschreibung
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Wie sieht es hier aus, wie riecht es, wer hängt hier rum?"
          rows={5}
          className={`mt-1 ${field} resize-y`}
        />
      </label>

      {/* Vibes-Fotos */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-1">
          Vibes{" "}
          <span className="text-text-tertiary">
            ({images.length}/{MAX_IMAGES})
          </span>
        </div>
        {images.length > 0 && (
          <div className="mb-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {images.map((src, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-md border border-border-subtle bg-bg-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))}
                  title="Foto entfernen"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-text-primary opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="Bild-Link einfügen (https://…)"
            disabled={full}
            className={`${field} flex-1 min-w-[200px] disabled:opacity-40`}
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={full || !/^https?:\/\//i.test(newUrl.trim())}
            className="rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-[0.8125rem] text-text-primary disabled:opacity-40"
          >
            Hinzufügen
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={full}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-[0.8125rem] text-text-primary disabled:opacity-40"
          >
            <Icon name="upload" size={14} /> Hochladen
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onGalleryFiles}
            className="hidden"
          />
        </div>
      </div>

      <PeopleEditor people={people} setPeople={setPeople} />

      <label className="text-[0.875rem] text-text-secondary">
        Pinterest-Board
        <input
          value={pinterest}
          onChange={(e) => setPinterest(e.target.value)}
          placeholder="https://pinterest.com/…"
          className={`mt-1 ${field}`}
        />
      </label>

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
          className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5 disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
