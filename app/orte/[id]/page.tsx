"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import type { Character, Location } from "@/lib/types";

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

// Ortsprofil: Beschreibung, Inspo-Fotos, Szenen und Charaktere an diesem Ort.
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

  // Ortsname als Seitentitel, Titelbild des Orts als Banner
  useSetPageMeta(loc?.name ?? "Ort", undefined, loc?.image_url ?? undefined, "max-w-5xl");

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (!loc) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 text-text-tertiary">
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
  const activeCount = scenesHere.filter((s) => s.status === "active").length;
  const visitorIds = new Set(scenesHere.flatMap((s) => s.participant_ids));
  const visitors = characters.filter((c) => visitorIds.has(c.id));
  const creator = loc.created_by ? player(loc.created_by) : undefined;
  const images = loc.images ?? [];

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Kopfzeile: zurück zur Karte, Bezirk, Status, Bearbeiten */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link
          href="/orte"
          className="inline-flex items-center gap-1 text-[0.875rem] text-text-secondary hover:text-accent transition-colors"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" /> Karte
        </Link>
        <span className="rounded-full border border-border-subtle bg-white/[0.03] px-2.5 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-secondary">
          {areaName(loc.area)}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[0.8125rem] uppercase tracking-wider ${
            scenesHere.length > 0
              ? "border-accent/40 bg-accent-soft text-text-primary"
              : "border-border-subtle bg-white/[0.03] text-text-tertiary"
          }`}
        >
          {scenesHere.length > 0 ? "Bespielt" : "Ortsidee"}
        </span>
        {activeCount > 0 && (
          <span className="text-[0.8125rem] uppercase tracking-wider text-accent">
            {activeCount} aktive {activeCount === 1 ? "Szene" : "Szenen"}
          </span>
        )}
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[0.8125rem] uppercase tracking-wider text-text-secondary hover:text-text-primary"
          >
            <Icon name="edit" size={13} /> Bearbeiten
          </button>
        )}
      </div>

      {editing && <LocationEditPanel loc={loc} onClose={() => setEditing(false)} />}

      <div className="grid md:grid-cols-[1fr_260px] gap-10 items-start">
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

          <section>
            <Heading>inspo.</Heading>
            {images.length === 0 ? (
              <p className="text-[0.875rem] text-text-tertiary">
                Noch keine Inspo-Fotos.
                {canEdit && " Über „Bearbeiten“ kannst du welche hinzufügen."}
              </p>
            ) : (
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
            )}
          </section>

          <section>
            <Heading>scenes.</Heading>
            {scenesHere.length === 0 ? (
              <p className="text-[0.875rem] text-text-tertiary">
                Hier wurde noch nicht gespielt.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {scenesHere.map((s) => (
                  <Link
                    key={s.id}
                    href={`/szenen/${s.id}`}
                    className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-[1rem] text-text-primary">
                        {s.title}
                      </span>
                      {s.status === "active" && (
                        <span className="text-[0.8125rem] uppercase tracking-wider text-accent">
                          aktiv
                        </span>
                      )}
                    </div>
                    <div className="text-[0.875rem] text-text-tertiary">
                      {formatInplayDate(s.inplay_date)} · {postsOf(s.id).length} Posts
                    </div>
                  </Link>
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
              <dt className="text-text-tertiary">Szenen:</dt>
              <dd className="text-text-secondary">{scenesHere.length}</dd>
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
              <Heading>seen here.</Heading>
              <div className="flex flex-wrap gap-1.5">
                {visitors.map((c) => (
                  <CharacterChip key={c.id} c={c} />
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

      {/* Großansicht eines Inspo-Fotos */}
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

function CharacterChip({ c }: { c: Character }) {
  return (
    <Link
      href={`/charaktere/${c.id}`}
      className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-primary pl-1 pr-2.5 py-0.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.faceclaim_image_url ?? ""}
        alt={c.name}
        className="w-4 h-4 rounded-full object-cover"
      />
      {c.name}
    </Link>
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
    });
    onClose();
  }

  return (
    <div className="mb-8 rounded-xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-4">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
        Ort bearbeiten
      </div>

      {/* Titelbild */}
      <div>
        <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
          <span>Titelbild</span>
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
          style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
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

      {/* Inspo-Fotos */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-1">
          Inspo-Fotos{" "}
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
