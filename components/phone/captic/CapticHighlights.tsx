"use client";

import { useMemo, useState } from "react";
import type { CapticHighlight, CapticHighlightItem, Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CropDialog } from "@/components/CropDialog";
import { DatePicker } from "@/components/DatePicker";
import { capticField } from "./CapticCompose";

// Titelbild eines Highlights: das gewählte, sonst das erste Bild darin
export function highlightCover(h: Pick<CapticHighlight, "cover_url" | "items">): string | null {
  return h.cover_url || h.items.find((i) => i.kind !== "video")?.url || null;
}

function Cover({ url, size }: { url: string | null; size: number }) {
  return (
    <span className="inline-block shrink-0 rounded-full border border-white/20 p-[3px]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          style={{ width: size, height: size }}
          className="block rounded-full bg-bg-surface-2 object-cover"
        />
      ) : (
        <span style={{ width: size, height: size }} className="block rounded-full bg-bg-surface-2" />
      )}
    </span>
  );
}

// Highlights als Kreise unter der Bio; im eigenen Profil mit „Neu" am Anfang.
export function HighlightRow({
  who,
  own,
  onOpen,
  onNew,
}: {
  who: Character;
  own: boolean;
  onOpen: (highlightId: string) => void;
  onNew: () => void;
}) {
  const { capticHighlights } = useStore();
  const list = capticHighlights
    .filter((h) => h.character_id === who.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!own && list.length === 0) return null;
  const name = "w-[4.25rem] truncate text-center text-[0.6875rem] text-text-secondary";

  return (
    <div className="mt-3 flex gap-2.5 overflow-x-auto px-3">
      {own && (
        <button onClick={onNew} className="flex shrink-0 flex-col items-center gap-1" aria-label="Neues Highlight">
          <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-dashed border-white/30 text-text-secondary">
            <Icon name="plus" size={22} />
          </span>
          <span className={name}>Neu</span>
        </button>
      )}
      {list.map((h) => (
        <button
          key={h.id}
          onClick={() => onOpen(h.id)}
          aria-label={`Highlight ${h.name} ansehen`}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <Cover url={highlightCover(h)} size={58} />
          <span className={name}>{h.name}</span>
        </button>
      ))}
    </div>
  );
}

