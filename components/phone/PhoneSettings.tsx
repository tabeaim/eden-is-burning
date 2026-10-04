"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Character, PhoneSettings as Settings } from "@/lib/types";
import { useStore } from "@/lib/store";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import {
  MAX_PHONE_APPS,
  PHONE_APPS,
  PHONE_COLORS,
  PHONE_MODELS,
  PHONE_WALLPAPERS,
  PHONE_WEAR,
  resolvePhone,
} from "@/lib/phone";
import { Icon } from "@/components/Icon";

// Handy-Einstellungen eines Charakters (Einstellungen → Meine Charaktere). Jede
// Änderung wird sofort gespeichert — unabhängig vom „Speichern" des Profils.
export function PhoneSettings({ character }: { character: Character }) {
  const { updateCharacter } = useStore();
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const phone = resolvePhone(character);
  const raw: Settings = character.phone ?? {};
  const apps = phone.apps.map((a) => a.key as string);
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
            <button key={m.key} title={m.hint} onClick={() => save({ model: m.key })} className={pill(phone.model === m.key)}>
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
          <button
            disabled={uploading}
            onClick={() => file.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08] disabled:opacity-50"
          >
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
          Apps auf dem Startbildschirm{" "}
          <span className="text-text-tertiary">
            ({apps.length}/{MAX_PHONE_APPS} · nur angedeutet; Nachrichten und Captic sind immer da)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHONE_APPS.map((a) => {
            const on = apps.includes(a.key);
            return (
              <button
                key={a.key}
                disabled={!on && apps.length >= MAX_PHONE_APPS}
                onClick={() =>
                  save({ apps: on ? apps.filter((k) => k !== a.key) : [...apps, a.key] })
                }
                className={`${pill(on)} disabled:opacity-40`}
              >
                {a.glyph} {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
