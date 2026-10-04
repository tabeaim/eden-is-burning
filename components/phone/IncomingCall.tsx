"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PhoneCall } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatInplayDateShort } from "@/lib/format";
import { phoneSceneHref } from "@/lib/phone";
import { PhoneAvatar } from "./PhoneFrame";

// Eingehender Anruf als Karte über dem Display (Startbildschirm, Telefon-App):
// annehmen oder ablehnen. Nach dem Annehmen die Frage, ob eine Szene entstehen
// soll — die führt ins vorausgefüllte Neue-Szene-Formular.
export function IncomingCall({ characterId }: { characterId: string }) {
  const router = useRouter();
  const { calls, character, updateCall } = useStore();
  const [accepted, setAccepted] = useState<PhoneCall | null>(null);
  const call = calls.find((c) => c.status === "ringing" && c.callee_id === characterId);

  if (accepted) {
    return (
      <div className="absolute inset-0 z-20 flex items-center bg-black/60 p-4">
        <div className="w-full rounded-2xl border border-border-subtle bg-bg-surface-2 p-4">
          <div className="text-[0.9375rem] font-semibold text-text-primary">Neue Szene erstellen?</div>
          <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">
            Die Telefonszene ist mit beiden Charakteren, Datum und Uhrzeit des Anrufs vorausgefüllt.
          </p>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => setAccepted(null)}
              className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Nein, ohne Szene
            </button>
            <button
              onClick={() =>
                router.push(
                  phoneSceneHref({
                    from: accepted.caller_id,
                    to: accepted.callee_id,
                    date: accepted.inplay_date,
                    time: accepted.inplay_time,
                    call: accepted.id,
                  }),
                )
              }
              className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black"
            >
              Szene erstellen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!call) return null;
  const caller = character(call.caller_id);
  return (
    <div className="absolute inset-0 z-20 flex items-center bg-black/60 p-4">
      <div className="w-full rounded-2xl border border-accent/60 bg-[#2a211b] p-4 text-center">
        <div className="flex justify-center">
          {caller && <PhoneAvatar character={caller} size={64} className="phone-ring" />}
        </div>
        <div className="mt-2 text-[1rem] font-semibold text-text-primary">
          {caller?.name ?? "Unbekannt"} ruft an
        </div>
        <div className="text-[0.8125rem] text-text-tertiary">
          {[formatInplayDateShort(call.inplay_date), call.inplay_time].filter(Boolean).join(", ")}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => updateCall(call.id, { status: "declined" })}
            className="flex-1 rounded-full bg-red-500/85 py-2 text-[0.875rem] font-semibold text-white"
          >
            Ablehnen
          </button>
          <button
            onClick={() => {
              updateCall(call.id, { status: "accepted" });
              setAccepted({ ...call, status: "accepted" });
            }}
            className="flex-1 rounded-full bg-green-500/85 py-2 text-[0.875rem] font-semibold text-black"
          >
            Annehmen
          </button>
        </div>
      </div>
    </div>
  );
}
