"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PhoneCall } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatInplayDateShort } from "@/lib/format";
import { PHONE_AREA, PHONE_LOCATION, phoneSceneTitle } from "@/lib/phone";
import { PhoneAvatar } from "./PhoneFrame";

type CallData = Pick<PhoneCall, "caller_id" | "callee_id" | "inplay_date" | "inplay_time">;

// Legt die Telefonszene zu einem Anruf an: beide am Apparat, Ort „am Telefon",
// Datum und Uhrzeit des Anrufs. Ohne Titel heißt sie „A & B on the phone".
export function useCreatePhoneScene() {
  const { addScene, character } = useStore();
  return (call: CallData, title: string) => {
    const people = [call.caller_id, call.callee_id]
      .map((id) => character(id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    return addScene({
      title: title.trim() || phoneSceneTitle(people),
      location_area: PHONE_AREA,
      location_name: PHONE_LOCATION,
      inplay_date: call.inplay_date,
      inplay_time: call.inplay_time ?? "",
      status: "active",
      trigger_warning: false,
      participant_ids: [call.caller_id, call.callee_id],
      summary: null,
    });
  };
}

// Nach dem Annehmen (oder später aus der Anrufliste): Soll aus dem Anruf eine
// Szene werden? Titel optional.
export function PhoneSceneDialog({ call, onClose }: { call: PhoneCall; onClose: () => void }) {
  const router = useRouter();
  const { character, updateCall } = useStore();
  const createScene = useCreatePhoneScene();
  const [title, setTitle] = useState("");
  const placeholder = phoneSceneTitle(
    [call.caller_id, call.callee_id]
      .map((id) => character(id))
      .filter((c): c is NonNullable<typeof c> => !!c),
  );
  return (
    <div className="absolute inset-0 z-20 flex items-center bg-black/60 p-4">
      <div className="w-full rounded-2xl border border-border-subtle bg-bg-surface-2 p-4">
        <div className="text-[0.9375rem] font-semibold text-text-primary">Neue Szene erstellen?</div>
        <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">
          Die Telefonszene ist mit beiden Charakteren, Datum und Uhrzeit des Anrufs vorausgefüllt.
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Titel (optional): ${placeholder}`}
          className="mt-3 w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]"
        />
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Nein, ohne Szene
          </button>
          <button
            onClick={() => {
              const sceneId = createScene(call, title);
              updateCall(call.id, { scene_id: sceneId });
              router.push(`/szenen/${sceneId}`);
            }}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black"
          >
            Szene erstellen
          </button>
        </div>
      </div>
    </div>
  );
}

// Eingehender Anruf als Karte über dem Display (Startbildschirm, Telefon-App):
// annehmen oder ablehnen; nach dem Annehmen folgt die Frage nach einer Szene.
export function IncomingCall({ characterId }: { characterId: string }) {
  const { calls, character, updateCall } = useStore();
  const [accepted, setAccepted] = useState<PhoneCall | null>(null);
  const call = calls.find((c) => c.status === "ringing" && c.callee_id === characterId);

  if (accepted) return <PhoneSceneDialog call={accepted} onClose={() => setAccepted(null)} />;
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
