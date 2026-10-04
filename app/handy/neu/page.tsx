"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { ChatMessageKind } from "@/lib/types";
import { Composer } from "@/components/phone/Composer";
import { PhoneAvatar, PhoneFrame, PhoneHeader, usePhoneOwner } from "@/components/phone/PhoneFrame";

// „Neue SMS": Von (eigener Charakter) → An (beliebiger Charakter oder NPC) →
// erste Nachricht. Gibt es den Chat schon, landet die Nachricht dort.
export default function NewSmsPage() {
  const router = useRouter();
  const { characters, npcs, chats, currentPlayer, charactersOf, openChat, addMessage } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const [stored, setOwner] = usePhoneOwner();
  const [fromId, setFromId] = useState<string | null>(null);
  const from = myChars.find((c) => c.id === (fromId ?? stored)) ?? myChars[0];
  const [toId, setToId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const everyone = [...characters, ...npcs];
  const to = everyone.find((c) => c.id === toId && c.id !== from?.id);
  const query = q.trim().toLowerCase();
  const suggestions = everyone
    .filter((c) => c.id !== from?.id && (!query || c.name.toLowerCase().includes(query)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const existing =
    from && to
      ? chats.find(
          (c) =>
            c.participant_ids.length === 2 &&
            c.participant_ids.includes(from.id) &&
            c.participant_ids.includes(to.id),
        )
      : undefined;

  function send(kind: ChatMessageKind, content: string) {
    if (!from || !to) return;
    const id = openChat([from.id, to.id]);
    addMessage(id, from.id, kind, content);
    setOwner(from.id);
    router.push(`/handy/${id}`);
  }

  const label = "w-9 shrink-0 text-[0.8125rem] text-text-tertiary";

  return (
    <PhoneFrame>
      <PhoneHeader back="/handy">
        <div className="text-[1.0625rem] font-semibold text-text-primary">Neue SMS</div>
      </PhoneHeader>

      {myChars.length === 0 ? (
        <p className="p-6 text-center text-[0.875rem] text-text-secondary">
          Du brauchst einen eigenen Charakter, um Nachrichten zu schreiben.
        </p>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2">
            <span className={label}>Von:</span>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {myChars.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFromId(c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[0.8125rem] ${
                    c.id === from?.id
                      ? "bg-accent text-black"
                      : "bg-white/[0.06] text-text-secondary"
                  }`}
                >
                  <PhoneAvatar character={c} size={24} />
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2">
            <span className={label}>An:</span>
            {to ? (
              <button
                onClick={() => setToId(null)}
                title="Empfänger*in ändern"
                className="flex items-center gap-1.5 rounded-full bg-white/[0.08] py-1 pl-1 pr-2.5 text-[0.8125rem] text-text-primary"
              >
                <PhoneAvatar character={to} size={24} />
                {to.name}
                <span className="text-text-tertiary">✕</span>
              </button>
            ) : (
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Charakter oder NPC suchen…"
                autoFocus
                className="min-w-0 flex-1 bg-transparent py-1 text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.9375rem]"
              />
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!to &&
              suggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setToId(c.id);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] active:bg-white/[0.06]"
                >
                  <PhoneAvatar character={c} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] text-text-primary">
                      {c.name}
                      {c.is_npc && (
                        <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                          NPC
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[0.75rem] text-text-tertiary">
                      {[c.role, c.player_id === currentPlayer?.id ? "du" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            {!to && suggestions.length === 0 && (
              <p className="p-6 text-center text-[0.875rem] text-text-tertiary">Niemand gefunden.</p>
            )}
            {to && from && (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                <PhoneAvatar character={to} size={72} />
                <div className="text-[1rem] font-semibold text-text-primary">{to.name}</div>
                <p className="text-[0.8125rem] text-text-tertiary">
                  {existing
                    ? `${from.name.split(" ")[0]} hat schon einen Chat mit ${to.name.split(" ")[0]} — deine Nachricht landet dort.`
                    : `Neuer Chat auf dem Handy von ${from.name.split(" ")[0]}.`}
                </p>
              </div>
            )}
          </div>

          {to && from && <Composer onSend={send} placeholder={`SMS als ${from.name.split(" ")[0]}`} />}
        </>
      )}
    </PhoneFrame>
  );
}
