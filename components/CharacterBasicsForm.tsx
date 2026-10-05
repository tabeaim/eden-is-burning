"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Character, CharacterProfile } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  DEGREES,
  ageAt,
  isStudent,
  isWorking,
  normalizeHeight,
  studyYearAt,
  tierOf,
  zodiacOf,
} from "@/lib/characters";
import { Toggle } from "./Toggle";
import { AREA_ORDER, AREAS, areaName } from "@/lib/world";
import { PHONE_AREA } from "@/lib/phone";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { characterImage } from "@/lib/avatar";
import { formatInplayDate } from "@/lib/format";
import { DatePicker } from "./DatePicker";
import { Icon } from "./Icon";
import { SuggestInput } from "./SuggestInput";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Grunddaten („hard facts") eines Charakters – Einstellungen → Meine Charaktere.
// Formular-Beschriftungen deutsch; im Profil erscheinen die Facts mit englischen
// Labels. Einzelne Angaben lassen sich im Profil verstecken (Auge-Schalter am
// Feld). Main Characters brauchen Name, Geburtsdatum (bzw. Alter), Faceclaim und
// Beschäftigung. Alles Beschreibende wird direkt im Profil bearbeitet.
export function CharacterBasicsForm({ character }: { character: Character }) {
  const { updateCharacter, locations } = useStore();
  const main = tierOf(character) === "main";
  const [d, setD] = useState(character);
  const [p, setP] = useState<CharacterProfile>(character.profile ?? {});
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Character>(key: K, value: Character[K]) =>
    setD((x) => ({ ...x, [key]: value }));
  const setProfile = (patch: Partial<CharacterProfile>) => setP((x) => ({ ...x, ...patch }));
  const text = (key: keyof Character) => ({
    value: (d[key] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, (e.target.value || null) as never),
    className: field,
  });

  const hidden = p.hidden ?? [];
  const toggleHidden = (key: string) =>
    setProfile({ hidden: hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key] });

  const age = ageAt({ age: d.age, profile: p });
  const studyYear = studyYearAt({ profile: p });
  const missing = {
    name: !d.name.trim(),
    age: main && !p.birthdate && d.age == null,
    faceclaim: main && !(d.faceclaim ?? "").trim(),
    role: main && !(d.role ?? "").trim(),
  };
  const invalid = Object.values(missing).some(Boolean);

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f, "characters", IMAGE_SIZES.portrait);
      set("faceclaim_image_url", url);
      updateCharacter(character.id, { faceclaim_image_url: url });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (invalid) return;
    // Die beschreibenden Teile des Profils (Skills, Timeline …) pflegt das Profil
    // selbst – hier nur die Grunddaten-Schlüssel überschreiben.
    const profile: CharacterProfile = {
      ...(character.profile ?? {}),
      birthdate: p.birthdate ?? null,
      gender: p.gender ?? null,
      hidden,
      is_student: student,
      is_working: working,
      occupation_kind: null, // abgelöst durch is_student / is_working
      university: p.university ?? null,
      university_location_id: p.university_location_id ?? null,
      major: p.major ?? null,
      degree: p.degree ?? null,
      study_start: p.study_start ?? null,
      employer: p.employer ?? null,
      employer_location_id: p.employer_location_id ?? null,
    };
    updateCharacter(character.id, {
      name: d.name.trim(),
      full_name: d.full_name,
      faceclaim: d.faceclaim,
      tagline: d.tagline,
      bio: d.bio,
      role: d.role,
      area: d.area,
      origin: d.origin,
      status: d.status,
      sexuality: d.sexuality,
      height: normalizeHeight(d.height), // immer in cm
      figure: d.figure,
      hair: d.hair,
      eyes: d.eyes,
      // Alter zum Standard-Stichtag mitschreiben, damit Listen es ohne Rechnen haben
      age: p.birthdate ? ageAt({ age: d.age, profile }) : d.age,
      profile,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const student = isStudent({ profile: p });
  const working = isWorking({ profile: p });
  const zodiac = zodiacOf(p.birthdate);

  // Universität und Arbeitgeber: Orte und ganze Gegenden (z.B. „Byron University")
  // werden vorgeschlagen. Ein Ort wird verknüpft („works here" / „studies here"),
  // eine Gegend nur als Name übernommen.
  const places = locations.filter((l) => l.area !== PHONE_AREA);
  const placeByName = (value: string) =>
    places.find((l) => l.name.toLowerCase() === value.trim().toLowerCase());
  const placeSuggestions = (value: string | null | undefined) => {
    const q = (value ?? "").trim().toLowerCase();
    return [
      ...AREA_ORDER.filter((k) => !q || AREAS[k].name.toLowerCase().includes(q)).map((k) => ({
        key: `area:${k}`,
        label: AREAS[k].name,
        hint: "Gegend",
      })),
      ...places
        .filter((l) => !q || l.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
        .map((l) => ({ key: l.id, label: l.name, hint: areaName(l.area) })),
    ].slice(0, 8);
  };
  const pickPlace = (key: string): { name: string; id: string | null } | null => {
    if (key.startsWith("area:")) {
      const k = key.slice(5) as (typeof AREA_ORDER)[number];
      return AREAS[k] ? { name: AREAS[k].name, id: null } : null;
    }
    const l = places.find((x) => x.id === key);
    return l ? { name: l.name, id: l.id } : null;
  };

  // Feld mit Beschriftung; `hideKey`: lässt sich im Profil verstecken
  const F = ({
    label,
    required,
    hideKey,
    error,
    className = "",
    children,
  }: {
    label: string;
    required?: boolean;
    hideKey?: string;
    error?: boolean;
    className?: string;
    children: React.ReactNode;
  }) => (
    <div className={`text-[0.875rem] text-text-secondary ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span>
          {label} {required && <span className="text-accent">*</span>}
        </span>
        {hideKey && (
          <button
            type="button"
            onClick={() => toggleHidden(hideKey)}
            aria-pressed={hidden.includes(hideKey)}
            title={hidden.includes(hideKey) ? "Im Profil versteckt – klicken zum Zeigen" : "Im Profil sichtbar – klicken zum Verstecken"}
            className={`rounded-full px-2 py-0.5 text-[0.6875rem] uppercase tracking-wider ${
              hidden.includes(hideKey)
                ? "bg-white/[0.1] text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {hidden.includes(hideKey) ? "versteckt" : "sichtbar"}
          </button>
        )}
      </div>
      {children}
      {error && <span className="mt-1 block text-[0.8125rem] text-red-300">Pflichtangabe</span>}
    </div>
  );
  const group = "text-[0.8125rem] uppercase tracking-wider font-semibold text-text-tertiary";
  const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* --- Wer --- */}
      <div className={group}>Identität</div>
      <div className="flex items-start gap-4">
        <div className="w-[110px] shrink-0">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border-subtle bg-bg-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterImage(d)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <button
            disabled={uploading}
            onClick={() => file.current?.click()}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Icon name="upload" size={13} /> {uploading ? "Lädt…" : "Foto"}
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </div>
        <div className={`min-w-0 flex-1 ${grid}`}>
          {F({
            label: "Anzeigename",
            required: true,
            error: missing.name,
            children: <input value={d.name} onChange={(e) => set("name", e.target.value)} className={field} />,
          })}
          {F({
            label: "Voller Name",
            hideKey: "full_name",
            children: <input {...text("full_name")} placeholder={d.name} />,
          })}
          {F({
            label: `Geburtsdatum${age != null ? ` – ${age} Jahre` : ""}${zodiac ? `, ${zodiac.de}` : ""}`,
            required: main,
            hideKey: "age",
            error: missing.age,
            children: (
              <DatePicker value={p.birthdate ?? ""} onChange={(iso) => setProfile({ birthdate: iso || null })} />
            ),
          })}
          {F({
            label: "Geschlecht",
            hideKey: "gender",
            children: (
              <select
                value={p.gender ?? ""}
                onChange={(e) => setProfile({ gender: e.target.value || null })}
                className={field}
              >
                <option value="" className="bg-bg-surface">
                  –
                </option>
                {["weiblich", "männlich", "divers"].map((g) => (
                  <option key={g} value={g} className="bg-bg-surface">
                    {g}
                  </option>
                ))}
              </select>
            ),
          })}
          {F({
            label: "Faceclaim",
            required: main,
            error: missing.faceclaim,
            children: <input {...text("faceclaim")} />,
          })}
          {F({
            label: `Tagline (${(d.tagline ?? "").length}/60)`,
            children: <input {...text("tagline")} maxLength={60} className={`${field} uppercase`} />,
          })}
        </div>
      </div>
      <p className="-mt-2 text-[0.8125rem] text-text-tertiary">
        Alter und Sternzeichen werden aus dem Geburtsdatum berechnet: das Alter im Profil zum{" "}
        {formatInplayDate("2022-01-01")}, in einer Szene zum Datum der Szene.
      </p>
      {F({
        label: `Kurzbeschreibung (${(d.bio ?? "").length}/1000)`,
        children: <textarea {...text("bio")} maxLength={1000} rows={3} className={`${field} resize-y`} />,
      })}

      {/* --- Leben --- */}
      <div className={group}>Leben</div>
      <div className={grid}>
        {F({
          label: "Wohngegend",
          hideKey: "area",
          children: (
            <select value={d.area} onChange={(e) => set("area", e.target.value)} className={field}>
              {!AREA_ORDER.includes(d.area as (typeof AREA_ORDER)[number]) && (
                <option value={d.area} className="bg-bg-surface">
                  {d.area ? areaName(d.area) : "–"}
                </option>
              )}
              {AREA_ORDER.map((k) => (
                <option key={k} value={k} className="bg-bg-surface">
                  {AREAS[k].name}
                </option>
              ))}
            </select>
          ),
        })}
        {main && F({ label: "Herkunft", hideKey: "origin", children: <input {...text("origin")} /> })}
        {main && F({ label: "Beziehungsstatus", hideKey: "status", children: <input {...text("status")} /> })}
        {main &&
          F({ label: "Sexuelle Orientierung", hideKey: "sexuality", children: <input {...text("sexuality")} /> })}
      </div>

      {/* --- Beschäftigung --- */}
      <div className={group}>Beschäftigung</div>
      {F({
        label: "Beschäftigung",
        required: main,
        hideKey: "role",
        error: missing.role,
        children: <input {...text("role")} placeholder="z. B. Journalist, Studentin & Barista" />,
      })}
      {main && (
        <>
          {/* beides zugleich möglich */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Toggle checked={student} onChange={(on) => setProfile({ is_student: on })}>
              Student*in
            </Toggle>
            <Toggle checked={working} onChange={(on) => setProfile({ is_working: on })}>
              Arbeitstätig
            </Toggle>
          </div>
          {student && (
            <div className={grid}>
              {F({
                label: "Universität",
                hideKey: "university",
                children: (
                  <SuggestInput
                    value={p.university ?? ""}
                    placeholder="z. B. Byron University"
                    onChange={(value) =>
                      setProfile({
                        university: value || null,
                        university_location_id: placeByName(value)?.id ?? null,
                      })
                    }
                    suggestions={placeSuggestions(p.university)}
                    onPick={(key) => {
                      const hit = pickPlace(key);
                      if (hit) setProfile({ university: hit.name, university_location_id: hit.id });
                    }}
                  />
                ),
              })}
              {F({
                label: "Studiengang",
                hideKey: "major",
                children: (
                  <input
                    value={p.major ?? ""}
                    onChange={(e) => setProfile({ major: e.target.value || null })}
                    className={field}
                  />
                ),
              })}
              {F({
                label: "Abschluss",
                hideKey: "degree",
                children: (
                  <select
                    value={p.degree ?? ""}
                    onChange={(e) => setProfile({ degree: (e.target.value || null) as CharacterProfile["degree"] })}
                    className={field}
                  >
                    <option value="" className="bg-bg-surface">
                      –
                    </option>
                    {Object.entries(DEGREES).map(([key, label]) => (
                      <option key={key} value={key} className="bg-bg-surface">
                        {label}
                      </option>
                    ))}
                  </select>
                ),
              })}
              {F({
                label: `Studienbeginn${studyYear != null ? ` – ${studyYear}. Studienjahr` : ""}`,
                hideKey: "study_year",
                children: (
                  <DatePicker value={p.study_start ?? ""} onChange={(iso) => setProfile({ study_start: iso || null })} />
                ),
              })}
              <p className="text-[0.8125rem] text-text-tertiary sm:col-span-2">
                Das Studienjahr wird aus dem Studienbeginn berechnet: im Profil für den Herbst 2021,
                in einer Szene zum Datum der Szene.
              </p>
            </div>
          )}
          {working &&
            F({
              label: "Arbeitgeber",
              hideKey: "employer",
              children: (
                <>
                  <SuggestInput
                    value={p.employer ?? ""}
                    placeholder="Arbeitgeber eintippen – Orte werden vorgeschlagen"
                    onChange={(value) =>
                      setProfile({ employer: value || null, employer_location_id: placeByName(value)?.id ?? null })
                    }
                    suggestions={placeSuggestions(p.employer)}
                    onPick={(key) => {
                      const hit = pickPlace(key);
                      if (hit) setProfile({ employer: hit.name, employer_location_id: hit.id });
                    }}
                  />
                  <span className="mt-1 block text-[0.8125rem] text-text-tertiary">
                    {p.employer_location_id
                      ? "Mit einem Ort verknüpft – der Charakter steht dort unter „works here“."
                      : "Freier Text. Wählst du einen Ort aus den Vorschlägen, steht der Charakter dort unter „works here“."}
                  </span>
                </>
              ),
            })}
        </>
      )}

      {/* --- Aussehen --- */}
      <div className={group}>Aussehen</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {F({
          label: "Größe (cm)",
          hideKey: "height",
          children: (
            <input
              {...text("height")}
              placeholder="183"
              // beim Verlassen in Zentimeter umrechnen (1,83 m, 6'0 …)
              onBlur={() => set("height", normalizeHeight(d.height))}
            />
          ),
        })}
        {F({ label: "Figur", hideKey: "figure", children: <input {...text("figure")} /> })}
        {F({ label: "Haare", hideKey: "hair", children: <input {...text("hair")} /> })}
        {F({ label: "Augen", hideKey: "eyes", children: <input {...text("eyes")} /> })}
      </div>

      <p className="text-[0.8125rem] text-text-tertiary">
        Alles Beschreibende (Zitat, ausführliche Beschreibung, Skills, Eigenschaften, Slider, Likes,
        Timeline …) bearbeitest du direkt im{" "}
        <Link href={`/charaktere/${character.id}`} className="text-accent hover:underline">
          Profil
        </Link>
        .
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={invalid}
          className="rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
        >
          Grunddaten speichern
        </button>
        {invalid && <span className="text-[0.8125rem] text-red-300">Bitte die Pflichtangaben (*) ausfüllen.</span>}
        {saved && <span className="text-[0.875rem] text-text-secondary">Gespeichert ✓</span>}
      </div>
    </div>
  );
}
