"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import { PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";
import { CapticApp } from "@/components/phone/captic/CapticApp";

// Captic – das fiktive Foto-Netzwerk von Eden, immer aus Sicht des Charakters,
// dessen Handy man in der Hand hat. Captic ist optional (Einstellungen → Meine
// Charaktere → Handy); die App selbst steckt in `CapticApp`.
export default function CapticPage() {
  const router = useRouter();
  const { character } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  const frame = {
    options: myChars.map((c) => c.id),
    // Wechsel auf ein Handy ohne Captic: zurück auf dessen Startbildschirm
    onOwner: (id: string) => {
      setOwner(id);
      if (!resolvePhone(character(id)).captic) router.push("/handy");
    },
  };

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
              ? `Das Burner Phone von ${me.name.split(" ")[0]} kann nur SMS – kein Captic.`
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
      {/* key: beim Handy-Wechsel beginnt die App neu (Feed des anderen Charakters) */}
      <CapticApp key={me.id} me={me} />
    </PhoneFrame>
  );
}
