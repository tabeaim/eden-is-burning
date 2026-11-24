"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Character, PhoneSettings as Settings } from "@/lib/types";
import { useStore } from "@/lib/store";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import {
  DECOR_APPS,
  HOME_APP_SLOTS,
  OPTIONAL_APPS,
  STANDARD_APPS,
  shownStandardApps,
  PHONE_COLORS,
  PHONE_MODELS,
  PHONE_WALLPAPERS,
  PHONE_WEAR,
  resolvePhone,
} from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { Toggle } from "@/components/Toggle";
import { PhoneAvatar } from "./PhoneFrame";

// Handy-Einstellungen eines Charakters (Einstellungen → Meine Charaktere). Jede
// Änderung wird sofort gespeichert – unabhängig vom „Speichern" des Profils.
// `reduced` (Supporting Characters): nur Profilbild, Modell, Farbe und Zustand –
// dazu Captic, aber kein Hintergrundbild und keine Apps.
// `inPhone`: in der Einstellungen-App des Handys selbst – ohne Kopfzeile und ohne
// den Schalter „Hat ein Handy" (sonst sperrt man sich aus).
export function PhoneSettings({
  character,
  reduced = false,
  inPhone = false,
}: {
  character: Character;
  reduced?: boolean;
  inPhone?: boolean;
}) {
  const { updateCharacter, characters, npcs } = useStore();
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const phone = resolvePhone(character);
  const raw: Settings = character.phone ?? {};
  // Gewählte optionale Apps und eigene Apps teilen sich die freien Plätze
  const chosen = (raw.apps ?? []).filter((k) => OPTIONAL_APPS.some((a) => a.key === k));
  const custom = raw.custom_apps ?? [];
  // Alle Apps auf dem Startbildschirm zählen zum Limit (4 × 4 Plätze)
  // Fotos, Notizen und Einstellungen sind fest – gezählt wird nur, was man wählt
  const fixedApps = STANDARD_APPS.length - DECOR_APPS.length;
  const freeSlots = HOME_APP_SLOTS - fixedApps;
  const appCount = shownStandardApps(raw).length - fixedApps + chosen.length + custom.length;
  const full = appCount >= freeSlots;
  // Eigene Apps der anderen Spieler*innen zum Übernehmen – jede nur einmal
  // (gleicher Name + gleiches Icon) und ohne die, die dieses Handy schon hat
  const sameApp = (a: { name: string; icon: string }, b: { name: string; icon: string }) =>
    a.icon === b.icon && a.name.toLowerCase() === b.name.toLowerCase();
  const shared = [...characters, ...npcs]
    .filter((c) => c.player_id !== character.player_id && !c.deleted_at)
    .flatMap((c) => c.phone?.custom_apps ?? [])
    .filter((a, i, all) => all.findIndex((x) => sameApp(x, a)) === i && !custom.some((x) => sameApp(x, a)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const [appName, setAppName] = useState("");
  // Eigene Gehäusefarbe: beim Ziehen im Farbwähler sofort zeigen, kurz danach speichern
  const [colorDraft, setColorDraft] = useState<string | null>(null);
  const colorTimer = useRef<number | null>(null);
  const pickColor = (hex: string) => {
    setColorDraft(hex);
    if (colorTimer.current) window.clearTimeout(colorTimer.current);
    colorTimer.current = window.setTimeout(() => {
      save({ color: hex });
      setColorDraft(null);
    }, 400);
  };
  const customColor = !!colorDraft || !PHONE_COLORS.some((c) => c.hex === phone.frame);
  // Akku beim Ziehen nur anzeigen, beim Loslassen speichern
  const [batteryDraft, setBatteryDraft] = useState<number | null>(null);
  const commitBattery = () => {
    if (batteryDraft !== null && batteryDraft !== phone.battery) save({ battery: batteryDraft });
    setBatteryDraft(null);
  };
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

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFile = useRef<HTMLInputElement>(null);
  async function onAvatar(f: File | undefined) {
    if (!f) return;
    setUploadingAvatar(true);
    try {
      save({ avatar: await uploadImage(f, "phones", IMAGE_SIZES.avatar) });
    } finally {
      setUploadingAvatar(false);
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
    `h-8 w-8 shrink-0 rounded-full border border-border-subtle ${active ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-surface" : ""}`;
  const label = "mb-2 text-[0.8125rem] font-medium text-text-secondary";

  return (
    <div className="flex flex-col gap-4">
      {!inPhone && (
      <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[0.8125rem] text-text-tertiary">
          <Icon name="phone" size={17} className="text-accent" /> Look und Apps des Handys
        </div>
        {!reduced && (
          <Link href="/handy" className="text-[0.875rem] text-text-tertiary hover:text-text-secondary">
            Handy ansehen →
          </Link>
        )}
      </div>

      <Toggle checked={!raw.disabled} onChange={(on) => save({ disabled: !on })}>
        Hat ein Handy{" "}
        <span className="text-text-tertiary">
          (aus: keine SMS, Anrufe und Kontakte)
        </span>
      </Toggle>
      </>
      )}
      {raw.disabled ? null : (
      <>
      <Group>
      <div>
        <div className={label}>
          Profilbild im Messenger
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PhoneAvatar character={character} size={56} className="ring-1 ring-border-subtle" link={false} />
          <button disabled={uploadingAvatar} onClick={() => avatarFile.current?.click()} className={uploadBtn}>
            <Icon name="upload" size={13} /> {uploadingAvatar ? "Lädt…" : "Bild hochladen"}
          </button>
          {raw.avatar && (
            <button
              onClick={() => save({ avatar: null })}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Charakterbild verwenden
            </button>
          )}
          <input
            ref={avatarFile}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      </Group>

      <Group>
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
        <div className="flex gap-2">
          {PHONE_COLORS.map((c) => (
            <button
              key={c.key}
              title={c.label}
              aria-label={c.label}
              onClick={() => save({ color: c.key })}
              style={{ background: c.hex }}
              className={swatch(!colorDraft && phone.frame === c.hex)}
            />
          ))}
          {/* jede andere Farbe über den Farbwähler */}
          <label
            title="Eigene Farbe"
            style={{
              background: customColor
                ? (colorDraft ?? phone.frame)
                : "conic-gradient(#ff453a, #ffd60a, #30d158, #0a84ff, #bf5af2, #ff453a)",
            }}
            className={`${swatch(customColor)} relative cursor-pointer overflow-hidden`}
          >
            <input
              type="color"
              value={colorDraft ?? phone.frame}
              onChange={(e) => pickColor(e.target.value)}
              aria-label="Eigene Gehäusefarbe"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
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

      </Group>

      {/* Akku: fester Wert, sinkt und lädt nicht von selbst (auch per Doppelklick
          aufs Akku-Symbol in der Statusleiste) */}
      <Group>
      <div>
        <div className={label}>
          Akku <span className="text-text-tertiary">{batteryDraft ?? phone.battery} %</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={batteryDraft ?? phone.battery}
          onChange={(e) => setBatteryDraft(Number(e.target.value))}
          onPointerUp={commitBattery}
          onKeyUp={commitBattery}
          onBlur={commitBattery}
          aria-label="Akkustand"
          className="w-full max-w-xs accent-[var(--color-accent,#f2b25a)]"
        />
      </div>

      </Group>

      {/* Captic gibt es auch für Supporting Characters */}
      {!phone.burner && (
        <Group>
        <Toggle
          checked={phone.captic}
          onChange={(on) => save({ captic: { ...raw.captic, enabled: on } })}
        >
          Captic <span className="text-text-tertiary">· Social Network</span>
        </Toggle>
        </Group>
      )}

      {reduced ? null : phone.burner ? (
        <Group>
        <p className="text-[0.8125rem] text-text-tertiary">
          Burner Phone: nur SMS, keine Apps.
        </p>
        </Group>
      ) : (
        <Group>
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

          {/* Apps: Deko-Standard-Apps an-/abwählen (Fotos, Notizen, Einstellungen
              bleiben immer) und weitere Apps dazunehmen – alles in einem Bereich */}
          <div>
            <div className={label}>
              Apps{" "}
              <span className="text-text-tertiary">
                {appCount}/{freeSlots}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_APPS.filter((a) => DECOR_APPS.includes(a.key)).map((a) => {
                const hidden = raw.hidden_apps ?? [];
                const on = !hidden.includes(a.key);
                return (
                  <button
                    key={a.key}
                    disabled={!on && full}
                    onClick={() =>
                      save({ hidden_apps: on ? [...hidden, a.key] : hidden.filter((k) => k !== a.key) })
                    }
                    className={`${pill(on)} disabled:opacity-40`}
                  >
                    {a.glyph} {a.label}
                  </button>
                );
              })}
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

            {/* Apps, die andere erstellt haben: antippen übernimmt sie auf dieses Handy */}
            {shared.length > 0 && (
              <div className="mt-4">
                <div className={label}>
                  Von anderen Spieler*innen
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shared.map((a) => (
                    <button
                      key={a.id}
                      disabled={full}
                      onClick={() =>
                        save({
                          custom_apps: [
                            ...custom,
                            { id: `app_${Math.random().toString(36).slice(2, 9)}`, name: a.name, icon: a.icon },
                          ],
                        })
                      }
                      className={`${pill(false)} inline-flex items-center gap-1.5 !py-1 !pl-1 disabled:opacity-40`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.icon} alt="" className="h-6 w-6 rounded-md object-cover" />
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Group>
      )}
      </>
      )}
    </div>
  );
}

// Bereich der Handy-Einstellungen: schlichte Karte ohne Überschrift – die
// Beschriftungen der Felder reichen
function Group({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-white/[0.03] p-3">
      {children}
    </section>
  );
}
