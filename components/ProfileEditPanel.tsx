"use client";

import { BannerPosition } from "./BannerPosition";
import { bannerStyle } from "@/lib/headers";
import { useRef, useState } from "react";
import type { Character, CharacterProfile, FamilyMember, ThingItem } from "@/lib/types";
import { ThingsBoard } from "./ThingsBoard";
import { FamilyEditor } from "./FamilyEditor";
import { normalizeFamily } from "./ProfileSections";
import { useStore } from "@/lib/store";
import { tierOf } from "@/lib/characters";
import { useCharacterBasics } from "./CharacterBasicsForm";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { Icon } from "./Icon";
import { Collapsible } from "./Collapsible";
import { RichEditor } from "./RichEditor";

const MAX_VIBES = 12;

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// „a, b, c" <-> ["a", "b", "c"]
const toList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

// Profil direkt im Profil bearbeiten – alles, was im Profil zu sehen ist: die
// Grunddaten (dieselben Felder wie unter Einstellungen → Meine Charaktere, siehe
// useCharacterBasics) und alles Beschreibende – Zitat, Header-Bild, ausführliche
// Beschreibung, Eigenschaften, Skills, Slider, Likes/Dislikes, Stammbaum,
// Timeline, der Style („Looks") und die Gegenstände („Pockets").
// Statist*innen haben nur die Grundangaben, dazu „Vibes": hochgeladene
// Inspo-Bilder oder ein eingebundenes Pinterest-Board.
export function ProfileEditPanel({ character, onClose }: { character: Character; onClose: () => void }) {
  const { updateCharacter } = useStore();
  const tier = tierOf(character);
  const full = tier !== "extra";
  const basics = useCharacterBasics(character, "profile");
  const [d, setD] = useState(character);
  const prof = character.profile ?? {};
  const [skills, setSkills] = useState(prof.skills ?? []);
  const [sliders, setSliders] = useState(prof.sliders ?? []);
  const [timeline, setTimeline] = useState(prof.timeline ?? []);
  const [family, setFamily] = useState<FamilyMember[]>(() => normalizeFamily(prof.family ?? []));
  const [selfParents, setSelfParents] = useState<string[]>(prof.family_parents ?? []);
  const [things, setThings] = useState<ThingItem[]>(prof.things ?? []);
  const [outfit, setOutfit] = useState<ThingItem[]>(prof.outfit ?? []);
  const { characters, npcs } = useStore();
  const everyone = [...characters, ...npcs].filter((c) => c.id !== character.id);
  const [plus, setPlus] = useState((prof.traits_plus ?? []).join(", "));
  const [minus, setMinus] = useState((prof.traits_minus ?? []).join(", "));
  const [likes, setLikes] = useState((prof.likes ?? []).join(", "));
  const [dislikes, setDislikes] = useState((prof.dislikes ?? []).join(", "));
  const [uploading, setUploading] = useState<null | "banner" | "vibes">(null);
  const bannerFile = useRef<HTMLInputElement>(null);
  const vibesFile = useRef<HTMLInputElement>(null);
  const vibes = d.vibes ?? [];
  // Vibes von Statist*innen: entweder Bilder oder ein Pinterest-Board
  const [vibesMode, setVibesMode] = useState<"images" | "pinterest">(
    character.pinterest_url ? "pinterest" : "images",
  );

  const set = <K extends keyof Character>(key: K, value: Character[K]) => setD((x) => ({ ...x, [key]: value }));
  const text = (key: keyof Character) => ({
    value: (d[key] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, (e.target.value || null) as never),
    className: field,
  });

  async function upload(f: File | undefined) {
    if (!f) return;
    setUploading("banner");
    try {
      set("banner_url", await uploadImage(f, "characters", IMAGE_SIZES.banner));
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
    if (basics.invalid) return;
    const base = basics.patch();
    // Statist*innen: nur die Grundangaben (und Vibes)
    if (!full) {
      // Pinterest-Modus: die Bilder bleiben gespeichert, gezeigt wird das Board
      updateCharacter(character.id, {
        ...base,
        vibes,
        pinterest_url: vibesMode === "pinterest" ? d.pinterest_url?.trim() || null : null,
      });
      onClose();
      return;
    }
    // Grunddaten und die beschreibenden Schlüssel des erweiterten Profils zusammen
    const profile: CharacterProfile = {
      ...(base.profile ?? {}),
      skills: skills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), value: s.value })),
      sliders: sliders.filter((s) => s.left.trim() || s.right.trim()),
      timeline: timeline
        .filter((t) => t.year.trim() || t.title.trim() || t.text.trim())
        .sort((a, b) => a.year.localeCompare(b.year, "de", { numeric: true })),
      ...(() => {
        const kept = normalizeFamily(family.filter((m) => m.name.trim()).map((m) => ({ ...m, name: m.name.trim() })));
        return {
          family: kept,
          family_parents: selfParents.filter((id) => kept.some((m) => m.id === id)),
        };
      })(),
      things,
      outfit,
      traits_plus: toList(plus),
      traits_minus: toList(minus),
      likes: toList(likes),
      dislikes: toList(dislikes),
    };
    const patch: Partial<Character> = {
      ...base,
      quote: d.quote,
      personality: d.personality,
      banner_url: d.banner_url,
      pinterest_url: d.pinterest_url,
      profile,
    };
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

      {/* Grunddaten – dieselben Felder wie in den Einstellungen */}
      {basics.form}

      {full && (
        <>
      <Collapsible title="Auf einen Blick" defaultOpen>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[0.875rem] text-text-secondary">Header-Bild (oben über dem Namen)</span>
        <button disabled={uploading !== null} onClick={() => bannerFile.current?.click()} className={uploadBtn}>
          <Icon name="upload" size={13} />{" "}
          {uploading === "banner" ? "Lädt…" : d.banner_url ? "Header ersetzen" : "Header hochladen"}
        </button>
        {d.banner_url && (
          <button onClick={() => set("banner_url", null)} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Header entfernen
          </button>
        )}
        <input
          ref={bannerFile}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void upload(f);
          }}
        />
      </div>
      {d.banner_url && (
        <div>
          <div
            style={bannerStyle(d.banner_url)}
            className="h-28 w-full rounded-md border border-border-subtle bg-cover"
          />
          <BannerPosition url={d.banner_url} onChange={(url) => set("banner_url", url)} />
        </div>
      )}
      <label className={label}>
        Zitat
        <input {...text("quote")} className={`mt-1 ${field}`} />
      </label>

      <div className={group}>Ausführliche Beschreibung</div>
      <RichEditor
        value={d.personality ?? ""}
        onChange={(v) => set("personality", v || null)}
        placeholder="Wer ist dieser Charakter?"
        minHeight="min-h-[10rem]"
      />

      </Collapsible>

      <Collapsible title="Eigenschaften">
      <div className={group}>Charaktereigenschaften</div>
      <p className={hint}>Mit Komma getrennt, z. B. ehrlich, loyal, ehrgeizig.</p>
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

      <div className={group}>Likes / Dislikes</div>
      <p className={hint}>Mit Komma getrennt.</p>
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
      </Collapsible>

      <Collapsible title="Skills & Slider">
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
      </Collapsible>

      <Collapsible title="Stammbaum">
      <p className={hint}>
        Bei jeder Person gibst du an, wessen Kind sie ist (Kind von) – auch bei deinem Charakter
        selbst. Partner*innen und Angeheiratete legst du unter ihrer Person an. Am schnellsten geht
        es über + Verwandte*r: Elternteil, Kind, Geschwister oder Partner*in, Platz im Baum und
        Verknüpfung ergeben sich dann von selbst. Wählst du beim Namen einen vorhandenen Charakter
        aus, führt der Eintrag im Stammbaum auf dessen Profil.
      </p>
      <FamilyEditor
          family={family}
          onChange={setFamily}
          selfParents={selfParents}
          onSelfParents={setSelfParents}
          character={character}
          everyone={everyone}
        />

      </Collapsible>

      <Collapsible title="Timeline">
      <p className={hint}>Steht im Reiter „Biography“. Wird beim Speichern nach Jahr sortiert.</p>
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
            <RichEditor
              value={t.text}
              onChange={(v) => setTimeline(timeline.map((x, j) => (j === i ? { ...x, text: v } : x)))}
              placeholder="Was ist passiert?"
              minHeight="min-h-[4rem]"
              className="sm:col-span-2"
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

      </Collapsible>

      <Collapsible title="Looks – Style">
      <p className={hint}>
        Was trägt dein Charakter? Die hochgeladenen Bilder erscheinen als Collage unter „Looks“.
      </p>
      <ThingsBoard items={outfit} onChange={setOutfit} />

      </Collapsible>

        </>
      )}

      {tier !== "extra" && (
        <Collapsible title="Pockets – Gegenstände">
          <p className={hint}>
            Was hat dein Charakter immer dabei? Die hochgeladenen Bilder erscheinen im Profil als
            Collage neben dem Handy.
          </p>
          <ThingsBoard items={things} onChange={setThings} />
        </Collapsible>
      )}

      {tier !== "extra" && (
        <Collapsible title="Moodboard (Pinterest)">
          <label className={label}>
            Pinterest-URL
            <input {...text("pinterest_url")} className={`mt-1 ${field}`} />
          </label>
        </Collapsible>
      )}

      {tier === "extra" && (
        <Collapsible title="Vibes">
          <div className="flex gap-1.5">
            {(
              [
                ["images", "Bilder hochladen"],
                ["pinterest", "Pinterest-Board"],
              ] as const
            ).map(([value, name]) => (
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
                {name}
              </button>
            ))}
          </div>
          {vibesMode === "pinterest" ? (
            <label className={label}>
              Pinterest-URL
              <input {...text("pinterest_url")} placeholder="https://pinterest.com/…" className={`mt-1 ${field}`} />
            </label>
          ) : (
          <>
          <p className={hint}>
            {vibes.length}/{MAX_VIBES} Inspo-Bilder
          </p>
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
        </Collapsible>
      )}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={basics.invalid || uploading !== null}
          className="rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
