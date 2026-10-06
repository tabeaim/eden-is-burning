"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { OPTIONAL_APPS } from "@/lib/phone";
import { ConfirmDialog } from "../ConfirmDialog";
import { Icon } from "../Icon";
import type { Character, CustomPhoneApp } from "@/lib/types";
import { btn, btnDanger, field, hint, row } from "./ui";

// Benutzerdefinierte Handy-Apps aller Charaktere: umbenennen, Icon ersetzen,
// entfernen. (Die Standard-Apps sind fest.)
export function AdminApps() {
  const { characters, npcs, updateCharacter } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ c: Character; a: CustomPhoneApp } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const target = useRef<{ c: Character; a: CustomPhoneApp } | null>(null);

  const entries = [...characters, ...npcs]
    .filter((c) => !c.deleted_at)
    .flatMap((c) => (c.phone?.custom_apps ?? []).map((a) => ({ c, a })))
    .sort((x, y) => x.a.name.localeCompare(y.a.name, "de") || x.c.name.localeCompare(y.c.name, "de"));

  const change = (c: Character, id: string, patch: Partial<CustomPhoneApp>) =>
    updateCharacter(c.id, {
      phone: { ...(c.phone ?? {}), custom_apps: (c.phone?.custom_apps ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) },
    });
  const removeApp = (c: Character, id: string) =>
    updateCharacter(c.id, { phone: { ...(c.phone ?? {}), custom_apps: (c.phone?.custom_apps ?? []).filter((a) => a.id !== id) } });

  async function onIcon(f: File | undefined) {
    const t = target.current;
    if (!f || !t) return;
    setBusy(t.a.id);
    try {
      change(t.c, t.a.id, { icon: await uploadImage(f, "phones", IMAGE_SIZES.avatar) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className={hint}>
        Von Spieler*innen erstellte Apps ({entries.length}). Namen ändern sich beim Verlassen des Felds. Standard-Apps
        zum Auswählen: {OPTIONAL_APPS.map((a) => a.label).join(", ")}.
      </p>
      {entries.length === 0 && <p className={hint}>Noch keine eigenen Apps.</p>}
      {entries.map(({ c, a }) => (
        <div key={`${c.id}:${a.id}`} className={`${row} flex flex-wrap items-center gap-3 px-3 py-2.5`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.icon} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover bg-bg-primary" />
          <input
            defaultValue={a.name}
            maxLength={14}
            aria-label="App-Name"
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== a.name && change(c, a.id, { name: e.target.value.trim() })}
            className={`${field} w-44 max-w-full`}
          />
          <Link href={`/charaktere/${c.id}`} className="min-w-0 flex-1 truncate text-[0.8125rem] text-text-tertiary hover:text-accent">
            auf dem Handy von {c.name}
          </Link>
          <button
            disabled={busy === a.id}
            onClick={() => {
              target.current = { c, a };
              file.current?.click();
            }}
            className={btn}
          >
            <Icon name="upload" size={13} /> {busy === a.id ? "Lädt…" : "Icon ersetzen"}
          </button>
          <button onClick={() => setAsk({ c, a })} aria-label="App entfernen" className={btnDanger}>
            ✕
          </button>
        </div>
      ))}
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void onIcon(f);
        }}
      />
      {ask && (
        <ConfirmDialog
          title={`„${ask.a.name}“ entfernen?`}
          text={`Die App verschwindet vom Handy von ${ask.c.name}. Andere Handys mit derselben App sind nicht betroffen.`}
          confirmLabel="App entfernen"
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            removeApp(ask.c, ask.a.id);
            setAsk(null);
          }}
        />
      )}
    </div>
  );
}
