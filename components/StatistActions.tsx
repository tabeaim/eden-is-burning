"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { playsAs } from "@/lib/characters";
import { ConfirmDialog } from "./ConfirmDialog";

// Was man mit einer Statist*in tun kann (Karte in der Übersicht, Profil):
// „Bespielen" fragt, ob sie zum Supporting Character werden soll
// (dann nur noch mir zugeordnet, nicht mehr bei den Statist*innen) oder ob ich sie
// nur zeitweise bespiele (bleibt Statist*in, auch für andere). Wer sie zeitweise
// bespielt, kann sie jederzeit wieder von sich lösen.
// `upgrade` (Profil): zusätzlich ein eigener Knopf „Zum Supporting Character machen".
export function StatistActions({
  character,
  className = "",
  upgrade = false,
}: {
  character: Character;
  className?: string;
  upgrade?: boolean;
}) {
  const { currentPlayer, updateCharacter } = useStore();
  const [asking, setAsking] = useState(false);
  const [confirmSc, setConfirmSc] = useState(false);
  if (!currentPlayer) return null;
  const me = currentPlayer.id;
  const co = character.co_owner_ids ?? [];
  const playing = playsAs(character, me);

  const makeSc = () =>
    updateCharacter(character.id, { npc_tier: "supporting", player_id: me, co_owner_ids: [] });
  const btn = "rounded-md px-3 py-1.5 text-[0.8125rem]";
  const secondary = `${btn} border border-border-subtle bg-white/[0.04] text-text-primary hover:bg-white/[0.08]`;
  const primary = `${btn} bg-accent/90 font-medium text-black hover:bg-accent`;

  return (
    <div className={`relative z-10 flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {playing ? (
        <button onClick={() => updateCharacter(character.id, { co_owner_ids: co.filter((id) => id !== me) })} className={secondary}>
          Von mir lösen
        </button>
      ) : (
        <button onClick={() => setAsking(true)} className={primary}>
          Bespielen
        </button>
      )}

      {upgrade && (
        <button onClick={() => setConfirmSc(true)} className={secondary}>
          Zum Supporting Character machen
        </button>
      )}
      {confirmSc && (
        <ConfirmDialog
          title={`${character.name} zum Supporting Character machen?`}
          text={`${character.name} ist dann nur noch dir zugeordnet und verschwindet aus den Statist*innen. Wer sie gerade zeitweise bespielt, verliert den Zugriff. Weitere Spieler*innen kannst du in den Einstellungen zuordnen.`}
          confirmLabel="Zum Supporting Character machen"
          onCancel={() => setConfirmSc(false)}
          onConfirm={() => {
            setConfirmSc(false);
            makeSc();
          }}
        />
      )}

      {asking && (
        <div
          onClick={() => setAsking(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${character.name} bespielen`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-surface p-5 text-left shadow-2xl shadow-black/70"
          >
            <div className="font-serif text-[1rem] text-text-primary">{character.name} bespielen</div>
            <div className="mt-3 flex flex-col gap-2">
              {!playing && (
                <button
                  onClick={() => {
                    updateCharacter(character.id, { co_owner_ids: [...co, me] });
                    setAsking(false);
                  }}
                  className="rounded-lg border border-border-subtle bg-white/[0.04] p-3 text-left hover:bg-white/[0.08]"
                >
                  <div className="text-[0.875rem] font-medium text-text-primary">Nur zeitweise bespielen</div>
                  <div className="mt-0.5 text-[0.8125rem] text-text-tertiary">
                    {character.name} bleibt Statist*in und kann auch von anderen bespielt werden. Du
                    kannst dich jederzeit wieder lösen.
                  </div>
                </button>
              )}
              <button
                onClick={() => {
                  makeSc();
                  setAsking(false);
                }}
                className="rounded-lg border border-border-subtle bg-white/[0.04] p-3 text-left hover:bg-white/[0.08]"
              >
                <div className="text-[0.875rem] font-medium text-text-primary">Zum Supporting Character machen</div>
                <div className="mt-0.5 text-[0.8125rem] text-text-tertiary">
                  {character.name} ist dann nur noch dir zugeordnet und verschwindet aus den
                  Statist*innen. Weitere Spieler*innen kannst du in den Einstellungen zuordnen.
                </div>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setAsking(false)} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
