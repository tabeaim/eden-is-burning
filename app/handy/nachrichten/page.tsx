"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatInplayDateShort } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { chatTitle, isArchivedFor, isLeftOnRead, messageSnippet } from "@/lib/chats";
import { Icon } from "@/components/Icon";
import {
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  phoneIconBtn,
  useMyPhone,
} from "@/components/phone/PhoneFrame";

type Tab = "mine" | "all" | "archive";
const TAB_KEY = "eden:sms-tab";

export default function MessagesPage() {
  const { chats, chatMessages, character, isChatNew } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  // „Meine": Chats des Handys, das man in der Hand hat · „Alle": jeder Chat im
  // Spiel zum Mitlesen · „Archiv": auf diesem Handy weggelegte Chats.
  const [tabState, setTabState] = useState<Tab>(() => {
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem(TAB_KEY) : null;
      return t === "all" || t === "archive" ? t : "mine";
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
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Je Chat: neueste Nachricht, neuester Tagestrenner und — bei einer Suche — die
  // neueste Nachricht, die den Suchbegriff enthält
  const { last, dates, hits } = useMemo(() => {
    const last = new Map<string, ChatMessage>();
    const dates = new Map<string, ChatMessage>();
    const hits = new Map<string, ChatMessage>();
    const newer = (map: Map<string, ChatMessage>, m: ChatMessage) => {
      const cur = map.get(m.chat_id);
      if (!cur || m.created_at > cur.created_at) map.set(m.chat_id, m);
    };
    for (const m of chatMessages) {
      newer(m.kind === "date" ? dates : last, m);
      if (query && m.kind === "text" && m.content.toLowerCase().includes(query)) newer(hits, m);
    }
    return { last, dates, hits };
  }, [chatMessages, query]);

  const myId = me?.id;
  const inTab = chats.filter((c) => {
    if (tab === "all" || !myId) return true;
    if (!c.participant_ids.includes(myId)) return false;
    return isArchivedFor(c, myId) === (tab === "archive");
  });
  const archivedCount = myId
    ? chats.filter((c) => c.participant_ids.includes(myId) && isArchivedFor(c, myId)).length
    : 0;

  const rows = inTab
    .map((chat) => {
      // In „Alle" stehen beide Namen da, sonst nur das Gegenüber
      const people = chat.participant_ids
        .filter((id) => tab === "all" || id !== myId)
        .map((id) => character(id));
      return { chat, people, title: chatTitle(people), last: last.get(chat.id), hit: hits.get(chat.id) };
    })
    .filter((r) => !query || r.hit || r.title.toLowerCase().includes(query))
    .sort((a, b) =>
      (b.last?.created_at ?? b.chat.created_at).localeCompare(
        a.last?.created_at ?? a.chat.created_at,
      ),
    );

  const tabs: [Tab, string][] = [
    ["mine", "Meine"],
    ["all", "Alle"],
    ["archive", archivedCount > 0 ? `Archiv (${archivedCount})` : "Archiv"],
  ];

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

      <div className="flex shrink-0 flex-col gap-2 border-b border-border-subtle px-3 py-2">
        {me && (
          <div className="flex gap-1.5">
            {tabs.map(([key, label]) => (
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
        <label className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary">
          <Icon name="search" size={15} className="shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chats und Nachrichten durchsuchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Suche leeren" className="px-1">
              ✕
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="text-[2.5rem] leading-none">{query ? "🔍" : tab === "archive" ? "🗄️" : "💬"}</div>
            <p className="text-[0.875rem] text-text-secondary">
              {query
                ? "Nichts gefunden."
                : tab === "archive"
                  ? "Im Archiv liegt nichts."
                  : tab === "mine" && me
                    ? `${me.name.split(" ")[0]} hat noch keine Chats.`
                    : "Noch keine Chats."}
            </p>
            {!query && tab === "mine" && (
              <Link
                href="/handy/neu"
                className="rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
              >
                Neue SMS schreiben
              </Link>
            )}
          </div>
        )}
        {rows.map(({ chat, people, title, last: m, hit }) => {
          const unread = tab !== "all" && isChatNew(chat.id);
          const shown = hit ?? m;
          const date = dates.get(chat.id);
          const paused = tab === "mine" && !!myId && isLeftOnRead(chat, myId, m);
          return (
            <Link
              key={chat.id}
              href={`/handy/${chat.id}${hit ? `#${hit.id}` : ""}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] active:bg-white/[0.06]"
            >
              <span className="flex shrink-0 -space-x-5">
                {people.slice(0, 2).map(
                  (p) =>
                    p && (
                      <PhoneAvatar key={p.id} character={p} size={48} className="ring-2 ring-[var(--phone-screen,#0c0c0e)]" />
                    ),
                )}
              </span>
              <span className="min-w-0 flex-1 border-b border-border-subtle pb-2.5">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${unread ? "font-bold" : "font-semibold"} text-text-primary`}>
                    {title}
                  </span>
                  <span className={`shrink-0 text-[0.75rem] ${unread ? "text-accent" : "text-text-tertiary"}`}>
                    {date ? formatInplayDateShort(date.content.split("|")[0]) : ""}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${unread || hit ? "text-text-primary" : "text-text-tertiary"}`}>
                    {shown ? (
                      <>
                        {shown.character_id === myId && tab !== "all"
                          ? "Du: "
                          : people.length > 1
                            ? `${character(shown.character_id)?.name.split(" ")[0] ?? "?"}: `
                            : ""}
                        {messageSnippet(shown)}
                      </>
                    ) : (
                      "Noch keine Nachricht"
                    )}
                  </span>
                  {paused && (
                    <span className="shrink-0 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                      left on read
                    </span>
                  )}
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
