"use client";

import { LocationCategoryPicker } from "@/components/LocationCategoryPicker";
import { capFirst, compareInplay } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { BannerPosition } from "@/components/BannerPosition";
import { bannerStyle } from "@/lib/headers";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RichText } from "@/components/RichText";
import { RichEditor } from "@/components/RichEditor";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { areaName } from "@/lib/world";
import { locationHeader } from "@/lib/headers";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { Icon } from "@/components/Icon";
import { PinterestBoard } from "@/components/PinterestBoard";
import { isHidden, isWorking } from "@/lib/characters";
import { CharacterBubble } from "@/components/Bubble";
import { SceneCard } from "@/components/SceneCard";
import { Facts, FactRow } from "@/components/Facts";
import type { Location, LocationPerson } from "@/lib/types";

const MAX_IMAGES = 12;

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Ortsprofil: Beschreibung, Vibes-Fotos, Characters & NPCs, Szenen und Charaktere an diesem Ort.
// Bearbeiten dürfen Admins und wer den Ort erstellt hat.
export default function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { location, scenes, characters, player, postsOf, canEditLocation, appSettings } =
    useStore();
  const { theme } = useTheme();
  const loc = location(id);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  // Ortsname als Seitentitel; Banner ist das aktuelle Bild der Gegend, bis ein
  // eigenes Bild hinterlegt wird.
  useSetPageMeta(
    loc?.name ?? "Ort",
    undefined,
    loc ? loc.image_url || locationHeader(appSettings, loc.area, theme) : undefined,
    "max-w-6xl",
  );

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
          Zu den Orten
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
        compareInplay(b, a),
    );
  const postCount = scenesHere.reduce((sum, s) => sum + postsOf(s.id).length, 0);
  const visitorIds = new Set(scenesHere.flatMap((s) => s.participant_ids));
  const visitors = characters.filter((c) => visitorIds.has(c.id));
  const creator = loc.created_by ? player(loc.created_by) : undefined;
  const images = loc.images ?? [];
  // Charaktere, die diesen Ort als Arbeitgeber eingetragen haben (und es zeigen)
  const workers = characters.filter(
    (c) => isWorking(c) && c.profile?.employer_location_id === loc.id && !isHidden(c, "employer"),
  );
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

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-14 items-start">
        <div className="flex flex-col gap-9 min-w-0">
          <section>
            <Heading>about.</Heading>
            {loc.description ? (
              <RichText html={loc.description} className="text-[0.875rem] leading-relaxed text-text-secondary" />
            ) : (
              <p className="text-[0.875rem] text-text-tertiary">
                Noch keine Beschreibung hinterlegt.
              </p>
            )}
          </section>

          {/* Vibes – entweder das eingebundene Pinterest-Board oder die Fotos */}
          {loc.pinterest_url ? (
            <section>
              <Heading>vibes.</Heading>
              <PinterestBoard url={loc.pinterest_url} />
            </section>
          ) : images.length > 0 && (
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

          {/* Wer hier arbeitet (Arbeitgeber in den Grunddaten des Charakters) */}
          {workers.length > 0 && (
            <section>
              <Heading>works here.</Heading>
              <div className="flex flex-wrap gap-1.5">
                {workers.map((w) => (
                  <CharacterBubble key={w.id} character={w} />
                ))}
              </div>
            </section>
          )}

          {/* Characters & NPCs – nur wenn welche hinterlegt sind */}
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
            <Facts>
              <FactRow label="Gegend" value={areaName(loc.area)} />
              <FactRow
                label="Status"
                value={scenesHere.length > 0 ? "Bespielt" : "Noch unbespielt"}
              />
              <FactRow label="Szenen" value={scenesHere.length} />
              <FactRow label="Posts" value={postCount} />
              {creator && (
                <FactRow
                  label="Erstellt von"
                  value={
                    <Link href={`/spieler/${creator.username}`} className="hover:text-accent">
                      {creator.username}
                    </Link>
                  }
                />
              )}
            </Facts>
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
    <h2 className="font-display lowercase text-[1.625rem] text-accent leading-none mb-3">
      {children}
    </h2>
  );
}

