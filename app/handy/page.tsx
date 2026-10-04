"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { PhoneFrame, useMyPhone } from "@/components/phone/PhoneFrame";
import {
  AppIcon,
  CAPTIC_BG,
  CapticGlyph,
  MESSENGER_BG,
  MessengerGlyph,
} from "@/components/phone/AppIcon";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

// Startbildschirm des Handys: Hintergrundbild, angedeutete Apps und unten im
// Dock die beiden echten — Nachrichten und Captic.
export default function PhoneHomePage() {
  const { chats, isChatNew } = useStore();
  const { myChars, me, setOwner } = useMyPhone();

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-[0.875rem] text-text-secondary">
            Ein eigenes Handy bekommst du mit deinem ersten Charakter.
          </p>
          <Link
            href="/handy/nachrichten"
            className="rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
          >
            Alle Chats mitlesen
          </Link>
        </div>
      </PhoneFrame>
    );
  }

  const phone = resolvePhone(me);
  const unread = chats.filter((c) => c.participant_ids.includes(me.id) && isChatNew(c.id)).length;
  const now = new Date();

  return (
    <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner} tone="home">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-black/15 px-4 pb-2 pt-5">
        <div className="text-center text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
          <div className="text-[0.9375rem] font-medium">
            {WEEKDAYS[now.getDay()]}, {now.getDate()}. {MONTHS[now.getMonth()]}
          </div>
        </div>

        {/* Angedeutete Apps — nicht anklickbar */}
        <div aria-hidden className="mt-6 grid grid-cols-4 justify-items-center gap-y-5">
          {phone.apps.map((a) => (
            <AppIcon key={a.key} label={a.label} bg={a.bg}>
              {a.glyph}
            </AppIcon>
          ))}
        </div>

        <div className="min-h-6 flex-1" />

        <div className="flex justify-center gap-6 rounded-[1.75rem] bg-white/15 px-4 pb-2 pt-3 backdrop-blur-md">
          <Link href="/handy/nachrichten">
            <AppIcon label="Nachrichten" bg={MESSENGER_BG} badge={unread}>
              <MessengerGlyph />
            </AppIcon>
          </Link>
          <Link href="/handy/captic">
            <AppIcon label="Captic" bg={CAPTIC_BG}>
              <CapticGlyph />
            </AppIcon>
          </Link>
        </div>
      </div>
    </PhoneFrame>
  );
}