// Highlight anlegen oder bearbeiten: Name, Titelbild, enthaltene Stories (je mit
// optionalem Inplay-Datum). Zur Auswahl stehen die aktuellen Stories und alles,
// was schon im Highlight liegt.
export function CapticHighlightEditor({
  owner,
  highlight,
  onDone,
  onCancel,
}: {
  owner: Character;
  highlight?: CapticHighlight; // vorhanden: bearbeiten
  onDone: () => void;
  onCancel: () => void;
}) {
  const { capticStories, addCapticHighlight, updateCapticHighlight, deleteCapticHighlight } = useStore();
  const [name, setName] = useState(highlight?.name ?? "");
  const [selected, setSelected] = useState<string[]>(() => highlight?.items.map((i) => i.id) ?? []);
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries((highlight?.items ?? []).map((i) => [i.id, i.inplay_date ?? ""])),
  );
  const [cover, setCover] = useState<string | null>(highlight?.cover_url ?? null);
  const [cropping, setCropping] = useState<{ file: File; src: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const pool = useMemo<CapticHighlightItem[]>(() => {
    const kept = highlight?.items ?? [];
    const known = new Set(kept.map((i) => i.id));
    const fresh = capticStories
      .filter((s) => s.character_id === owner.id && !known.has(s.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((s) => ({ id: s.id, kind: s.kind, url: s.url, ar: s.ar, caption: s.caption }));
    return [...kept, ...fresh];
  }, [capticStories, highlight, owner.id]);
  const items = pool
    .filter((p) => selected.includes(p.id))
    .map((p) => ({ ...p, inplay_date: dates[p.id] || null }));

  function toggle(item: CapticHighlightItem) {
    const on = selected.includes(item.id);
    if (on && cover === item.url) setCover(null);
    setSelected(on ? selected.filter((id) => id !== item.id) : [...selected, item.id]);
  }

  async function cropped(crop: { x: number; y: number; w: number; h: number } | null) {
    const c = cropping;
    if (!c) return;
    setCropping(null);
    setUploading(true);
    setError(null);
    try {
      setCover(await uploadImage(c.file, "captic", IMAGE_SIZES.avatar, crop));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Das hat nicht geklappt.");
    } finally {
      URL.revokeObjectURL(c.src);
      setUploading(false);
    }
  }

  function save() {
    const fields = { name: name.trim(), cover_url: cover, items };
    if (highlight) updateCapticHighlight(highlight.id, fields);
    else addCapticHighlight({ character_id: owner.id, ...fields });
    onDone();
  }

  const label = "text-[0.75rem] text-text-tertiary";
  const thumb = (item: CapticHighlightItem, className: string) =>
    item.kind === "video" ? (
      <video src={item.url} muted playsInline preload="metadata" className={className} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt="" loading="lazy" className={className} />
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3 px-3 py-3">
        <div className="flex items-center gap-3">
          <Cover url={highlightCover({ cover_url: cover, items })} size={58} />
          <label className={`min-w-0 flex-1 ${label}`}>
            Name
            <input
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 ${capticField}`}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.8125rem]">
          <label className="font-medium text-accent hover:underline">
            {uploading ? "Lädt hoch …" : "Eigenes Titelbild hochladen"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setCropping({ file: f, src: URL.createObjectURL(f) });
              }}
            />
          </label>
          {cover && (
            <button onClick={() => setCover(null)} className="text-text-tertiary hover:text-text-primary">
              Erstes Bild nehmen
            </button>
          )}
          {error && <span className="text-red-300">{error}</span>}
        </div>

        <div>
          <div className={label}>Stories ({items.length} gewählt)</div>
          {pool.length === 0 ? (
            <p className="mt-1 text-[0.8125rem] leading-snug text-text-tertiary">
              {owner.name.split(" ")[0]} hat noch keine Story. Erst eine Story posten (Plus am Profilbild), dann
              lässt sie sich hier ablegen.
            </p>
          ) : (
            <div className="mt-1 grid grid-cols-4 gap-1">
              {pool.map((item) => {
                const on = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item)}
                    aria-pressed={on}
                    aria-label={on ? "Story aus dem Highlight nehmen" : "Story ins Highlight legen"}
                    className={`relative aspect-[9/16] overflow-hidden rounded-md bg-white/[0.04] ${
                      on ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {thumb(item, "h-full w-full object-cover")}
                    {on && (
                      <span className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-black">
                        <Icon name="check" size={12} strokeWidth={2.6} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            {thumb(item, "h-16 w-9 shrink-0 rounded object-cover")}
            <div className={`min-w-0 flex-1 ${label}`}>
              Inplay-Datum (optional)
              <DatePicker
                value={dates[item.id] ?? ""}
                onChange={(iso) => setDates({ ...dates, [item.id]: iso })}
                className="mt-1"
              />
              {item.kind !== "video" && (
                <button
                  onClick={() => setCover(item.url)}
                  disabled={cover === item.url}
                  className="mt-1 text-[0.8125rem] font-medium text-accent hover:underline disabled:text-text-tertiary disabled:no-underline"
                >
                  {cover === item.url ? "Ist das Titelbild" : "Als Titelbild"}
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          {highlight && (
            <button
              onClick={() => setConfirm(true)}
              className="rounded-md px-1 py-1.5 text-[0.8125rem] text-red-300 hover:underline"
            >
              Highlight löschen
            </button>
          )}
          <button
            onClick={onCancel}
            className="ml-auto rounded-md px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || items.length === 0 || uploading}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>

      {cropping && (
        <CropDialog
          src={cropping.src}
          ratios={[{ label: "Quadrat", value: 1 }]}
          hint="Hochgeladen wird nur der Ausschnitt; angezeigt wird er rund."
          onDone={cropped}
          onCancel={() => {
            URL.revokeObjectURL(cropping.src);
            setCropping(null);
          }}
        />
      )}
      {confirm && highlight && (
        <ConfirmDialog
          title="Highlight löschen?"
          text={`„${highlight.name}" verschwindet aus dem Profil. Die Stories selbst bleiben, wo sie sind.`}
          confirmLabel="Highlight löschen"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            deleteCapticHighlight(highlight.id);
            onDone();
          }}
        />
      )}
    </div>
  );
}