// Ein am Ort hinterlegter Charakter/NPC – Aufbau wie die Relations im Charakterprofil:
// Bubble + Alter · Beruf als Faktenzeile, darunter der Bezug zum Ort.
function PersonCard({ person }: { person: LocationPerson }) {
  const { character } = useStore();
  const c = character(person.id);
  if (!c) return null;

  const facts = [c.age ? `${c.age}` : null, capFirst(c.role)].filter(Boolean).join(" · ");

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CharacterBubble character={c} />
        {facts && <span className="text-[0.875rem] text-text-tertiary">{facts}</span>}
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
      <div className="text-[0.875rem] text-text-secondary mb-1">Characters, SCs &amp; Statist*innen</div>

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
          <option value="">Charakter, SC oder Statist*in auswählen…</option>
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
            <optgroup label="SCs &amp; Statist*innen">
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
            <Icon name="plus" size={13} /> Neue*r Statist*in
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-2 rounded-lg border border-border-subtle bg-bg-primary p-3 flex flex-col gap-2">
          <div className="text-[0.875rem] text-text-secondary">
            Neue*r Statist*in{" "}
            <span className="text-text-tertiary">
              – Basis-Infos; das Profil kannst du später in den Einstellungen ausfüllen
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px] gap-2">
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
              Statist*in anlegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Editiermodus des Ortsprofils (Admins + Ersteller*in).
