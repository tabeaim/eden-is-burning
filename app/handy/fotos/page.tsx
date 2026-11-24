"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { PhonePhoto } from "@/lib/types";
import { PHOTOS_MAX, PHOTOS_PER_UPLOAD } from "@/lib/phone";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

const newId = () => `photo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Fotos-App des eigenen Handys: Fotos hochladen (mehrere auf einmal), groß
// ansehen und durchblättern, Bildunterschrift eintragen. „Ordnen" schiebt Fotos
// nach vorne oder hinten und löscht sie. Gespeichert im Handy (`phone.photos`).
export default function PhotosPage() {
  const { updateCharacter } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  const [openId, setOpenId] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PhonePhoto | null>(null);
  const [caption, setCaption] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const photos = me?.phone?.photos ?? [];
  const index = photos.findIndex((p) => p.id === openId);
  const open = index >= 0 ? photos[index] : null;

  // Bildunterschrift des offenen Fotos zum Bearbeiten übernehmen
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaption(open?.caption ?? "");
  }, [open?.id, open?.caption]);

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Fotos gibt es nur auf dem Handy eines eigenen Charakters.
        </p>
      </PhoneFrame>
    );
  }
  const owner = me;

  const save = (next: PhonePhoto[]) => updateCharacter(owner.id, { phone: { ...owner.phone, photos: next } });

  async function add(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setError(null);
    const room = Math.max(0, PHOTOS_MAX - photos.length);
    const take = files.slice(0, Math.min(PHOTOS_PER_UPLOAD, room));
    if (take.length < files.length) {
      setError(
        room < files.length
          ? `Auf ein Handy passen höchstens ${PHOTOS_MAX} Fotos.`
          : `Höchstens ${PHOTOS_PER_UPLOAD} Fotos auf einmal.`,
      );
    }
    if (!take.length) return;
    setUploading({ done: 0, total: take.length });
    const added: PhonePhoto[] = [];
    for (const f of take) {
      try {
        added.push({ id: newId(), url: await uploadImage(f, "phone", IMAGE_SIZES.gallery) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Das hat nicht geklappt.");
      }
      setUploading({ done: added.length, total: take.length });
    }
    // neueste vorne, wie in einer Galerie
    if (added.length) save([...added.reverse(), ...photos]);
    setUploading(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  }
  function saveCaption() {
    if (!open || (open.caption ?? "") === caption.trim()) return;
    save(photos.map((p) => (p.id === open.id ? { ...p, caption: caption.trim() || undefined } : p)));
  }
  function step(dir: -1 | 1) {
    saveCaption();
    setOpenId(photos[(index + dir + photos.length) % photos.length].id);
  }

  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[0.8125rem] text-white hover:bg-black/80 disabled:opacity-30";

  return (
    <PhoneFrame
      owner={owner.id}
      options={myChars.map((c) => c.id)}
      onOwner={(id) => {
        setOpenId(null);
        setOrdering(false);
        setOwner(id);
      }}
    >
      <PhoneHeader
        back="/handy"
        actions={
          <>
            {photos.length > 0 && (
              <button
                onClick={() => setOrdering((v) => !v)}
                className={`px-2 text-[0.875rem] ${ordering ? "font-semibold text-accent" : "text-text-secondary hover:text-text-primary"}`}
              >
                {ordering ? "Fertig" : "Ordnen"}
              </button>
            )}
            {!ordering && (
              <button
                onClick={() => file.current?.click()}
                disabled={!!uploading || photos.length >= PHOTOS_MAX}
                aria-label="Fotos hinzufügen"
                title="Fotos hinzufügen"
                className="flex h-9 w-9 items-center justify-center text-accent disabled:opacity-40"
              >
                <Icon name="plus" size={22} />
              </button>
            )}
            <input
              ref={file}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const list = e.target.files;
                void add(list).finally(() => {
                  if (file.current) file.current.value = "";
                });
              }}
            />
          </>
        }
      >
        <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">Fotos</div>
      </PhoneHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {uploading && (
          <p className="px-3 py-2 text-center text-[0.8125rem] text-text-tertiary">
            Lädt hoch … {uploading.done} / {uploading.total}
          </p>
        )}
        {error && <p className="px-3 py-2 text-center text-[0.8125rem] text-red-300">{error}</p>}
        {photos.length === 0 && !uploading && (
          <p className="px-8 pt-16 text-center text-[0.875rem] text-text-tertiary">
            Noch keine Fotos. Mit dem Plus oben rechts fügst du welche hinzu.
          </p>
        )}
        <div className="grid grid-cols-3 gap-0.5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square bg-bg-surface-2">
              <button
                onClick={() => !ordering && setOpenId(p.id)}
                disabled={ordering}
                aria-label={p.caption || `Foto ${i + 1}`}
                className="block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
              {ordering && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach vorne" className={iconBtn}>
                    ‹
                  </button>
                  <button onClick={() => setConfirmDelete(p)} aria-label="Löschen" className={`${iconBtn} hover:text-red-300`}>
                    ✕
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === photos.length - 1}
                    aria-label="Nach hinten"
                    className={iconBtn}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Großansicht im Display: ‹ › blättern, darunter die Bildunterschrift */}
      {open && (
        <div className="absolute inset-0 z-20 flex flex-col bg-black">
          <div className="flex shrink-0 items-center gap-2 px-2 py-2 text-white">
            <button
              onClick={() => {
                saveCaption();
                setOpenId(null);
              }}
              className="flex items-center gap-0.5 text-[0.9375rem] text-accent"
            >
              <Icon name="chevron-right" size={22} className="rotate-180" />
              Fotos
            </button>
            <span className="flex-1 text-center text-[0.8125rem] tabular-nums text-white/70">
              {index + 1} / {photos.length}
            </span>
            <span className="flex w-16 justify-end">
              <button
                onClick={() => setConfirmDelete(open)}
                aria-label="Foto löschen"
                title="Foto löschen"
                className="flex h-8 w-8 items-center justify-center text-white/60 hover:text-red-300"
              >
                <Icon name="trash" size={18} />
              </button>
            </span>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.caption ?? ""} className="max-h-full max-w-full object-contain" />
            {photos.length > 0 && (
              <>
                <button
                  onClick={() => step(-1)}
                  aria-label="Voriges Foto"
                  className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <Icon name="chevron-right" size={20} className="rotate-180" />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Nächstes Foto"
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <Icon name="chevron-right" size={20} />
                </button>
              </>
            )}
          </div>
          <div className="shrink-0 px-3 pb-3 pt-2">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="Bildunterschrift hinzufügen"
              maxLength={300}
              className="w-full rounded-md bg-white/[0.08] px-3 py-2 text-[16px] text-white outline-none placeholder:text-white/40 sm:text-[0.875rem]"
            />
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Foto löschen?"
          text="Das Foto verschwindet vom Handy."
          confirmLabel="Löschen"
          onConfirm={() => {
            save(photos.filter((x) => x.id !== confirmDelete.id));
            if (openId === confirmDelete.id) setOpenId(null);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </PhoneFrame>
  );
}
