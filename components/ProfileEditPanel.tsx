"use client";

import { useRef, useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { tierOf } from "@/lib/characters";
import { AREA_ORDER, AREAS } from "@/lib/world";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { characterImage } from "@/lib/avatar";
import { Icon } from "./Icon";

const MAX_VIBES = 12;

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Profil direkt im Profil bearbeiten: alles Inhaltliche (Tagline, Zitat,
// Beschreibung, Persönlichkeit, Looks, Facts, Banner; bei Supporting Characters
// und Statist*innen dazu „Vibes" – Inspo-Bilder). Die harten Fakten und
// Einstellungen (Name, Foto, Handy, Zuordnung …) stehen unter Einstellungen →
// Meine Charaktere – außer bei Statist*innen: Die darf jede*r bearbeiten, deshalb
// stehen ihre Grunddaten gleich hier mit.
export function ProfileEditPanel({ character, onClose }: { character: Character; onClose: () => void }) {
  const { updateCharacter } = useStore();
  const tier = tierOf(character);
  const [d, setD] = useState(character);
  const [uploading, setUploading] = useState<null | "banner" | "photo" | "vibes">(null);
  const vibesFile = useRef<HTMLInputElement>(null);
  const vibes = d.vibes ?? [];
  async function uploadVibes(files: FileList | null) {
    const room = Math.max(0, MAX_VIBES - vibes.length);
    const picked = Array.from(files ?? []).slice(0, room);
    if (picked.length === 0) return;
    setUploading("vibes");
    try {
      const urls: string[] = [];
      for (const f of picked) urls.push(await uploadImage(f, "characters", IMAGE_SIZES.gallery));
      setD((x) => ({ ...x, vibes: [...(x.vibes ?? []), ...urls] }));
    } finally {
      setUploading(null);
    }
  }
  const bannerFile = useRef<HTMLInputElement>(null);
  const photoFile = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Character>(key: K, value: Character[K]) => setD((x) => ({ ...x, [key]: value }));
  const text = (key: keyof Character) => ({
    value: (d[key] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, (e.target.value || null) as never),
    className: field,
  });
  const nameMissing = !d.name.trim();

  async function upload(kind: "banner" | "photo", f: File | undefined) {
    if (!f) return;
    setUploading(kind);
    try {
      if (kind === "banner") set("banner_url", await uploadImage(f, "characters", IMAGE_SIZES.banner));
      else set("faceclaim_image_url", await uploadImage(f, "characters", IMAGE_SIZES.portrait));
    } finally {
      setUploading(null);
    }
  }

  function save() {
    if (nameMissing) return;
    // Nur die Felder dieses Formulars schicken – nichts, was woanders gepflegt wird
    const patch: Partial<Character> = {
      tagline: d.tagline,
      quote: d.quote,
      bio: d.bio,
      personality: d.personality,
      banner_url: d.banner_url,
      full_name: d.full_name,
    };
    // Looks haben alle Stufen
    Object.assign(patch, { height: d.height, figure: d.figure, hair: d.hair, eyes: d.eyes });
    // Vibes (Inspo-Bilder) nur Supporting Characters und Statist*innen
    if (tier !== "main") patch.vibes = d.vibes ?? [];
    if (tier === "main") {
      Object.assign(patch, {
        sexuality: d.sexuality,
        status: d.status,
        origin: d.origin,
        job: d.job,
        company: d.company,
        pinterest_url: d.pinterest_url,
      });
    }
    if (tier === "extra") {
      Object.assign(patch, {
        name: d.name.trim(),
        role: d.role,
        age: d.age,
        area: d.area,
        faceclaim_image_url: d.faceclaim_image_url,
      });
    }
    updateCharacter(character.id, patch);
    onClose();
  }

  const label = "block text-[0.875rem] text-text-secondary";
  const group = "text-[0.8125rem] uppercase tracking-wider font-semibold text-text-tertiary";
  const uploadBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50";

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">Profil bearbeiten</div>

      {tier === "extra" && (
        <>
          <div className={group}>Grunddaten</div>
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterImage(d)} alt="" className="h-14 w-14 rounded-full object-cover bg-bg-primary" />
            <button disabled={uploading !== null} onClick={() => photoFile.current?.click()} className={uploadBtn}>
              <Icon name="upload" size={13} /> {uploading === "photo" ? "Lädt…" : "Bild hochladen"}
            </button>
            <input ref={photoFile} type="file" accept="image/*" hidden onChange={(e) => void upload("photo", e.target.files?.[0])} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={label}>
              Name <span className="text-accent">*</span>
              <input
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                className={`mt-1 ${field} ${nameMissing ? "!border-red-400/70" : ""}`}
              />
            </label>
            <label className={label}>
              Rolle
              <input {...text("role")} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Alter
              <input
                type="number"
                value={d.age ?? ""}
                onChange={(e) => set("age", e.target.value ? parseInt(e.target.value, 10) : null)}
                className={`mt-1 ${field}`}
              />
            </label>
            <label className={label}>
              Gegend
              <select value={d.area} onChange={(e) => set("area", e.target.value)} className={`mt-1 ${field}`}>
                <option value="" className="bg-bg-surface">
                  –
                </option>
                {AREA_ORDER.map((k) => (
                  <option key={k} value={k} className="bg-bg-surface">
                    {AREAS[k].name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      <div className={group}>Auf einen Blick</div>
      <label className={label}>
        Tagline ({(d.tagline ?? "").length}/60)
        <input {...text("tagline")} maxLength={60} className={`mt-1 ${field}`} />
      </label>
      <label className={label}>
        Zitat
        <input {...text("quote")} className={`mt-1 ${field}`} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[0.875rem] text-text-secondary">Profil-Banner</span>
        <button disabled={uploading !== null} onClick={() => bannerFile.current?.click()} className={uploadBtn}>
          <Icon name="upload" size={13} /> {uploading === "banner" ? "Lädt…" : d.banner_url ? "Banner ersetzen" : "Banner hochladen"}
        </button>
        {d.banner_url && (
          <button onClick={() => set("banner_url", null)} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Banner entfernen
          </button>
        )}
        <input ref={bannerFile} type="file" accept="image/*" hidden onChange={(e) => void upload("banner", e.target.files?.[0])} />
      </div>

      <div className={group}>Texte</div>
      <label className={label}>
        Beschreibung ({(d.bio ?? "").length}/1000)
        <textarea {...text("bio")} maxLength={1000} rows={4} className={`mt-1 resize-y ${field}`} />
      </label>
      <label className={label}>
        Persönlichkeit
        <textarea {...text("personality")} rows={4} className={`mt-1 resize-y ${field}`} />
      </label>

      <div className={group}>Facts</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          Voller Name
          <input {...text("full_name")} placeholder={d.name} className={`mt-1 ${field}`} />
        </label>
        {tier === "main" && (
          <>
            <label className={label}>
              Sexuality
              <input {...text("sexuality")} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Status
              <input {...text("status")} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Origin
              <input {...text("origin")} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Job
              <input {...text("job")} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Company
              <input {...text("company")} className={`mt-1 ${field}`} />
            </label>
          </>
        )}
      </div>

      <>
          <div className={group}>Looks</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["height", "Größe"],
                ["figure", "Figur"],
                ["hair", "Haare"],
                ["eyes", "Augen"],
              ] as [keyof Character, string][]
            ).map(([key, name]) => (
              <label key={key} className={label}>
                {name}
                <input {...text(key)} className={`mt-1 ${field}`} />
              </label>
            ))}
          </div>
      </>

      {tier === "main" && (
        <label className={label}>
          Pinterest-URL
          <input {...text("pinterest_url")} className={`mt-1 ${field}`} />
        </label>
      )}

      {tier !== "main" && (
        <>
          <div className={group}>
            Vibes{" "}
            <span className="font-normal normal-case tracking-normal">
              ({vibes.length}/{MAX_VIBES} Inspo-Bilder)
            </span>
          </div>
          {vibes.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {vibes.map((src, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                  <button
                    onClick={() => set("vibes", vibes.filter((_, j) => j !== i))}
                    aria-label="Bild entfernen"
                    title="Bild entfernen"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[0.75rem] text-white hover:bg-red-500/80"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div>
            <button
              disabled={uploading !== null || vibes.length >= MAX_VIBES}
              onClick={() => vibesFile.current?.click()}
              className={uploadBtn}
            >
              <Icon name="upload" size={13} /> {uploading === "vibes" ? "Lädt…" : "Bilder hochladen"}
            </button>
            <input
              ref={vibesFile}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void uploadVibes(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={nameMissing || uploading !== null}
          className="rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
