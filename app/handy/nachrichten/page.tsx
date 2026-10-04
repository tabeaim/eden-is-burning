"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatInplayDateShort } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Character, ChatMessage } from "@/lib/types";
import { Icon } from "@/components/Icon";
import {
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  phoneIconBtn,
  useMyPhone,
} from "@/components/phone/PhoneFrame";

// Kurze Vorschau einer Nachricht für die Chat-Liste
function preview(m: ChatMessage): string {
  if (m.kind === "gif") return "GIF";
  if (m.kind === "image") return "Foto";
  return m.content;
}

type Tab = "mine" | "all";
const TAB_KEY = "eden:sms-tab";

export default function MessagesPage() {
  const { chats, chatMessages, character, isChatNew } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  // „Meine": Chats des Handys, das man in der Hand hat. „Alle": jeder Chat im
  // Spiel zum Mitlesen (gibt es nur hier im Messenger).
  const [tabState, setTabState] = useState<Tab>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(TAB_KEY) === "all" ? "all" : "mine";
    } catch {
      return "mine";
    }
  });
  const tab: Tab = me ? tabState : "all";
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };
  const owner = tab === "mine" && me ? me.id : "all";
  const ownerChar = tab === "mine" ? me : undefined;

  // Je Chat: neueste Nachricht und neuester Tagestrenner (Inplay-Datum)
  const { last, dates } = useMemo(() => {
    const last = new Map<string, ChatMessage>();
    const dates = new Map<string, ChatMessage>();
    for (const m of chatMessages) {
      const map = m.kind === "date" ? dates : last;
      const cur = map.get(m.chat_id);
      if (!cur || m.created_at > cur.created_at) map.set(m.chat_id, m);
    }
    return { last, dates };
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
    <PhoneFrame owner={me?.id ?? null} options={myChars.map((c) => c.id)} onOwner={setOwner}>
      <PhoneHeader
        back="/handy"
        actions={
          <Link href="/handy/neu" aria-label="Neue SMS" title="Neue SMS" className={phoneIconBtn}>
            <Icon name="edit" size={20} />
          </Link>
        }
      >
        <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">Nachrichten</div>
      </PhoneHeader>

      {me && (
        <div className="flex shrink-0 gap-1.5 border-b border-border-subtle px-3 py-2">
          {(
            [
              ["mine", "Meine"],
              ["all", "Alle"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                tab === key
                  ? "bg-accent text-black"
                  : "bg-white/[0.06] text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
                    {dates.has(chat.id)
                      ? formatInplayDateShort(dates.get(chat.id)!.content.split("|")[0])
                      : ""}
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
