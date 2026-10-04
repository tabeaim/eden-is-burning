"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { Character, ChatMessage } from "@/lib/types";
import { Icon } from "@/components/Icon";
import {
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  phoneIconBtn,
  usePhoneOwner,
} from "@/components/phone/PhoneFrame";

// Kurze Vorschau einer Nachricht für die Chat-Liste
function preview(m: ChatMessage): string {
  if (m.kind === "gif") return "GIF";
  if (m.kind === "image") return "Foto";
  return m.content;
}

// Heute: Uhrzeit, sonst das Datum
function listTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === new Date().toDateString()
    ? `${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

export default function PhonePage() {
  const { chats, chatMessages, character, currentPlayer, charactersOf, isChatNew } = useStore();
  const myChars = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const [stored, setOwner] = usePhoneOwner();
  // Wessen Handy? Eigene Charaktere oder „Alle" (jeder Chat im Spiel, nur lesen).
  const owner =
    stored && (stored === "all" || myChars.some((c) => c.id === stored))
      ? stored
      : myChars[0]?.id ?? "all";
  const ownerChar = owner === "all" ? undefined : character(owner);

  const last = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of chatMessages) {
      if (m.kind === "date") continue;
      const cur = map.get(m.chat_id);
      if (!cur || m.created_at > cur.created_at) map.set(m.chat_id, m);
    }
    return map;
  }, [chatMessages]);

  const rows = chats
    .filter((c) => owner === "all" || c.participant_ids.includes(owner))
    .map((c) => ({ chat: c, last: last.get(c.id) }))
    .sort((a, b) =>
      (b.last?.created_at ?? b.chat.created_at).localeCompare(
        a.last?.created_at ?? a.chat.created_at,
      ),
    );

  return (
    <PhoneFrame>
      <PhoneHeader
        actions={
          <Link href="/handy/neu" aria-label="Neue SMS" title="Neue SMS" className={phoneIconBtn}>
            <Icon name="edit" size={20} />
          </Link>
        }
      >
        <div className="px-2">
          <div className="text-[1.25rem] font-bold leading-tight text-text-primary">Nachrichten</div>
          <div className="truncate text-[0.75rem] text-text-tertiary">
            {ownerChar ? `Handy von ${ownerChar.name}` : "Alle Chats in Eden"}
          </div>
        </div>
      </PhoneHeader>

      {/* Handy wechseln: eigene Charaktere + „Alle" */}
      <div className="flex shrink-0 gap-3 overflow-x-auto border-b border-border-subtle px-3 py-3">
        {myChars.map((c) => (
          <OwnerButton key={c.id} active={owner === c.id} onClick={() => setOwner(c.id)} label={c.name.split(" ")[0]}>
            <PhoneAvatar character={c} size={52} />
          </OwnerButton>
        ))}
        <OwnerButton active={owner === "all"} onClick={() => setOwner("all")} label="Alle">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary">
            <Icon name="users" size={22} />
          </span>
        </OwnerButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="text-[2.5rem] leading-none">💬</div>
            <p className="text-[0.875rem] text-text-secondary">
              {ownerChar ? `${ownerChar.name.split(" ")[0]} hat noch keine Chats.` : "Noch keine Chats."}
            </p>
            <Link
              href="/handy/neu"
              className="rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
            >
              Neue SMS schreiben
            </Link>
          </div>
        )}
        {rows.map(({ chat, last: m }) => {
          const people = chat.participant_ids
            .filter((id) => id !== owner)
            .map((id) => character(id))
            .filter(Boolean) as Character[];
          const unread = isChatNew(chat.id);
          return (
            <Link
              key={chat.id}
              href={`/handy/${chat.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] active:bg-white/[0.06]"
            >
              <span className="flex shrink-0 -space-x-5">
                {people.slice(0, 2).map((p) => (
                  <PhoneAvatar key={p.id} character={p} size={48} className="ring-2 ring-[#0c0c0e]" />
                ))}
              </span>
              <span className="min-w-0 flex-1 border-b border-border-subtle pb-2.5">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${unread ? "font-bold" : "font-semibold"} text-text-primary`}>
                    {people.map((p) => p.name).join(" & ") || "Unbekannt"}
                  </span>
                  <span className={`shrink-0 text-[0.75rem] ${unread ? "text-accent" : "text-text-tertiary"}`}>
                    {listTime(m?.created_at ?? chat.created_at)}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${unread ? "text-text-primary" : "text-text-tertiary"}`}>
                    {m ? (
                      <>
                        {m.character_id === owner
                          ? "Du: "
                          : owner === "all"
                            ? `${character(m.character_id)?.name.split(" ")[0] ?? "?"}: `
                            : ""}
                        {preview(m)}
                      </>
                    ) : (
                      "Noch keine Nachricht"
                    )}
                  </span>
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </PhoneFrame>
  );
}

function OwnerButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex w-[60px] shrink-0 flex-col items-center gap-1">
      <span className={`rounded-full p-[2px] ring-2 ${active ? "ring-accent" : "ring-transparent"}`}>
        {children}
      </span>
      <span className={`w-full truncate text-[0.6875rem] ${active ? "text-text-primary" : "text-text-tertiary"}`}>
        {label}
      </span>
    </button>
  );
}
