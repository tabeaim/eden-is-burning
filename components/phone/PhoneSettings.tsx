"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Character, PhoneSettings as Settings } from "@/lib/types";
import { useStore } from "@/lib/store";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import {
  MAX_EXTRA_APPS,
  OPTIONAL_APPS,
  PHONE_COLORS,
  PHONE_MODELS,
  PHONE_WALLPAPERS,
  PHONE_WEAR,
  resolvePhone,
} from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { Toggle } from "@/components/Toggle";

// Handy-Einstellungen eines Charakters (Einstellungen → Meine Charaktere). Jede
// Änderung wird sofort gespeichert – unabhängig vom „Speichern" des Profils.
export function PhoneSettings({ character }: { character: Character }) {
  const { updateCharacter } = useStore();
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const phone = resolvePhone(character);
  const raw: Settings = character.phone ?? {};
  // Gewählte optionale Apps und eigene Apps teilen sich die freien Plätze
  const chosen = (raw.apps ?? []).filter((k) => OPTIONAL_APPS.some((a) => a.key === k));
  const custom = raw.custom_apps ?? [];
  const extraCount = chosen.length + custom.length;
  const full = extraCount >= MAX_EXTRA_APPS;
  const [appName, setAppName] = useState("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconFile = useRef<HTMLInputElement>(null);
  const customWallpaper = raw.wallpaper && !raw.wallpaper.startsWith("preset:") ? raw.wallpaper : null;
  const presetKey = customWallpaper ? null : raw.wallpaper?.slice(7) ?? PHONE_WALLPAPERS[0].key;

  const save = (patch: Settings) => updateCharacter(character.id, { phone: { ...raw, ...patch } });

  async function onWallpaper(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      save({ wallpaper: await uploadImage(f, "phones", IMAGE_SIZES.gallery) });
    } finally {
      setUploading(false);
    }
  }

  async function onAppIcon(f: File | undefined) {
    const name = appName.trim();
    if (!f || !name || full) return;
    setUploadingIcon(true);
    try {
      const icon = await uploadImage(f, "phones", IMAGE_SIZES.avatar);
      const id = `app_${Math.random().toString(36).slice(2, 9)}`;
      save({ custom_apps: [...custom, { id, name, icon }] });
      setAppName("");
    } finally {
      setUploadingIcon(false);
    }
  }

  const uploadBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08] disabled:opacity-50";
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-[0.8125rem] transition-colors ${
      active ? "bg-accent text-black" : "bg-white/[0.06] text-text-secondary hover:text-text-primary"
    }`;
  const swatch = (active: boolean) =>
    `h-9 w-9 rounded-full border border-border-subtle ${active ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-surface" : ""}`;
  const label = "mb-1.5 text-[0.875rem] text-text-secondary";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-subtle p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[0.875rem] font-semibold text-text-primary">
          <Icon name="phone" size={17} className="text-accent" /> Handy
        </div>
        <Link href="/handy" className="text-[0.875rem] text-text-tertiary hover:text-text-secondary">
          Handy ansehen →
        </Link>
      </div>

      <div>
        <div className={label}>Modell</div>
        <div className="flex flex-wrap gap-1.5">
          {PHONE_MODELS.map((m) => (
            <button key={m.key} onClick={() => save({ model: m.key })} className={pill(phone.model === m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={label}>Gehäusefarbe</div>
        <div className="flex flex-wrap gap-2.5">
          {PHONE_COLORS.map((c) => (
            <button
              key={c.key}
              title={c.label}
              aria-label={c.label}
              onClick={() => save({ color: c.key })}
              style={{ background: c.hex }}
              className={swatch(phone.frame === c.hex)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className={label}>Zustand</div>
        <div className="flex flex-wrap gap-1.5">
          {PHONE_WEAR.map((w, i) => (
            <button key={w} onClick={() => save({ wear: i })} className={pill(phone.wear === i)}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {phone.burner ? (
        <p className="text-[0.8125rem] text-text-tertiary">
          Das Burner Phone ist ein altes Tastenhandy: kein Hintergrundbild, keine Apps, kein
          Captic – nur SMS.
        </p>
      ) : (
        <>
          <Toggle
            checked={phone.captic}
            onChange={(on) => save({ captic: { ...raw.captic, enabled: on } })}
          >
            Captic{" "}
            <span className="text-text-tertiary">
              (Foto-Netzwerk – das Profil bearbeitest du danach direkt in der App auf dem Handy)
            </span>
          </Toggle>

          <div>
            <div className={label}>Hintergrundbild</div>
            <div className="flex flex-wrap items-center gap-2.5">
              {PHONE_WALLPAPERS.map((w) => (
                <button
                  key={w.key}
                  title={w.label}
                  aria-label={w.label}
                  onClick={() => save({ wallpaper: `preset:${w.key}` })}
                  style={{ background: w.css }}
                  className={`h-14 w-9 rounded-md border border-border-subtle ${
                    presetKey === w.key ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-surface" : ""
                  }`}
                />
              ))}
              {customWallpaper && (
                <span
                  title="Eigenes Bild"
                  style={{ backgroundImage: `url("${customWallpaper}")` }}
                  className="h-14 w-9 rounded-md border border-border-subtle bg-cover bg-center ring-2 ring-accent ring-offset-2 ring-offset-bg-surface"
                />
              )}
              <button disabled={uploading} onClick={() => file.current?.click()} className={uploadBtn}>
                <Icon name="upload" size={13} /> {uploading ? "Lädt…" : "Eigenes Bild"}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void onWallpaper(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div>
            <div className={label}>
              Weitere Apps{" "}
              <span className="text-text-tertiary">
                ({extraCount}/{MAX_EXTRA_APPS} · nur angedeutet; Telefon, Kamera & Co. sind immer da)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OPTIONAL_APPS.map((a) => {
                const on = chosen.includes(a.key);
                return (
                  <button
                    key={a.key}
                    disabled={!on && full}
                    onClick={() =>
                      save({ apps: on ? chosen.filter((k) => k !== a.key) : [...chosen, a.key] })
                    }
                    className={`${pill(on)} disabled:opacity-40`}
                  >
                    {a.glyph} {a.label}
                  </button>
                );
              })}
              {custom.map((a) => (
                <span key={a.id} className={`${pill(true)} inline-flex items-center gap-1.5 !py-1 !pl-1`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-6 w-6 rounded-md object-cover" />
                  {a.name}
                  <button
                    onClick={() => save({ custom_apps: custom.filter((x) => x.id !== a.id) })}
                    aria-label={`${a.name} entfernen`}
                    title="Entfernen"
                    className="px-0.5 text-black/60 hover:text-black"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* Eigene App: Name vergeben, dann Icon hochladen */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={appName}
                maxLength={14}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Eigene App: Name"
                disabled={full}
                className="w-44 max-w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20 disabled:opacity-40"
              />
              <button
                disabled={full || !appName.trim() || uploadingIcon}
                onClick={() => iconFile.current?.click()}
                className={uploadBtn}
              >
                <Icon name="upload" size={13} /> {uploadingIcon ? "Lädt…" : "Icon hochladen & hinzufügen"}
              </button>
              <input
                ref={iconFile}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void onAppIcon(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
