"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { resolvePhone } from "@/lib/phone";
import { PhoneAvatar, PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

// Captic — das fiktive Foto-Netzwerk von Eden. Bisher nur angedeutet: das eigene
// Profil aus Sicht des Charakters, dessen Handy man in der Hand hat (nie „Alle").
export default function CapticPage() {
  const { myChars, me, setOwner } = useMyPhone();

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Captic gibt es nur aus Sicht eines eigenen Charakters.
        </p>
      </PhoneFrame>
    );
  }

  const first = me.name.split(" ")[0];

  if (resolvePhone(me).burner) {
    return (
      <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner}>
        <PhoneHeader back="/handy">
          <div className="text-[1.0625rem] font-semibold text-text-primary">Captic</div>
        </PhoneHeader>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Das Burner Phone von {first} kann nur SMS — kein Captic.
        </p>
      </PhoneFrame>
    );
  }

  const handle = me.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, ".");

  return (
    <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner}>
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
              ["–", "Follower"],
              ["–", "Gefolgt"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-[1.0625rem] font-bold text-text-primary">{n}</div>
                <div className="text-[0.75rem] text-text-tertiary">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 pt-3">
          <div className="text-[0.875rem] font-semibold text-text-primary">{me.name}</div>
          <div className="text-[0.8125rem] text-text-tertiary">@{handle}</div>
          {me.tagline && <p className="mt-1 text-[0.8125rem] text-text-secondary">{me.tagline}</p>}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-0.5 border-t border-border-subtle pt-0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="aspect-square bg-white/[0.04]" />
          ))}
        </div>
        <div className="px-8 py-6 text-center">
          <div className="text-[0.9375rem] font-semibold text-text-primary">Captic kommt bald</div>
          <p className="mt-1 text-[0.8125rem] text-text-tertiary">
            Hier postet {first} demnächst Fotos, Stories und Kommentare — immer aus der
            eigenen Sicht.
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
    </PhoneFrame>
  );
}
