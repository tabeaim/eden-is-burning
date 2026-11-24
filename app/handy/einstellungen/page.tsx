"use client";

import Link from "next/link";
import { PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";
import { PhoneSettings } from "@/components/phone/PhoneSettings";

// Einstellungen-App des eigenen Handys: dieselben Handy-Einstellungen wie unter
// Einstellungen → Meine Charaktere (Look, Hintergrund, Apps, Captic), direkt im
// Display. Den Schalter „Hat ein Handy" gibt es hier nicht – sonst sperrt man
// sich aus dem Handy aus.
export default function PhoneSettingsPage() {
  const { myChars, me, setOwner } = useMyPhone();

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Einstellungen gibt es nur auf dem Handy eines eigenen Charakters.
        </p>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner}>
      <PhoneHeader back="/handy">
        <span className="text-[1rem] font-semibold text-text-primary">Einstellungen</span>
      </PhoneHeader>
      <div className="min-h-0 flex-1 overflow-y-auto bg-bg-surface px-3 py-3">
        <PhoneSettings key={me.id} character={me} reduced={me.is_npc} inPhone />
        <Link
          href={`/einstellungen#handy-${me.id}`}
          className="mt-6 block text-center text-[0.8125rem] text-text-tertiary hover:text-text-secondary"
        >
          Alle Einstellungen von {me.name.split(" ")[0]} →
        </Link>
      </div>
    </PhoneFrame>
  );
}
