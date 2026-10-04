"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Character } from "@/lib/types";
import { resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { PhoneAvatar, PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

// Vorschlag für den Captic-Namen: „elliot.simmons"
function defaultHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

// Captic - das fiktive Foto-Netzwerk von Eden. Bisher nur angedeutet: das eigene
// Profil aus Sicht des Charakters, dessen Handy man in der Hand hat. Captic ist
// optional (Einstellungen → Meine Charaktere → Handy); das Profil wird hier in
// der App bearbeitet.
export default function CapticPage() {
  const { myChars, me, setOwner } = useMyPhone();
  const frame = { options: myChars.map((c) => c.id), onOwner: setOwner };

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Captic gibt es nur aus Sicht eines eigenen Charakters.
        </p>
      </PhoneFrame>
    );
  }

  const phone = resolvePhone(me);
  if (!phone.captic) {
    return (
      <PhoneFrame owner={me.id} {...frame}>
        <PhoneHeader back="/handy">
          <div className="text-[1.0625rem] font-semibold text-text-primary">Captic</div>
        </PhoneHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-[0.875rem] text-text-secondary">
            {phone.burner
              ? `Das Burner Phone von ${me.name.split(" ")[0]} kann nur SMS - kein Captic.`
              : `${me.name.split(" ")[0]} hat kein Captic.`}
          </p>
          {!phone.burner && (
            <Link
              href="/einstellungen"
              className="rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
            >
              In den Charakter-Einstellungen aktivieren
            </Link>
          )}
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame owner={me.id} {...frame}>
      {/* key: beim Handy-Wechsel das Formular des vorigen Charakters verwerfen */}
      <CapticProfile key={me.id} me={me} />
    </PhoneFrame>
  );
}

function CapticProfile({ me }: { me: Character }) {
  const { updateCharacter } = useStore();
  const profile = me.phone?.captic ?? {};
  const handle = profile.handle || defaultHandle(me.name);
  const bio = profile.bio ?? me.tagline ?? "";
  const [editing, setEditing] = useState(false);
  const [draftHandle, setDraftHandle] = useState(handle);
  const [draftBio, setDraftBio] = useState(bio);

  function save() {
    updateCharacter(me.id, {
      phone: {
        ...me.phone,
        captic: {
          ...profile,
          enabled: true,
          handle: draftHandle.trim().replace(/^@/, "").replace(/\s+/g, ".").toLowerCase() || undefined,
          bio: draftBio.trim(),
        },
      },
    });
    setEditing(false);
  }

  const field =
    "w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/25 sm:text-[0.875rem]";
  const button =
    "flex-1 rounded-lg bg-white/[0.08] px-3 py-1.5 text-center text-[0.8125rem] font-semibold text-text-primary hover:bg-white/[0.14]";

  return (
    <>
      <div className="flex min-h-[52px] shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-surface px-2">
        <Link href="/handy" aria-label="Zurück" className="flex h-9 w-7 items-center justify-center text-text-primary">
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </Link>
        <div className="flex-1 font-display text-[1.625rem] lowercase leading-none text-text-primary">
          captic<span className="text-[#e8457a]">.</span>
        </div>
        <span aria-hidden className="flex gap-4 pr-2 text-text-tertiary">
          <Icon name="heart" size={21} />
          <Icon name="message" size={21} />
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-5 px-4 pt-4">
          <span className="rounded-full bg-[linear-gradient(135deg,#ff9d5c,#e8457a,#7b3fd6)] p-[3px]">
            <PhoneAvatar character={me} size={76} className="ring-[3px] ring-[#0c0c0e]" />
          </span>
          <div className="flex flex-1 justify-around text-center">
            {[
              ["0", "Beiträge"],
              ["-", "Follower"],
              ["-", "Gefolgt"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-[1.0625rem] font-bold text-text-primary">{n}</div>
                <div className="text-[0.75rem] text-text-tertiary">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 px-4 pt-3">
            <label className="text-[0.75rem] text-text-tertiary">
              Nutzername
              <input
                value={draftHandle}
                maxLength={30}
                onChange={(e) => setDraftHandle(e.target.value)}
                className={`mt-1 ${field}`}
              />
            </label>
            <label className="text-[0.75rem] text-text-tertiary">
              Bio ({draftBio.length}/150)
              <textarea
                value={draftBio}
                maxLength={150}
                rows={3}
                onChange={(e) => setDraftBio(e.target.value)}
                className={`mt-1 resize-none ${field}`}
              />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className={button}>
                Abbrechen
              </button>
              <button onClick={save} className={`${button} !bg-accent/90 !text-black`}>
                Speichern
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3">
            <div className="text-[0.875rem] font-semibold text-text-primary">{me.name}</div>
            <div className="text-[0.8125rem] text-text-tertiary">@{handle}</div>
            {bio && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] text-text-secondary">{bio}</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setDraftHandle(handle);
                  setDraftBio(bio);
                  setEditing(true);
                }}
                className={button}
              >
                Profil bearbeiten
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-0.5 border-t border-border-subtle pt-0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="aspect-square bg-white/[0.04]" />
          ))}
        </div>
        <div className="px-8 py-6 text-center">
          <div className="text-[0.9375rem] font-semibold text-text-primary">Beiträge kommen bald</div>
          <p className="mt-1 text-[0.8125rem] text-text-tertiary">
            Hier postet {me.name.split(" ")[0]} demnächst Fotos, Stories und Kommentare - immer aus
            der eigenen Sicht.
          </p>
        </div>
      </div>

      {/* Angedeutete Tab-Leiste */}
      <div aria-hidden className="flex shrink-0 items-center justify-around border-t border-border-subtle bg-bg-surface py-2.5 text-text-tertiary">
        <Icon name="dashboard" size={22} />
        <Icon name="search" size={22} />
        <Icon name="plus" size={22} />
        <Icon name="heart" size={22} />
        <PhoneAvatar character={me} size={24} className="ring-1 ring-text-primary" />
      </div>
    </>
  );
}
