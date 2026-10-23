"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { characterImage } from "@/lib/avatar";
import { IMAGE_SIZES, uploadAnimation, uploadImage } from "@/lib/images";
import { isEmptyVersion, withVersion } from "@/lib/versions";
import { auNames } from "./AuNameField";
import { Icon } from "./Icon";
import type { Character, CharacterVersion, Scene } from "@/lib/types";

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20 placeholder:text-text-tertiary/70";
const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-50";

// Bild-Feld einer Version: Vorschau (oder das normale Bild, blass), Hochladen, Entfernen
function ImageField({
  label,
  value,
  fallback,
  busy,
  onPick,
  onClear,
  accept = "image/*",
  wide = false,
}: {
  label: string;
  value: string | null | undefined;
  fallback: string | null;
  busy: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  accept?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const shown = value || fallback;
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${wide ? "h-12 w-24" : "h-14 w-14"} shrink-0 overflow-hidden rounded-md border border-border-subtle bg-bg-primary`}
      >
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className={`h-full w-full object-cover ${value ? "" : "opacity-35"}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.8125rem] text-text-secondary">
          {label} {!value && <span className="text-text-tertiary">(wie im Profil)</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={btn}>
            <Icon name="upload" size={13} /> {busy ? "Lädt hoch…" : value ? "Ändern" : "Hochladen"}
          </button>
          {value && (
            <button type="button" onClick={onClear} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
              Zurück zum Profil
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

// Formular für eine Version (AU oder einzelne Szene). Leere Felder bleiben wie im
// Profil; die Platzhalter zeigen den normalen Wert.
export function VersionForm({
  character,
  kind,
  versionKey,
  onClose,
}: {
  character: Character;
  kind: "au" | "scene";
  versionKey: string;
  onClose?: () => void;
}) {
  const { updateCharacter } = useStore();
  const stored = character.profile?.versions?.[kind]?.[versionKey] ?? {};
  const [v, setV] = useState<CharacterVersion>(stored);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof CharacterVersion>(k: K, val: CharacterVersion[K]) {
    setSaved(false);
    setV((old) => ({ ...old, [k]: val }));
  }
  async function upload(k: "image" | "scene_gif_url" | "signature_url", f: File) {
    setBusy(k);
    setError(null);
    try {
      const url =
        k === "scene_gif_url"
          ? await uploadAnimation(f, "characters")
          : await uploadImage(f, "characters", k === "image" ? IMAGE_SIZES.portrait : IMAGE_SIZES.signature);
      set(k, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hochladen fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }
  function write(next: CharacterVersion | null) {
    updateCharacter(character.id, { profile: withVersion(character, kind, versionKey, next) });
  }
  function remove() {
    setV({});
    setSavedKey("{}");
    write(null);
    onClose?.();
  }

  // Speichert sich selbst, kurz nach der letzten Änderung (wie die Grunddaten);
  // beim Schließen wird Offenes sofort gespeichert
  const vKey = JSON.stringify(v);
  const [savedKey, setSavedKey] = useState(vKey);
  const pending = vKey !== savedKey;
  const latest = useRef({ write, vKey, pending });
  useEffect(() => {
    latest.current = { write, vKey, pending };
  });
  useEffect(() => {
    if (!pending || busy) return;
    const t = setTimeout(() => {
      setSavedKey(vKey);
      latest.current.write(JSON.parse(vKey) as CharacterVersion);
      setSaved(true);
    }, 800);
    return () => clearTimeout(t);
  }, [vKey, pending, busy]);
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.pending) l.write(JSON.parse(l.vKey) as CharacterVersion);
    },
    [],
  );

  const text = (k: "name" | "role" | "tagline" | "job", label: string, base: string | null) => (
    <label className="block">
      <span className="text-[0.8125rem] text-text-secondary">{label}</span>
      <input
        value={v[k] ?? ""}
        onChange={(e) => set(k, e.target.value)}
        placeholder={base ?? ""}
        className={`${field} mt-1`}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <ImageField
        label="Bild"
        value={v.image}
        fallback={characterImage(character)}
        busy={busy === "image"}
        onPick={(f) => void upload("image", f)}
        onClear={() => set("image", null)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {text("name", "Name", character.name)}
        <label className="block">
          <span className="text-[0.8125rem] text-text-secondary">Alter</span>
          <input
            type="number"
            min={0}
            max={150}
            value={v.age ?? ""}
            onChange={(e) => set("age", e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder={character.age != null ? String(character.age) : "wie im Profil"}
            className={`${field} mt-1`}
          />
        </label>
        {text("role", "Rolle", character.role)}
        {text("job", "Job", character.job)}
        <div className="sm:col-span-2">{text("tagline", "Tagline", character.tagline)}</div>
      </div>
      <label className="block">
        <span className="text-[0.8125rem] text-text-secondary">
          Kurzbeschreibung <span className="text-text-tertiary">(erscheint in Szenen beim Hovern über das Bild)</span>
        </span>
        <textarea
          value={v.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          placeholder="wie im Profil"
          className={`${field} mt-1 resize-y`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImageField
          label="Szenen-GIF"
          value={v.scene_gif_url}
          fallback={character.profile?.scene_gif_url ?? null}
          busy={busy === "scene_gif_url"}
          onPick={(f) => void upload("scene_gif_url", f)}
          onClear={() => set("scene_gif_url", null)}
          accept="image/gif,image/webp"
          wide
        />
        <ImageField
          label="Signatur"
          value={v.signature_url}
          fallback={character.profile?.signature_url ?? null}
          busy={busy === "signature_url"}
          onPick={(f) => void upload("signature_url", f)}
          onClear={() => set("signature_url", null)}
          wide
        />
      </div>
      {error && <p className="text-[0.8125rem] text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved && !pending && <span className="mr-auto text-[0.8125rem] text-text-tertiary">Gespeichert ✓</span>}
        {(!isEmptyVersion(stored) || !isEmptyVersion(v)) && (
          <button type="button" onClick={remove} className="text-[0.8125rem] text-text-tertiary hover:text-red-300">
            Version entfernen
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="px-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Schließen
          </button>
        )}
      </div>
    </div>
  );
}

// Übersicht in den Charakter-Einstellungen: vorhandene AU- und Szenen-Versionen,
// neue AU-Version anlegen (AU aus den bisher vergebenen Namen wählen).
export function CharacterVersions({ character }: { character: Character }) {
  const { scenes } = useStore();
  const versions = character.profile?.versions;
  const auKeys = Object.keys(versions?.au ?? {}).sort((a, b) => a.localeCompare(b, "de"));
  const sceneKeys = Object.keys(versions?.scene ?? {});
  const free = auNames(scenes).filter((n) => !auKeys.includes(n));
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  const row = (id: string, title: React.ReactNode, kind: "au" | "scene", key: string) => (
    <div key={id} className="rounded-lg border border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen(open === id ? null : id)}
        aria-expanded={open === id}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-[0.875rem] text-text-primary hover:bg-white/[0.02]"
      >
        <Icon name="chevron-right" size={12} className={`text-text-tertiary transition-transform ${open === id ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </button>
      {open === id && (
        <div className="border-t border-border-subtle p-3 sm:p-4">
          <VersionForm character={character} kind={kind} versionKey={key} onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.8125rem] text-text-tertiary">
        In einem AU oder in einer einzelnen Szene kann {character.name} anders aussehen oder andere Grunddaten
        haben. Leere Felder bleiben wie im Profil. Eine Version für eine einzelne Szene legst du in
        den Einstellungen der Szene an, wenn die Szene Versionen erlaubt.
      </p>

      {auKeys.map((k) => row(`au:${k}`, <>AU · {k}</>, "au", k))}
      {open?.startsWith("au:") && !auKeys.includes(open.slice(3)) && row(open, <>AU · {open.slice(3)} <span className="text-text-tertiary">(neu)</span></>, "au", open.slice(3))}

      {sceneKeys.map((k) => {
        const s = scenes.find((x) => x.id === k);
        return row(
          `scene:${k}`,
          <>
            Szene ·{" "}
            {s ? (
              <Link href={`/szenen/${s.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent">
                {s.title}
              </Link>
            ) : (
              <span className="text-text-tertiary">gelöschte Szene</span>
            )}
          </>,
          "scene",
          k,
        );
      })}

      {free.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className={`${field} w-auto`}>
            <option value="">AU wählen …</option>
            {free.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!adding}
            onClick={() => {
              setOpen(`au:${adding}`);
              setAdding("");
            }}
            className={btn}
          >
            <Icon name="plus" size={13} /> AU-Version anlegen
          </button>
        </div>
      ) : (
        auKeys.length === 0 && (
          <p className="text-[0.8125rem] text-text-tertiary">
            Es gibt noch keine benannten AUs. Sobald eine Szene einen AU-Namen hat, kannst du hier eine Version dafür
            anlegen.
          </p>
        )
      )}
    </div>
  );
}

// Abschnitt „Versionen" in den Szenen-Einstellungen (wenn die Szene Versionen
// erlaubt): die eigenen Charaktere in der Szene – nur für diese Szene oder, in einer
// AU-Szene, für das ganze AU (gilt dann in allen Szenen dieses AUs).
export function SceneVersions({ scene, participantIds }: { scene: Scene; participantIds: string[] }) {
  const { currentPlayer, charactersOf, myNpcs } = useStore();
  const mine = (currentPlayer ? [...charactersOf(currentPlayer.id), ...myNpcs] : []).filter((c) =>
    participantIds.includes(c.id),
  );
  const auName = scene.au ? scene.au_name?.trim() || null : null;
  const [charId, setCharId] = useState(mine[0]?.id ?? null);
  const [kind, setKind] = useState<"scene" | "au">(() => {
    const c = mine[0];
    return auName && c?.profile?.versions?.au?.[auName] && !c.profile.versions.scene?.[scene.id] ? "au" : "scene";
  });
  const c = mine.find((x) => x.id === charId) ?? mine[0];
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
      active ? "bg-accent text-black font-medium" : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="rounded-lg border border-border-subtle p-3 sm:p-4">
      <div className="text-[0.875rem] text-text-secondary">Versionen</div>
      <p className="mb-3 mt-0.5 text-[0.8125rem] text-text-tertiary">
        Bild, Name und Grunddaten deines Charakters anders zeigen – nur in dieser Szene
        {auName ? <> oder in allen Szenen des AUs „{auName}“</> : null}. Leere Felder bleiben wie im Profil.
        Speichert sich von selbst.
      </p>
      {!c ? (
        <p className="text-[0.8125rem] text-text-tertiary">Du hast keinen Charakter in dieser Szene.</p>
      ) : (
        <>
          {mine.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {mine.map((x) => (
                <button key={x.id} type="button" onClick={() => setCharId(x.id)} className={pill(x.id === c.id)}>
                  {x.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
          {auName && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setKind("scene")} className={pill(kind === "scene")}>
                Nur diese Szene
              </button>
              <button type="button" onClick={() => setKind("au")} className={pill(kind === "au")}>
                Ganzes AU · {auName}
              </button>
            </div>
          )}
          <VersionForm
            key={`${c.id}:${kind}`}
            character={c}
            kind={auName ? kind : "scene"}
            versionKey={auName && kind === "au" ? auName : scene.id}
          />
        </>
      )}
    </div>
  );
}
