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
  needsBirthdate,
  normalizeHeight,
  studyYearAt,
  tierOf,
  webUrl,
  zodiacOf,
} from "@/lib/characters";
import { Toggle } from "./Toggle";
import { Collapsible } from "./Collapsible";
import { RichEditor } from "./RichEditor";
import { plainText } from "@/lib/html";
import { AREA_ORDER, AREAS, areaName } from "@/lib/world";
import { PHONE_AREA } from "@/lib/phone";
import { uploadImage, uploadAnimation, IMAGE_SIZES } from "@/lib/images";
import { GifPicker } from "./phone/GifPicker";
import { characterImage } from "@/lib/avatar";
import { capFirst, formatInplayDate } from "@/lib/format";
import { DatePicker } from "./DatePicker";
import { Icon } from "./Icon";
import { SuggestInput } from "./SuggestInput";
import { SignatureText, signatureAlign } from "./SignatureText";

const BYRON = "Byron University";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// Grunddaten („hard facts") eines Charakters: alles, was im Profil unter
// identity / life / occupation / looks steht. Dieselben Felder gibt es an zwei
// Stellen – in den Einstellungen (Meine Charaktere) und beim Bearbeiten direkt im
// Profil (ProfileEditPanel); beide nutzen diesen Baustein.
// Formular-Beschriftungen deutsch; im Profil erscheinen die Facts mit englischen
// Labels. Einzelne Angaben lassen sich im Profil verstecken (Schalter am Feld).
// Main Characters brauchen Name, Geburtsdatum (bzw. Alter) und Wohngegend, alle
// anderen nur einen Namen. Statist*innen haben nur die Grundangaben (Name, Alter,
// Wohngegend, Beschäftigung, Aussehen …); was ein früherer Supporting Character
// darüber hinaus ausgefüllt hat, bleibt in den Einstellungen stehen, erscheint
// aber nicht im Profil.
export function useCharacterBasics(character: Character, mode: "settings" | "profile") {
  const { updateCharacter, locations } = useStore();
  const main = tierOf(character) === "main";
  const extra = tierOf(character) === "extra";
  // Angabe über die Grundangaben hinaus: für Statist*innen nur in den
  // Einstellungen und nur, wenn dort schon etwas eingetragen ist
  const more = (filled: boolean) => !extra || (mode === "settings" && filled);
  const [d, setD] = useState(character);
  const [p, setP] = useState<CharacterProfile>(character.profile ?? {});
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
    area: main && !d.area,
  };
  const invalid = Object.values(missing).some(Boolean);
  // Importiert: nur eine Alterszahl, kein Geburtsdatum – Feld markieren und darum bitten
  const askBirthdate = !extra && needsBirthdate({ age: d.age, profile: p });
  const student = isStudent({ profile: p });
  const working = isWorking({ profile: p });
  const zodiac = zodiacOf(p.birthdate);
  // Universität: Byron (die Uni von Eden) oder eine andere als reiner Text
  const otherUni = p.university != null && p.university !== BYRON;
  // Statist*in mit Angaben aus früheren Zeiten (z.B. ehemaliger Supporting Character)
  const leftovers =
    extra &&
    mode === "settings" &&
    !!(
      character.bio ||
      character.origin ||
      character.status ||
      character.sexuality ||
      isStudent(character) ||
      isWorking(character)
    );

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

  // Die Änderungen als Patch für updateCharacter. Die beschreibenden Teile des
  // Profils (Skills, Timeline …) bleiben, wie sie sind – hier nur die
  // Grunddaten-Schlüssel überschreiben. `extraProfile`: weitere Schlüssel, die die
  // Einstellungen mitschreiben (Signatur, GIF).
  function patch(extraProfile: Partial<CharacterProfile> = {}): Partial<Character> {
    const profile: CharacterProfile = {
      ...(character.profile ?? {}),
      spotify_url: webUrl(p.spotify_url),
      gpa: p.gpa?.trim() || null,
      birthdate: p.birthdate ?? null,
      gender: p.gender ?? null,
      hidden,
      looks_note: p.looks_note?.trim() || null,
      is_student: student,
      is_working: working,
      occupation_kind: null, // abgelöst durch is_student / is_working
      university: student ? (p.university ?? BYRON) : (p.university ?? null),
      major: p.major ?? null,
      degree: p.degree ?? null,
      study_start: p.study_start ?? null,
      employer: p.employer ?? null,
      employer_location_id: p.employer_location_id ?? null,
      ...extraProfile,
    };
    return {
      name: d.name.trim(),
      full_name: d.full_name,
      faceclaim: d.faceclaim,
      tagline: d.tagline,
      bio: d.bio,
      role: capFirst(d.role) || null,
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
    };
  }

  // Universität und Arbeitgeber: Orte und ganze Gegenden (z.B. „Byron University")
  // werden vorgeschlagen. Ein Ort wird verknüpft („works here" / „studies here"),
  // eine Gegend nur als Name übernommen.
  const places = locations.filter((l) => l.area !== PHONE_AREA);
  const placeByName = (value: string) =>
    places.find((l) => l.name.toLowerCase() === value.trim().toLowerCase());
  const placeSuggestions = (value: string | null | undefined) => {
    const q = (value ?? "").trim().toLowerCase();
    return [
      ...AREA_ORDER.filter((k) => !q || areaName(k).toLowerCase().includes(q)).map((k) => ({
        key: `area:${k}`,
        label: areaName(k),
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
      return AREAS[k] ? { name: areaName(k), id: null } : null;
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
    hint,
    notice,
    className = "",
    children,
  }: {
    label: string;
    required?: boolean;
    hideKey?: string;
    error?: boolean;
    hint?: string | null; // klein unter dem Feld (z.B. berechnetes Alter)
    notice?: string | null; // Bitte um eine Angabe, in Akzentfarbe unter dem Feld
    className?: string;
    children: React.ReactNode;
  }) => (
    <div className={`min-w-0 text-[0.875rem] text-text-secondary ${className}`}>
      {/* Beschriftung bleibt einzeilig, damit nebeneinander stehende Felder fluchten */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">
          {label} {required && <span className="text-accent">*</span>}
        </span>
        {hideKey && (
          <button
            type="button"
            onClick={() => toggleHidden(hideKey)}
            aria-pressed={hidden.includes(hideKey)}
            title={hidden.includes(hideKey) ? "Im Profil versteckt – klicken zum Zeigen" : "Im Profil sichtbar – klicken zum Verstecken"}
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] uppercase tracking-wider ${
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
      {hint && <span className="mt-1 block text-[0.75rem] text-text-tertiary">{hint}</span>}
      {notice && <span className="mt-1 block text-[0.8125rem] text-accent">{notice}</span>}
      {error && <span className="mt-1 block text-[0.8125rem] text-red-300">Pflichtangabe</span>}
    </div>
  );
  const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2";

  const form = (
    <>
      {leftovers && (
        <p className="rounded-md border border-dashed border-border-subtle px-3 py-2 text-[0.8125rem] text-text-tertiary">
          Statist*innen zeigen im Profil nur die Grundangaben. Was {character.name} darüber hinaus
          eingetragen hat (Kurzbeschreibung, Herkunft, Studium …), bleibt hier gespeichert, erscheint
          aber nicht im Profil – als Supporting Character wieder schon.
        </p>
      )}
      {/* --- Wer --- */}
      <Collapsible title="Identität" defaultOpen={mode === "profile"} forceOpen={missing.name || missing.age || askBirthdate}>
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
            <Icon name="upload" size={13} /> {uploading ? "Lädt…" : "Avatar"}
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
            label: "Geburtsdatum",
            required: main,
            hideKey: "age",
            error: missing.age,
            hint: [age != null ? `${age} Jahre` : null, zodiac?.de].filter(Boolean).join(" · ") || null,
            notice: askBirthdate
              ? "Bisher ist nur das Alter hinterlegt – bitte trag ein Geburtsdatum ein."
              : null,
            children: (
              <div className={askBirthdate ? "rounded-md ring-2 ring-accent/70" : ""}>
                <DatePicker value={p.birthdate ?? ""} onChange={(iso) => setProfile({ birthdate: iso || null })} />
              </div>
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
            children: <input {...text("faceclaim")} />,
          })}
          {F({
            label: `Tagline (${(d.tagline ?? "").length}/60)`,
            children: <input {...text("tagline")} maxLength={60} className={`${field} uppercase`} />,
          })}
        </div>
      </div>
      <p className="text-[0.8125rem] text-text-tertiary">
        Alter und Sternzeichen werden aus dem Geburtsdatum berechnet: das Alter im Profil zum{" "}
        {formatInplayDate("2022-01-01")}, in einer Szene zum Datum der Szene.
      </p>
      {more(!!character.bio) &&
        F({
          label: `Kurzbeschreibung (${plainText(d.bio).length}/1000)`,
          children: <RichEditor value={d.bio ?? ""} onChange={(v) => set("bio", (v || null) as never)} maxLength={1000} />,
        })}

      </Collapsible>

      {/* --- Leben --- */}
      <Collapsible title="Leben" forceOpen={missing.area}>
      <div className={grid}>
        {F({
          label: "Wohngegend",
          required: main,
          hideKey: "area",
          error: missing.area,
          children: (
            <select value={d.area} onChange={(e) => set("area", e.target.value)} className={field}>
              {!AREA_ORDER.includes(d.area as (typeof AREA_ORDER)[number]) && (
                <option value={d.area} className="bg-bg-surface">
                  {d.area ? areaName(d.area) : "–"}
                </option>
              )}
              {AREA_ORDER.map((k) => (
                <option key={k} value={k} className="bg-bg-surface">
                  {areaName(k)}
                </option>
              ))}
            </select>
          ),
        })}
        {more(!!character.origin) && F({ label: "Herkunft", hideKey: "origin", children: <input {...text("origin")} /> })}
        {more(!!character.status) && F({ label: "Beziehungsstatus", hideKey: "status", children: <input {...text("status")} /> })}
        {more(!!character.sexuality) &&
          F({ label: "Sexuelle Orientierung", hideKey: "sexuality", children: <input {...text("sexuality")} /> })}
        {F({
          label: "Spotify-Link",
          hideKey: "spotify",
          children: (
            <input
              value={p.spotify_url ?? ""}
              onChange={(e) => setProfile({ spotify_url: e.target.value || null })}
              placeholder="https://open.spotify.com/…"
              className={field}
            />
          ),
        })}
      </div>

      </Collapsible>

      {/* --- Beschäftigung --- */}
      <Collapsible title="Beschäftigung">
      {F({
        label: "Beschäftigung",
        hideKey: "role",
        children: <input {...text("role")} placeholder="z. B. Journalist, Studentin & Barista" />,
      })}
      {more(isStudent(character) || isWorking(character)) && (
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
                  <>
                    <select
                      value={otherUni ? "other" : BYRON}
                      onChange={(e) => setProfile({ university: e.target.value === "other" ? "" : BYRON })}
                      className={field}
                    >
                      <option value={BYRON} className="bg-bg-surface">
                        {BYRON}
                      </option>
                      <option value="other" className="bg-bg-surface">
                        Andere …
                      </option>
                    </select>
                    {otherUni && (
                      <input
                        value={p.university ?? ""}
                        onChange={(e) => setProfile({ university: e.target.value })}
                        placeholder="Name der Universität"
                        className={`mt-2 ${field}`}
                      />
                    )}
                  </>
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
                label: "Studienbeginn",
                hideKey: "study_year",
                hint: studyYear != null ? `${studyYear}. Studienjahr` : null,
                children: (
                  <DatePicker value={p.study_start ?? ""} onChange={(iso) => setProfile({ study_start: iso || null })} />
                ),
              })}
              {F({
                label: "GPA",
                hideKey: "gpa",
                children: (
                  <input
                    value={p.gpa ?? ""}
                    onChange={(e) => setProfile({ gpa: e.target.value || null })}
                    placeholder="z. B. 3.7"
                    className={field}
                  />
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

      </Collapsible>

      {/* --- Aussehen --- */}
      <Collapsible title="Aussehen">
        {F({
          label: `Beschreibung (${plainText(p.looks_note).length}/300)`,
          children: (
            <RichEditor
              value={p.looks_note ?? ""}
              maxLength={300}
              onChange={(v) => setProfile({ looks_note: v || null })}
              placeholder="Kurz in Worten: Wie wirkt der Charakter, woran erkennt man ihn?"
              minHeight="min-h-[4rem]"
            />
          ),
        })}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {F({
          label: "Größe",
          hint: "in cm",
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

      </Collapsible>

    </>
  );

  return { form, invalid, patch, p, setProfile, F };
}

// Einstellungen → Meine Charaktere: die Grunddaten plus das, was nur hier steht
// (Signatur, GIF in Szenen), mit eigenem Speichern-Knopf.
export function CharacterBasicsForm({ character }: { character: Character }) {
  const { updateCharacter } = useStore();
  const { form, invalid, patch, p, setProfile, F } = useCharacterBasics(character, "settings");
  const [saved, setSaved] = useState(false);
  const [signature, setSignature] = useState(character.profile?.signature_url ?? null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const sigFile = useRef<HTMLInputElement>(null);
  const [gif, setGif] = useState(character.profile?.scene_gif_url ?? null);
  const [gifBusy, setGifBusy] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [gifSearch, setGifSearch] = useState(false);
  const gifFile = useRef<HTMLInputElement>(null);

  // Signatur wird (wie der Avatar) sofort gespeichert
  function saveSignature(url: string | null) {
    setSignature(url);
    updateCharacter(character.id, { profile: { ...(character.profile ?? {}), signature_url: url } });
  }
  async function onSignature(f: File | undefined) {
    if (!f) return;
    setUploadingSig(true);
    try {
      saveSignature(await uploadImage(f, "characters", IMAGE_SIZES.signature));
    } finally {
      setUploadingSig(false);
    }
  }

  // GIF unter dem Avatar in Szenen – ebenfalls sofort gespeichert
  function saveGif(url: string | null) {
    setGif(url);
    setGifError(null);
    setGifSearch(false);
    updateCharacter(character.id, { profile: { ...(character.profile ?? {}), scene_gif_url: url } });
  }
  async function onGif(f: File | undefined) {
    if (!f) return;
    setGifBusy(true);
    setGifError(null);
    try {
      saveGif(await uploadAnimation(f, "characters"));
    } catch (e) {
      setGifError(e instanceof Error ? e.message : String(e));
    } finally {
      setGifBusy(false);
    }
  }

  function save() {
    if (invalid) return;
    updateCharacter(
      character.id,
      patch({
        signature_url: signature,
        signature_text: p.signature_text?.trim() || null,
        signature_align: p.signature_align ?? null,
        scene_gif_url: gif,
      }),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      {form}

      {/* --- Signatur --- */}
      <Collapsible title="Signatur">
        <p className="text-[0.8125rem] text-text-tertiary">
          Steht am Ende jedes Posts dieses Charakters – sonst nirgendwo. Text, Bild oder beides.
        </p>
        {F({
          label: `Text-Signatur (${(p.signature_text ?? "").length}/2000)`,
          hint: "Reiner Text oder HTML (z. B. <b>, <i>, <span style=\"…\">, <a>, <img>, <center>). Wird mit den Grunddaten gespeichert.",
          children: (
            <textarea
              value={p.signature_text ?? ""}
              maxLength={2000}
              rows={3}
              spellCheck={false}
              onChange={(e) => setProfile({ signature_text: e.target.value || null })}
              className={`${field} resize-y font-mono text-[0.8125rem]`}
            />
          ),
        })}
        {p.signature_text?.trim() && (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-2">
            <div className="mb-1 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">Vorschau</div>
            <SignatureText html={p.signature_text} align={p.signature_align} />
          </div>
        )}
        {signature && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signature}
            alt="Signatur"
            className={`${signatureAlign(p.signature_align).image} block max-w-full rounded-md`}
          />
        )}
        {F({
          label: "Ausrichtung",
          hint: "Gilt für Text und Bild. Wird mit den Grunddaten gespeichert.",
          children: (
            <div className="flex gap-1.5">
              {(
                [
                  ["left", "Links"],
                  ["center", "Zentriert"],
                  ["right", "Rechts"],
                ] as const
              ).map(([value, name]) => {
                const active = (p.signature_align ?? "center") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProfile({ signature_align: value })}
                    className={`rounded-md border px-3 py-1.5 text-[0.8125rem] ${
                      active
                        ? "border-accent/70 bg-accent-soft text-text-primary"
                        : "border-border-subtle bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ),
        })}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={uploadingSig}
            onClick={() => sigFile.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Icon name="upload" size={13} />{" "}
            {uploadingSig ? "Lädt…" : signature ? "Signatur ersetzen" : "Signatur hochladen"}
          </button>
          {signature && (
            <button
              onClick={() => saveSignature(null)}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Signatur entfernen
            </button>
          )}
          <input
            ref={sigFile}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void onSignature(f);
            }}
          />
        </div>
      </Collapsible>

      {/* --- GIF unter dem Avatar --- */}
      <Collapsible title="GIF in Szenen">
        <p className="text-[0.8125rem] text-text-tertiary">
          Ein GIF, das in Szenen unter dem Avatar dieses Charakters steht – höchstens so breit wie der Avatar
          und halb so hoch.
        </p>
        {gif && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gif} alt="GIF" className="max-h-[117px] max-w-[280px] rounded-md" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={gifBusy}
            onClick={() => gifFile.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Icon name="upload" size={13} /> {gifBusy ? "Lädt…" : gif ? "GIF ersetzen" : "GIF hochladen"}
          </button>
          <button
            onClick={() => setGifSearch((v) => !v)}
            aria-expanded={gifSearch}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08]"
          >
            GIF suchen oder verlinken
          </button>
          {gif && (
            <button onClick={() => saveGif(null)} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
              GIF entfernen
            </button>
          )}
          <input
            ref={gifFile}
            type="file"
            accept="image/gif,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void onGif(f);
            }}
          />
        </div>
        {gifError && <p className="text-[0.8125rem] text-red-300">{gifError}</p>}
        {gifSearch && (
          <div className="max-w-md rounded-lg border border-border-subtle px-2 pb-2">
            <GifPicker onPick={saveGif} />
          </div>
        )}
      </Collapsible>

      <p className="text-[0.8125rem] text-text-tertiary">
        Die Grunddaten und alles Beschreibende (Ausführliche Beschreibung, Timeline …) kannst du auch direkt im{" "}
        <Link href={`/charaktere/${character.id}`} className="text-accent hover:underline">
          Profil
        </Link>{" "}
        bearbeiten.
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
