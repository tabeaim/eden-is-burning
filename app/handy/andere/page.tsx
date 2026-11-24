"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character } from "@/lib/types";
import { CALL_TO_KEY, PHONE_MODELS, SMS_TO_KEY, hasPhone, resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { PhoneAvatar, useMyPhone } from "@/components/phone/PhoneFrame";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { CAPTIC_OPEN_KEY } from "@/components/phone/captic/CapticApp";

// „Andere Handys": alle Handys fremder Charaktere zum Ansehen. Übersicht mit
// Hintergrund, Profilbild und Modell (mit Suche); ein Handy lässt sich groß
// öffnen, mit ‹ › weiterblättern, und von dort aus SMS schreiben, anrufen oder
// das Captic-Profil öffnen – immer aus Sicht des eigenen Handys.
export default function OtherPhonesPage() {
  const router = useRouter();
  const { characters, npcs } = useStore();
  const { me } = useMyPhone();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const all = [...characters, ...npcs]
    .filter((c) => hasPhone(c) && c.player_id !== me?.player_id)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const shown = all.filter((c) => !query || c.name.toLowerCase().includes(query));
  const index = shown.findIndex((c) => c.id === openId);
  const open = index >= 0 ? shown[index] : null;
  const step = (dir: -1 | 1) => {
    if (!shown.length) return;
    setOpenId(shown[(index + dir + shown.length) % shown.length].id);
  };

  // Pfeiltasten blättern, Esc schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Aktionen laufen über das eigene Handy (wie „Nachricht schreiben" in den Kontakten)
  const go = (key: string, value: string, href: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    router.push(href);
  };

  const modelLabel = (c: Character) =>
    PHONE_MODELS.find((m) => m.key === resolvePhone(c).model)?.label ?? "";
  const actionBtn =
    "flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] font-medium text-text-primary hover:bg-white/[0.08]";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/handy" className="flex items-center gap-1 text-[0.8125rem] text-accent hover:underline">
          <Icon name="chevron-right" size={16} className="rotate-180" />
          Eigenes Handy
        </Link>
        <h1 className="text-[1.25rem] font-bold text-text-primary">Andere Handys</h1>
        <label className="ml-auto flex w-full items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary sm:w-64">
          <Icon name="search" size={15} className="shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Charakter suchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
          />
        </label>
      </div>

      {shown.length === 0 && (
        <p className="pt-16 text-center text-[0.875rem] text-text-tertiary">
          {query ? "Kein Handy gefunden." : "Noch keine anderen Handys."}
        </p>
      )}

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
        {shown.map((c) => {
          const phone = resolvePhone(c);
          return (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              style={{ ["--frame" as string]: phone.frame }}
              className="group flex flex-col overflow-hidden rounded-2xl border-[5px] border-[var(--frame)] text-left shadow-lg shadow-black/40 transition-transform hover:-translate-y-0.5"
            >
              <span
                style={{ background: phone.wallpaper }}
                className={`flex aspect-[9/14] flex-col items-center justify-center gap-2 p-2 ${phone.burner ? "grayscale" : ""}`}
              >
                <span className="pointer-events-none">
                  <PhoneAvatar character={c} size={56} />
                </span>
              </span>
              <span className="block bg-bg-surface px-2 py-1.5">
                <span className="block truncate text-[0.8125rem] font-semibold text-text-primary">{c.name}</span>
                <span className="block truncate text-[0.6875rem] text-text-tertiary">{modelLabel(c)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black/75 p-3 pt-6"
          onClick={() => setOpenId(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center gap-2">
              <button
                onClick={() => step(-1)}
                aria-label="Voriges Handy"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.14]"
              >
                <Icon name="chevron-right" size={18} className="rotate-180" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[1rem] font-semibold text-text-primary">Handy von {open.name}</div>
                <div className="text-[0.75rem] text-text-tertiary">
                  {index + 1} / {shown.length} · {modelLabel(open)}
                </div>
              </div>
              <button
                onClick={() => step(1)}
                aria-label="Nächstes Handy"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.14]"
              >
                <Icon name="chevron-right" size={18} />
              </button>
            </div>

            {me && (
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => go(SMS_TO_KEY, open.id, "/handy/neu")} className={actionBtn}>
                  <Icon name="message" size={15} className="text-accent" />
                  SMS schreiben
                </button>
                <button onClick={() => go(CALL_TO_KEY, open.id, "/handy/kontakte")} className={actionBtn}>
                  <Icon name="call" size={15} className="text-accent" />
                  Anrufen
                </button>
                {resolvePhone(open).captic && resolvePhone(me).captic && (
                  <button onClick={() => go(CAPTIC_OPEN_KEY, `profile:${open.id}`, "/handy/captic")} className={actionBtn}>
                    <Icon name="camera" size={15} className="text-accent" />
                    Captic-Profil
                  </button>
                )}
              </div>
            )}

            {/* key: beim Blättern beginnt die Vorschau wieder auf dem Startbildschirm */}
            <PhonePreview key={open.id} character={open} />

            <button
              onClick={() => setOpenId(null)}
              className="py-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
