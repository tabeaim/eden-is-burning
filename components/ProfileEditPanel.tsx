"use client";

import { useRef, useState } from "react";
import type { Character, CharacterProfile } from "@/lib/types";
import { useStore } from "@/lib/store";
import { tierOf } from "@/lib/characters";
import { AREA_ORDER, AREAS } from "@/lib/world";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { characterImage } from "@/lib/avatar";
import { Icon } from "./Icon";

const MAX_VIBES = 12;

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// „a, b, c" <-> ["a", "b", "c"]
const toList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

// Profil direkt im Profil bearbeiten: alles Beschreibende – Zitat, Banner,
// ausführliche Beschreibung, Eigenschaften, Skills, Slider, Likes/Dislikes,
// Timeline; bei Supporting Characters und Statist*innen dazu „Vibes"
// (Inspo-Bilder). Die Grunddaten stehen unter Einstellungen → Meine Charaktere –
// außer bei Statist*innen: Die darf jede*r bearbeiten, deshalb stehen ihre
// Grunddaten gleich hier mit.
export function ProfileEditPanel({ character, onClose }: { character: Character; onClose: () => void }) {
  const { updateCharacter } = useStore();
  const tier = tierOf(character);
  const [d, setD] = useState(character);
  const prof = character.profile ?? {};
  const [skills, setSkills] = useState(prof.skills ?? []);
  const [sliders, setSliders] = useState(prof.sliders ?? []);
  const [timeline, setTimeline] = useState(prof.timeline ?? []);
  const [plus, setPlus] = useState((prof.traits_plus ?? []).join(", "));
  const [minus, setMinus] = useState((prof.traits_minus ?? []).join(", "));
  const [likes, setLikes] = useState((prof.likes ?? []).join(", "));
  const [dislikes, setDislikes] = useState((prof.dislikes ?? []).join(", "));
  const [uploading, setUploading] = useState<null | "banner" | "photo" | "vibes">(null);
  const bannerFile = useRef<HTMLInputElement>(null);
  const photoFile = useRef<HTMLInputElement>(null);
  const vibesFile = useRef<HTMLInputElement>(null);
  const vibes = d.vibes ?? [];

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
  async function uploadVibes(files: FileList | null) {
    const picked = Array.from(files ?? []).slice(0, Math.max(0, MAX_VIBES - vibes.length));
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

  function save() {
    if (nameMissing) return;
    // Nur die beschreibenden Schlüssel des erweiterten Profils überschreiben –
    // die Grunddaten darin (Geburtsdatum, Studium …) pflegen die Einstellungen.
    const profile: CharacterProfile = {
      ...(character.profile ?? {}),
      skills: skills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), value: s.value })),
      sliders: sliders.filter((s) => s.left.trim() || s.right.trim()),
      timeline: timeline
        .filter((t) => t.year.trim() || t.title.trim() || t.text.trim())
        .sort((a, b) => a.year.localeCompare(b.year, "de", { numeric: true })),
      traits_plus: toList(plus),
      traits_minus: toList(minus),
      likes: toList(likes),
      dislikes: toList(dislikes),
    };
    const patch: Partial<Character> = {
      quote: d.quote,
      personality: d.personality,
      banner_url: d.banner_url,
      profile,
    };
    if (tier === "main") patch.pinterest_url = d.pinterest_url;
    // Vibes (Inspo-Bilder) nur Supporting Characters und Statist*innen
    if (tier !== "main") patch.vibes = vibes;
    if (tier === "extra") {
      Object.assign(patch, {
        name: d.name.trim(),
        full_name: d.full_name,
        tagline: d.tagline,
        bio: d.bio,
        role: d.role,
        age: d.age,
        area: d.area,
        faceclaim_image_url: d.faceclaim_image_url,
        height: d.height,
        figure: d.figure,
        hair: d.hair,
        eyes: d.eyes,
      });
    }
    updateCharacter(character.id, patch);
    onClose();
  }

  const label = "block text-[0.875rem] text-text-secondary";
  const group = "mt-2 text-[0.8125rem] uppercase tracking-wider font-semibold text-text-tertiary";
  const hint = "text-[0.8125rem] text-text-tertiary";
  const uploadBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50";
  const addBtn =
    "flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent";
  const removeBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.06] hover:text-red-300";

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
              Anzeigename <span className="text-accent">*</span>
              <input
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                className={`mt-1 ${field} ${nameMissing ? "!border-red-400/70" : ""}`}
              />
            </label>
            <label className={label}>
              Voller Name
              <input {...text("full_name")} placeholder={d.name} className={`mt-1 ${field}`} />
            </label>
            <label className={label}>
              Beschäftigung
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
              Wohngegend
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
            <label className={label}>
              Tagline ({(d.tagline ?? "").length}/60)
              <input {...text("tagline")} maxLength={60} className={`mt-1 uppercase ${field}`} />
            </label>
          </div>
          <label className={label}>
            Kurzbeschreibung ({(d.bio ?? "").length}/1000)
            <textarea {...text("bio")} maxLength={1000} rows={3} className={`mt-1 resize-y ${field}`} />
          </label>
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
      )}

      <div className={group}>Auf einen Blick</div>
      <label className={label}>
        Zitat
        <input {...text("quote")} className={`mt-1 ${field}`} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[0.875rem] text-text-secondary">Profil-Banner</span>
        <button disabled={uploading !== null} onClick={() => bannerFile.current?.click()} className={uploadBtn}>
          <Icon name="upload" size={13} />{" "}
          {uploading === "banner" ? "Lädt…" : d.banner_url ? "Banner ersetzen" : "Banner hochladen"}
        </button>
        {d.banner_url && (
          <button onClick={() => set("banner_url", null)} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Banner entfernen
          </button>
        )}
        <input ref={bannerFile} type="file" accept="image/*" hidden onChange={(e) => void upload("banner", e.target.files?.[0])} />
      </div>

      <div className={group}>Ausführliche Beschreibung</div>
      <textarea {...text("personality")} rows={6} className={`resize-y ${field}`} placeholder="Wer ist dieser Charakter?" />

      <div className={group}>Charaktereigenschaften</div>
      <p className={`-mt-2 ${hint}`}>Mit Komma getrennt, z. B. ehrlich, loyal, ehrgeizig.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          Stärken (+)
          <textarea value={plus} onChange={(e) => setPlus(e.target.value)} rows={2} className={`mt-1 resize-y ${field}`} />
        </label>
        <label className={label}>
          Schwächen (–)
          <textarea value={minus} onChange={(e) => setMinus(e.target.value)} rows={2} className={`mt-1 resize-y ${field}`} />
        </label>
      </div>

      <div className={group}>Skills</div>
      {skills.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={s.name}
            onChange={(e) => setSkills(skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="Skill, z. B. Casual Flirting"
            className={`${field} min-w-40 flex-1`}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={s.value}
            onChange={(e) => setSkills(skills.map((x, j) => (j === i ? { ...x, value: parseInt(e.target.value, 10) } : x)))}
            aria-label={`${s.name || "Skill"} in Prozent`}
            className="w-32 accent-[var(--accent)]"
          />
          <span className="w-10 text-right text-[0.8125rem] tabular-nums text-text-secondary">{s.value}%</span>
          <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} aria-label="Skill entfernen" className={removeBtn}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setSkills([...skills, { name: "", value: 50 }])} className={addBtn}>
        <Icon name="plus" size={12} /> Skill
      </button>

      <div className={group}>Slider</div>
      <p className={`-mt-2 ${hint}`}>Zwei Pole und wo der Charakter dazwischen steht.</p>
      {sliders.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={s.left}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))}
            placeholder="links, z. B. Rules are there to be followed"
            className={`${field} min-w-36 flex-1`}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={s.value}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, value: parseInt(e.target.value, 10) } : x)))}
            aria-label="Position zwischen den Polen"
            className="w-28 accent-[var(--accent)]"
          />
          <input
            value={s.right}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))}
            placeholder="rechts"
            className={`${field} min-w-36 flex-1`}
          />
          <button onClick={() => setSliders(sliders.filter((_, j) => j !== i))} aria-label="Slider entfernen" className={removeBtn}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setSliders([...sliders, { left: "", right: "", value: 50 }])} className={addBtn}>
        <Icon name="plus" size={12} /> Slider
      </button>

      <div className={group}>Likes / Dislikes</div>
      <p className={`-mt-2 ${hint}`}>Mit Komma getrennt.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          Likes
          <textarea value={likes} onChange={(e) => setLikes(e.target.value)} rows={3} className={`mt-1 resize-y ${field}`} />
        </label>
        <label className={label}>
          Dislikes
          <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} rows={3} className={`mt-1 resize-y ${field}`} />
        </label>
      </div>

      <div className={group}>Timeline (Reiter „Biography")</div>
      <p className={`-mt-2 ${hint}`}>Wird beim Speichern nach Jahr sortiert.</p>
      {timeline.map((t, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border-subtle p-2">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr]">
            <input
              value={t.year}
              onChange={(e) => setTimeline(timeline.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
              placeholder="Jahr"
              className={field}
            />
            <input
              value={t.title}
              onChange={(e) => setTimeline(timeline.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              placeholder="Ereignis, z. B. High School Diploma"
              className={field}
            />
            <textarea
              value={t.text}
              onChange={(e) => setTimeline(timeline.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder="Was ist passiert?"
              rows={2}
              className={`resize-y sm:col-span-2 ${field}`}
            />
          </div>
          <button onClick={() => setTimeline(timeline.filter((_, j) => j !== i))} aria-label="Eintrag entfernen" className={removeBtn}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setTimeline([...timeline, { year: "", title: "", text: "" }])} className={addBtn}>
        <Icon name="plus" size={12} /> Timeline-Eintrag
      </button>

      {tier === "main" && (
        <>
          <div className={group}>Links</div>
          <label className={label}>
            Pinterest-URL
            <input {...text("pinterest_url")} className={`mt-1 ${field}`} />
          </label>
        </>
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
