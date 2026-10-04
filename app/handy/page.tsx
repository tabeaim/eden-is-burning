"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { IncomingCall, isPostponed } from "@/components/phone/IncomingCall";
import { PhoneFrame, useMyPhone } from "@/components/phone/PhoneFrame";
import {
  AppIcon,
  CAPTIC_BG,
  CapticGlyph,
  MESSENGER_BG,
  MessengerGlyph,
} from "@/components/phone/AppIcon";

// Anrufe, für die schon einmal aufs Handy des Angerufenen gewechselt wurde
const switched = new Set<string>();

// Startbildschirm des Handys: Hintergrundbild, angedeutete Apps und unten im
// Dock die echten – Nachrichten und (wenn aktiviert) Captic.
export default function PhoneHomePage() {
  const { chats, calls, isChatNew, incomingCalls } = useStore();
  const { myChars, me, setOwner } = useMyPhone();

  // Wird gerade ein eigener Charakter angerufen, zeigt „Handy" zuerst dessen Handy
  // (einmal je Anruf – danach lässt sich normal wechseln).
  const ringingFor = incomingCalls.find((c) => !isPostponed(c.id) && !switched.has(c.id));
  useEffect(() => {
    if (!ringingFor) return;
    switched.add(ringingFor.id);
    if (ringingFor.callee_id !== me?.id) setOwner(ringingFor.callee_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringingFor?.id]);

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
  const ringingCount = calls.filter((c) => c.status === "ringing" && c.callee_id === me.id).length;

  // Burner Phone: kein Startbildschirm mit Apps, nur das Menü eines Tastenhandys
  if (phone.burner) {
    return (
      <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner}>
        <div className="flex flex-1 flex-col px-3 py-3">
          <div className="border-b-2 border-border-strong pb-1 text-center text-[0.875rem] font-bold uppercase tracking-widest text-text-primary">
            Menü
          </div>
          <Link
            href="/handy/nachrichten"
            className="mt-3 flex items-center justify-between bg-accent px-3 py-3 text-[1rem] font-bold text-black"
          >
            <span>✉ Nachrichten</span>
            <span>{unread > 0 ? `${unread} neu` : "›"}</span>
          </Link>
          <Link href="/handy/telefon" className="flex items-center justify-between px-3 py-3 text-[1rem] font-bold text-text-primary">
            <span>☎ Anrufliste</span>
            <span>{ringingCount > 0 ? `${ringingCount} klingelt` : "›"}</span>
          </Link>
          <Link href="/handy/kontakte" className="flex items-center justify-between px-3 py-3 text-[1rem] font-bold text-text-primary">
            <span>☺ Kontakte</span>
            <span>›</span>
          </Link>
          <Link href={`/einstellungen#charakter-${me.id}`} className="flex items-center justify-between px-3 py-3 text-[1rem] font-bold text-text-primary">
            <span>⚙ Einstellungen</span>
            <span>›</span>
          </Link>
          <div className="flex-1" />
          <div className="text-center text-[0.75rem] text-text-tertiary">Prepaid · kein Internet</div>
        </div>
        <IncomingCall characterId={me.id} />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner} tone="home">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-black/15 px-4 pb-2 pt-5">
        {/* Angedeutete Apps – nicht anklickbar (außer „Einstellungen") */}
        <div className="grid grid-cols-4 justify-items-center gap-y-5">
          {phone.apps.map((a) => {
            const icon = (
              <AppIcon label={a.label} bg={a.bg} icon={a.icon}>
                {a.glyph}
              </AppIcon>
            );
            return a.href ? (
              <Link key={a.key} href={`${a.href}#charakter-${me.id}`}>
                {icon}
              </Link>
            ) : (
              <span key={a.key} aria-hidden>
                {icon}
              </span>
            );
          })}
        </div>

        <div className="min-h-6 flex-1" />

        <div className="flex justify-center gap-3 rounded-[1.75rem] bg-white/15 px-3 pb-2 pt-3 backdrop-blur-md">
          <Link href="/handy/telefon">
            <AppIcon label="Telefon" bg="linear-gradient(#5fd66b, #2aa63a)" badge={ringingCount}>
              <span className={ringingCount > 0 ? "phone-ring" : ""}>📞</span>
            </AppIcon>
          </Link>
          <Link href="/handy/nachrichten">
            <AppIcon label="Nachrichten" bg={MESSENGER_BG} badge={unread}>
              <MessengerGlyph />
            </AppIcon>
          </Link>
          {phone.captic && (
            <Link href="/handy/captic">
              <AppIcon label="Captic" bg={CAPTIC_BG}>
                <CapticGlyph />
              </AppIcon>
            </Link>
          )}
        </div>
      </div>
      <IncomingCall characterId={me.id} />
    </PhoneFrame>
  );
}
