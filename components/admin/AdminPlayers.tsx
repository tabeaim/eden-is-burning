"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { playsAs, tierOf } from "@/lib/characters";
import { timeAgo } from "@/lib/format";
import { ConfirmDialog } from "../ConfirmDialog";
import type { Player } from "@/lib/types";
import { btn, btnDanger, btnPrimary, hint, row } from "./ui";

// Spieler*innen: freischalten/sperren, Admin-Rechte vergeben, Konto löschen,
// Überblick über ihre Charaktere. Die eigene Löschung steht in „Mein Profil".
export function AdminPlayers() {
  const { players, characters, npcs, updatePlayer, deletePlayer, currentPlayer, onlineIds, refresh } = useStore();
  const [note, setNote] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ title: string; text: string; label: string; run: () => void } | null>(null);
  const sorted = [...players].sort(
    (a, b) => Number(!!a.approved) - Number(!!b.approved) || a.username.localeCompare(b.username, "de"),
  );
  const pending = players.filter((p) => !p.approved).length;
  const count = (p: Player) =>
    characters.filter((c) => c.player_id === p.id && !c.deleted_at).length +
    npcs.filter((c) => tierOf(c) === "supporting" && playsAs(c, p.id) && !c.deleted_at).length;

  return (
    <div className="flex flex-col gap-3">
      <p className={hint}>
        {pending > 0 ? `${pending} warten auf Freischaltung. ` : "Niemand wartet auf Freischaltung. "}
        <button onClick={() => void refresh()} className="underline hover:text-text-secondary">
          Aktualisieren
        </button>
      </p>
      {note && (
        <p role="status" className="text-[0.8125rem] text-text-secondary">
          {note}
        </p>
      )}
      {sorted.map((p) => {
        const me = p.id === currentPlayer?.id;
        return (
          <div key={p.id} className={`${row} flex flex-wrap items-center gap-3 px-3 py-2.5`}>
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover bg-bg-primary" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-primary text-[0.875rem] text-text-tertiary">
                {p.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[0.875rem] text-text-primary">
                {p.username}
                {p.is_admin && <span className="text-[0.75rem] text-accent">Admin</span>}
                {me && <span className="text-[0.75rem] text-text-tertiary">du</span>}
                {!p.approved && <span className="text-[0.75rem] text-yellow-400">wartet</span>}
                {onlineIds.includes(p.id) && <span className="h-2 w-2 rounded-full bg-green-500" title="online" />}
              </div>
              <div className="truncate text-[0.8125rem] text-text-tertiary">
                {p.email} · {count(p)} {count(p) === 1 ? "Charakter" : "Charaktere"} · zuletzt online {timeAgo(p.last_seen)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {!p.approved ? (
                <button onClick={() => updatePlayer(p.id, { approved: true })} className={btnPrimary}>
                  Freischalten
                </button>
              ) : (
                !me && (
                  <button
                    onClick={() =>
                      setAsk({
                        title: `${p.username} sperren?`,
                        text: "Die Person kommt danach nicht mehr in die App, bis du sie wieder freischaltest. Ihre Charaktere und Posts bleiben erhalten.",
                        label: "Sperren",
                        run: () => updatePlayer(p.id, { approved: false }),
                      })
                    }
                    className={btn}
                  >
                    Sperren
                  </button>
                )
              )}
              {!me && (
                <button
                  onClick={() =>
                    setAsk({
                      title: `${p.username} löschen?`,
                      text: `Das Konto und der Login von ${p.username} werden endgültig gelöscht. Die Main Characters (${characters.filter((c) => c.player_id === p.id && !c.deleted_at).length}) kommen in den Papierkorb und gehen an dich, Supporting Characters und Statist*innen bleiben bei dir, Posts bleiben in den Szenen stehen. Das lässt sich nicht rückgängig machen.`,
                      label: "Konto löschen",
                      run: () =>
                        void deletePlayer(p.id).then((res) =>
                          setNote(
                            res.error
                              ? `Löschen fehlgeschlagen: ${res.error}`
                              : res.authKept
                                ? `${p.username} ist gelöscht. Das Login-Konto ließ sich nicht entfernen – bitte im Supabase-Dashboard unter Authentication löschen.`
                                : `${p.username} ist gelöscht.`,
                          ),
                        ),
                    })
                  }
                  className={btnDanger}
                >
                  Löschen
                </button>
              )}
              {p.approved && !me && (
                <button
                  onClick={() =>
                    p.is_admin
                      ? setAsk({
                          title: `${p.username} die Admin-Rechte entziehen?`,
                          text: "Die Person kann danach keine Admin-Einstellungen mehr ändern.",
                          label: "Rechte entziehen",
                          run: () => updatePlayer(p.id, { is_admin: false }),
                        })
                      : setAsk({
                          title: `${p.username} zum Admin machen?`,
                          text: "Admins verwalten Spieler*innen, Charaktere, Orte und das Design der App.",
                          label: "Zum Admin machen",
                          run: () => updatePlayer(p.id, { is_admin: true }),
                        })
                  }
                  className={btn}
                >
                  {p.is_admin ? "Admin entziehen" : "Zum Admin machen"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {ask && (
        <ConfirmDialog
          title={ask.title}
          text={ask.text}
          confirmLabel={ask.label}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            ask.run();
            setAsk(null);
          }}
        />
      )}
    </div>
  );
}