function LocationEditPanel({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const { updateLocation, deleteLocation, locationsOf, locations, scenes, appSettings, isAdmin } = useStore();
  const router = useRouter();
  // Löschen (nur Admins): Hängen Szenen am Ort, ziehen sie vorher an einen anderen um
  const [deleting, setDeleting] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const sceneCount = scenes.filter((s) => s.location_area === loc.area && s.location_name === loc.name).length;
  const targets = locations
    .filter((l) => l.id !== loc.id)
    .sort((a, b) => a.name.localeCompare(b.name, "de") || areaName(a.area).localeCompare(areaName(b.area), "de"));

  function remove() {
    const target = targets.find((l) => l.id === moveTo);
    if (sceneCount > 0 && !target) return;
    deleteLocation(loc.id, target && { area: target.area, name: target.name });
    router.push("/orte");
  }
  const { theme } = useTheme();
  const [name, setName] = useState(loc.name);
  const [description, setDescription] = useState(loc.description ?? "");
  const [category, setCategory] = useState<string | null>(loc.category ?? null);
  const [imageUrl, setImageUrl] = useState(loc.image_url ?? "");
  const [images, setImages] = useState<string[]>(loc.images ?? []);
  const [pinterest, setPinterest] = useState(loc.pinterest_url ?? "");
  // Vibes: entweder Fotos oder ein eingebundenes Pinterest-Board
  const [vibesMode, setVibesMode] = useState<"images" | "pinterest">(
    loc.pinterest_url ? "pinterest" : "images",
  );
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
    if (file) setImageUrl(await uploadImage(file, "locations-banner", IMAGE_SIZES.banner));
    e.target.value = "";
  }

  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = Math.max(0, MAX_IMAGES - images.length);
    const added = await Promise.all(
      files.slice(0, room).map((f) => uploadImage(f, "locations", IMAGE_SIZES.gallery)),
    );
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
      // nur mitschicken, wenn gewählt/geändert – die Spalte kommt mit schema-location-category.sql
      ...(category !== (loc.category ?? null) ? { category } : {}),
      image_url: imageUrl || null,
      images,
      // Pinterest-Modus: die Fotos bleiben gespeichert, gezeigt wird das Board
      pinterest_url: vibesMode === "pinterest" ? pinterest.trim() || null : null,
      people: people.map((p) => ({ ...p, note: p.note?.trim() || null })),
    });
    onClose();
  }

  return (
    <div className="mb-8 rounded-xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-4">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
        Ort bearbeiten
      </div>

      {/* Banner – ohne eigenes Bild gilt das Bild der Gegend */}
      <div>
        <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
          <span>
            Banner{" "}
            {!imageUrl && <span className="text-text-tertiary">(Standard: Bild der Gegend)</span>}
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
          className="relative h-28 w-full rounded-md overflow-hidden border border-border-subtle bg-bg-primary bg-cover"
          style={bannerStyle(imageUrl || locationHeader(appSettings, loc.area, theme))}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="on-dark absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary"
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
        {imageUrl && <BannerPosition url={imageUrl} onChange={setImageUrl} />}
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

      <div className="text-[0.875rem] text-text-secondary">
        Kategorie
        <div className="mt-1">
          <LocationCategoryPicker value={category} name={name} onChange={setCategory} />
        </div>
      </div>

      <div className="text-[0.875rem] text-text-secondary">
        Beschreibung
        <RichEditor
          value={description}
          onChange={setDescription}
          placeholder="Wie sieht es hier aus, wie riecht es, wer hängt hier rum?"
          minHeight="min-h-[8rem]"
          className="mt-1"
        />
      </div>

      {/* Vibes: Fotos oder Pinterest-Board */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-1">
          Vibes{" "}
          {vibesMode === "images" && (
            <span className="text-text-tertiary">
              ({images.length}/{MAX_IMAGES})
            </span>
          )}
        </div>
        <div className="mb-2 flex gap-1.5">
          {(
            [
              ["images", "Bilder hochladen"],
              ["pinterest", "Pinterest-Board"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={vibesMode === value}
              onClick={() => setVibesMode(value)}
              className={`rounded-md border px-3 py-1.5 text-[0.8125rem] ${
                vibesMode === value
                  ? "border-accent/70 bg-accent-soft text-text-primary"
                  : "border-border-subtle bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {vibesMode === "pinterest" ? (
          <input
            value={pinterest}
            onChange={(e) => setPinterest(e.target.value)}
            placeholder="https://pinterest.com/name/board/"
            aria-label="Pinterest-URL"
            className={field}
          />
        ) : (
        <>
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
                  className="on-dark absolute right-1 top-1 rounded bg-black/60 p-1 text-text-primary opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
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
        </>
        )}
      </div>

      <PeopleEditor people={people} setPeople={setPeople} />

      <div className="flex items-center justify-end gap-3">
        {isAdmin && (
          <button
            onClick={() => setDeleting(true)}
            className="mr-auto inline-flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
          >
            Ort löschen
          </button>
        )}
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

      {deleting && sceneCount === 0 && (
        <ConfirmDialog
          title={`${loc.name} löschen?`}
          text="Der Ort verschwindet von der Karte, samt Beschreibung, Bildern und hinterlegten Personen. Das lässt sich nicht rückgängig machen."
          confirmLabel="Ort löschen"
          onCancel={() => setDeleting(false)}
          onConfirm={remove}
        />
      )}
      {deleting && sceneCount > 0 && (
        <div
          onClick={() => setDeleting(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={`${loc.name} löschen?`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setDeleting(false)}
            className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-2xl shadow-black/70"
          >
            <div className="font-serif text-[1rem] text-text-primary">{loc.name} löschen?</div>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-text-secondary">
              {sceneCount === 1 ? "An diesem Ort spielt 1 Szene." : `An diesem Ort spielen ${sceneCount} Szenen.`} Wohin
              {sceneCount === 1 ? " soll sie" : " sollen sie"} umziehen? Beschreibung, Bilder und hinterlegte Personen
              des Orts gehen verloren.
            </p>
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              autoFocus
              aria-label="Szenen verschieben nach"
              className={`mt-3 ${field}`}
            >
              <option value="" className="bg-bg-surface">
                Ort wählen …
              </option>
              {targets.map((l) => (
                <option key={l.id} value={l.id} className="bg-bg-surface">
                  {l.name} · {areaName(l.area)}
                </option>
              ))}
            </select>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleting(false)}
                className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
              >
                Abbrechen
              </button>
              <button
                onClick={remove}
                disabled={!moveTo}
                className="rounded-md border border-red-400/50 bg-red-500/15 px-3 py-1.5 text-[0.8125rem] font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-40"
              >
                Verschieben und löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
