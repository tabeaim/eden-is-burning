"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { IncomingCall, isPostponed } from "@/components/phone/IncomingCall";
import { PhoneFrame, useMyPhone } from "@/components/phone/PhoneFrame";
import { PhoneHome } from "@/components/phone/PhoneHome";

// Anrufe, für die schon einmal aufs Handy des Angerufenen gewechselt wurde
const switched = new Set<string>();

// Startbildschirm des eigenen Handys (Inhalt: `PhoneHome`).
export default function PhoneHomePage() {
  const { incomingCalls } = useStore();
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

  return (
    <PhoneFrame
      owner={me.id}
      options={myChars.map((c) => c.id)}
      onOwner={setOwner}
      tone={resolvePhone(me).burner ? "app" : "home"}
    >
      <PhoneHome character={me} />
      <IncomingCall characterId={me.id} />
    </PhoneFrame>
  );
}
