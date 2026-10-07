"use client";

import { Fragment, use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Chat, ChatMessageKind, ChatScene } from "@/lib/types";
import { formatDateTime, formatInplayDate, formatInplayDateShort } from "@/lib/format";
import { isEmojiOnly, QUICK_REACTIONS } from "@/lib/emoji";
import { addMinutes, contactShortName, resolvePhone } from "@/lib/phone";
import {
  chatTitle,
  chatUnits,
  isArchived,
  isLeftOnRead,
  messageSnippet,
  newestMessage,
  type DatedMessage,
} from "@/lib/chats";
import {
  SceneBar,
  SceneDirectory,
  SmsSceneForm,
  type DirectoryEntry,
} from "@/components/phone/SmsScenes";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { Composer } from "@/components/phone/Composer";
import { EmojiPicker } from "@/components/phone/EmojiPicker";
import { Sheet, SheetButton, SheetList } from "@/components/phone/Sheet";
import {
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  phoneIconBtn,
  useMyPhone,
} from "@/components/phone/PhoneFrame";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { chats } = useStore();
  const chat = chats.find((c) => c.id === id);
  if (!chat) {
    return (
      <PhoneFrame owner={null}>
        <PhoneHeader back="/handy/nachrichten">
          <div className="text-[1.0625rem] font-semibold text-text-primary">Chat</div>
        </PhoneHeader>
        <p className="p-6 text-center text-[0.875rem] text-text-secondary">
          Diesen Chat gibt es nicht (mehr).
        </p>
      </PhoneFrame>
    );
  }
  return <ChatView chat={chat} />;
}

const snippet = messageSnippet;

// Ist gerade Text markiert? (Dann will man kopieren, nicht das Blatt öffnen.)
function hasSelection(): boolean {
  return !!window.getSelection()?.toString();
}

const MONTHS = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];
const monthLabel = (day: string) =>
  day ? `${MONTHS[parseInt(day.slice(5, 7), 10) - 1] ?? "?"} ${day.slice(0, 4)}` : "ohne Datum";

function ChatView({ chat }: { chat: Chat }) {
  const {
    messagesOf,
    character,
    canWriteAs,
    isAdmin,
    addMessage,
    deleteMessage,
    toggleReaction,
    markChatSeen,
    leaveOnRead,
    markChatUnread,
    archiveChat,
    updateMessage,
    deleteChat,
    chatScenes,
    addChatScene,
    updateChatScene,
    deleteChatScene,
    patchMessages,
  } = useStore();
  const router = useRouter();
  const messages = messagesOf(chat.id);
  const parts = chat.participant_ids;

  // Wessen Handy? Ist ein eigener Charakter im Chat, ist es seins (rechts = „ich";
  // sind mehrere eigene dabei, tauscht die Leiste oben die Seite). Sonst liest man
  // mit: Man bleibt auf dem eigenen Handy und sieht alle Blasen links mit Namen,
  // wie in einem Gruppenchat.
  const { myChars, me, stored, setOwner } = useMyPhone();
  const writable = parts.filter(canWriteAs);
  const reading = writable.length === 0;
  const self = reading ? "" : stored && writable.includes(stored) ? stored : writable[0];
  const canWrite = !reading;
  const selfChar = reading ? undefined : character(self);
  // Öffnet man den Chat eines anderen eigenen Charakters, hält man ab jetzt dessen
  // Handy in der Hand – sonst landete z.B. „Archivieren" im Archiv dieses
  // Charakters, während die Übersicht noch das vorige Handy zeigte.
  useEffect(() => {
    if (self && stored !== self) setOwner(self);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [self, stored]);
  const others = parts.filter((p) => p !== self).map((p) => character(p));
  // Namen wie auf dem Handy, das man in der Hand hat (eigene Kontaktnamen)
  const viewer = selfChar ?? me;

  // SMS-Szenen dieses Chats. Eine Nachricht gehört zu einer Szene oder ist lose.
  const scenesHere = chatScenes.filter((sc) => sc.chat_id === chat.id);
  const sceneById = new Map(scenesHere.map((sc) => [sc.id, sc]));
  const sceneOf = (m: { scene_id?: string | null } | undefined): ChatScene | null =>
    (m?.scene_id && sceneById.get(m.scene_id)) || null;
  // Stränge, an denen gespielt wird (aktive Szenen + lose Nachrichten), neueste zuerst
  const units = chatUnits(chat, messages, scenesHere).sort((x, y) =>
    y.last.created_at.localeCompare(x.last.created_at),
  );
  const dran = new Set(
    canWrite ? units.filter((u) => u.last.character_id !== self).map((u) => u.scene?.id ?? "") : [],
  );
  const activeScenes = scenesHere
    .filter((sc) => sc.status === "active")
    .sort((x, y) => {
      const at = (sc: ChatScene) => units.find((u) => u.scene?.id === sc.id)?.last.created_at ?? sc.created_at;
      return Number(dran.has(y.id)) - Number(dran.has(x.id)) || at(y).localeCompare(at(x));
    });

  // Aus Dashboard, Szenenübersicht oder Suche kommend: zur Szene bzw. Nachricht
  // springen (Anker in der Adresse) und die Nachricht kurz markieren
  const jump = useRef(typeof window !== "undefined" ? window.location.hash.slice(1) : "");
  const [highlight, setHighlight] = useState<string | null>(null);

  // Wohin die nächste Nachricht geht: eine aktive Szene oder lose (null). Beim
  // Öffnen: die angesprungene Szene, sonst der Strang, in dem man dran ist, sonst
  // der zuletzt bespielte. Danach bleibt die Wahl, bis man sie ändert.
  const [pick, setPick] = useState<string | null>(() => {
    const anchor = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const viaScene = sceneById.get(anchor) ?? sceneOf(messages.find((m) => m.id === anchor));
    if (anchor && (viaScene || messages.some((m) => m.id === anchor))) {
      return viaScene?.status === "active" ? viaScene.id : null;
    }
    const first = units.find((u) => u.last.character_id !== self) ?? units[0];
    return first?.scene?.id ?? null;
  });
  const targetId = pick && sceneById.get(pick)?.status === "active" ? pick : null;
  const targetMsgs = messages.filter((m) => (sceneOf(m)?.id ?? null) === targetId);
  const targetLast = newestMessage(targetMsgs);

  // „Leave on read" gilt je Strang: wer hat dessen neueste Nachricht bewusst
  // unbeantwortet gelassen? (`leftAt`: Nachricht-ID -> diese Charaktere)
  const leftAt = new Map<string, string[]>();
  for (const u of units) {
    const by = parts.filter((pid) => isLeftOnRead(chat, pid, u.last));
    if (by.length) leftAt.set(u.last.id, by);
  }
  const lastReal = targetLast;
  const leftBy = lastReal ? (leftAt.get(lastReal.id) ?? []) : [];
  const myTurn = canWrite && !!lastReal && lastReal.character_id !== self;
  // Archivieren (gilt für alle) und Löschen dürfen nur Beteiligte und Admins
  const canDeleteChat = canWrite || isAdmin;
  const phoneId = canDeleteChat ? (reading ? (me?.id ?? "admin") : self) : "";
  const archived = isArchived(chat);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editMsg = messages.find((m) => m.id === editId);

  // Inplay-Tag und -Uhrzeit der nächsten Nachricht: laufen im gewählten Strang
  // weiter (Tag der letzten Nachricht dort, Uhrzeit eine Minute später) und lassen
  // sich über dem Eingabefeld überschreiben.
  const [dayOverride, setDayOverride] = useState<string | null>(null);
  const day =
    dayOverride ??
    targetLast?.day ??
    (targetId ? sceneById.get(targetId)?.inplay_date : newestMessage(messages)?.day) ??
    "";
  const lastTime = newestMessage(targetMsgs.filter((m) => m.inplay_time))?.inplay_time;
  const [timeOverride, setTimeOverride] = useState<string | null>(null);
  const time = timeOverride ?? (lastTime ? addMinutes(lastTime, 1) : "12:00");
  const burner = resolvePhone(selfChar).burner;

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const active = messages.find((m) => m.id === activeId);
  const replyMsg = messages.find((m) => m.id === replyTo);

  // SMS-Szenen: Formular (neu / bearbeiten), Menü einer Szene, Verzeichnis
  const canEdit = canWrite || isAdmin;
  const [sceneForm, setSceneForm] = useState<null | { scene?: ChatScene; from?: string[] }>(null);
  const [sceneMenu, setSceneMenu] = useState<string | null>(null);
  const menuScene = sceneMenu ? sceneById.get(sceneMenu) : undefined;
  const [dirOpen, setDirOpen] = useState(false);
  // Mehrere Nachrichten markieren: zu einer Szene zusammenfügen, lösen, Tag ändern
  const [sel, setSel] = useState<string[] | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selDateOpen, setSelDateOpen] = useState(false);
  const toggleSel = (id: string) =>
    setSel((cur) => (cur ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : cur));
  const selMsgs = sel ? messages.filter((m) => sel.includes(m.id)) : [];

  // Im Chat-Fenster scrollen (nicht die ganze Seite)
  const list = useRef<HTMLDivElement>(null);
  const toBottom = () => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const scrollToId = (id: string, where: "start" | "center" = "center") => {
    const box = list.current;
    const el = document.getElementById(id);
    if (!box || !el) return false;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTop = where === "start" ? top - 8 : top - box.clientHeight / 2 + el.offsetHeight / 2;
    return true;
  };
  // Beim Öffnen: zum Anker bzw. ans Ende des gewählten Strangs. Danach bei jeder
  // neuen Nachricht zu ihr – sie steht je nach Inplay-Tag nicht unbedingt unten.
  const seenCount = useRef<number | null>(null);
  useEffect(() => {
    markChatSeen(chat.id);
    if (seenCount.current === null) {
      seenCount.current = messages.length;
      const anchor = jump.current;
      jump.current = "";
      if (anchor && scrollToId(anchor, sceneById.has(anchor) ? "start" : "center")) {
        if (sceneById.has(anchor)) return;
        setHighlight(anchor);
        const t = setTimeout(() => setHighlight(null), 2500);
        return () => clearTimeout(t);
      }
      if (!targetLast || !scrollToId(targetLast.id)) toBottom();
      return;
    }
    if (messages.length > seenCount.current) {
      const newest = newestMessage(messages);
      if (!newest || !scrollToId(newest.id)) toBottom();
    }
    seenCount.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, messages.length, markChatSeen]);
  // Bilder laden nach – unten bleiben, wenn man ohnehin am Ende war
  const onMedia = () => {
    const el = list.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 500) toBottom();
  };

  // Beim Scrollen kurz einblenden, wo man gerade ist (Szene bzw. Tag)
  const [pos, setPos] = useState<string | null>(null);
  const posTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = () => {
    const box = list.current;
    if (!box) return;
    const edge = box.getBoundingClientRect().top + 12;
    let label: string | null = null;
    for (const el of box.querySelectorAll<HTMLElement>("[data-pos]")) {
      if (el.getBoundingClientRect().top > edge) break;
      label = el.dataset.pos ?? null;
    }
    setPos(label);
    if (posTimer.current) clearTimeout(posTimer.current);
    posTimer.current = setTimeout(() => setPos(null), 1400);
  };
  // ‹ › am Szenentrenner: zur vorigen / nächsten Szene
  const stepScene = (from: HTMLElement, dir: -1 | 1) => {
    const heads = [...(list.current?.querySelectorAll<HTMLElement>("[data-scene-head]") ?? [])];
    const to = heads[heads.indexOf(from) + dir];
    if (to) scrollToId(to.id, "start");
  };

  function chooseTarget(sceneId: string | null) {
    setPick(sceneId);
    setDayOverride(null);
    setTimeOverride(null);
    setReplyTo(null);
    const last = newestMessage(messages.filter((m) => (sceneOf(m)?.id ?? null) === sceneId));
    if (last) scrollToId(last.id);
  }

  function send(kind: ChatMessageKind, content: string) {
    if (!day) return;
    addMessage(chat.id, self, kind, content, { replyTo, time, date: day, sceneId: targetId });
    setReplyTo(null);
    setTimeOverride(null);
    setDayOverride(null);
  }

  // Verzeichnis: Szenen und Abschnitte loser Nachrichten (je Monat) in Lesereihenfolge
  const directory: DirectoryEntry[] = [];
  {
    const listed = new Set<string>();
    let prevKey = "";
    for (const m of messages) {
      const sc = sceneOf(m);
      const key = sc ? sc.id : `lose|${m.day.slice(0, 7)}`;
      if (key === prevKey) continue;
      prevKey = key;
      if (sc) {
        if (listed.has(sc.id)) continue;
        listed.add(sc.id);
        directory.push({ key, anchor: sc.id, title: sc.title, day: sc.inplay_date, scene: sc });
      } else {
        directory.push({
          key: `${key}|${m.id}`,
          anchor: m.id,
          title: `Ohne Szene · ${monthLabel(m.day)}`,
          day: m.day,
          scene: null,
        });
      }
    }
    for (const sc of scenesHere) {
      if (!listed.has(sc.id)) {
        directory.push({ key: sc.id, anchor: "", title: `${sc.title} (noch leer)`, day: sc.inplay_date, scene: sc });
      }
    }
  }
  // Erste Nachricht jeder Szene: dort trägt der Trenner die Szenen-ID als Anker
  const sceneFirst = new Map<string, string>();
  for (const m of messages) {
    const sc = sceneOf(m);
    if (sc && !sceneFirst.has(sc.id)) sceneFirst.set(sc.id, m.id);
  }
  const people = others.filter((o): o is NonNullable<typeof o> => !!o);

  function closeSheet() {
    setActiveId(null);
    setMoreEmoji(false);
  }

  return (
    <PhoneFrame
      owner={reading ? (me?.id ?? null) : self}
      options={reading ? myChars.map((c) => c.id) : writable}
      onOwner={setOwner}
    >
      <PhoneHeader
        back="/handy/nachrichten"
        actions={
          (phoneId || canDeleteChat) && (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Chat-Optionen"
              title="Chat-Optionen"
              className={`${phoneIconBtn} text-[1.25rem] font-bold leading-none`}
            >
              ⋯
            </button>
          )
        }
      >
        <button
          onClick={() => setDirOpen(true)}
          title="Im Chat springen: Szenen und Abschnitte"
          className="flex w-full items-center gap-2.5 text-left"
        >
          <span className="flex shrink-0 -space-x-4">
            {others.slice(0, 2).map(
              (o) =>
                o && (
                  <PhoneAvatar key={o.id} character={o} size={38} className="ring-2 ring-bg-surface" />
                ),
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-semibold leading-tight text-text-primary">
              {chatTitle(others, viewer)}
            </span>
            <span className="block truncate text-[0.75rem] text-text-tertiary">
              {[
                reading && "du liest mit",
                archived && "archiviert",
                scenesHere.length > 0 && `${scenesHere.length} ${scenesHere.length === 1 ? "Szene" : "Szenen"} ▾`,
              ]
                .filter(Boolean)
                .join(" · ") || "Verlauf ▾"}
            </span>
          </span>
        </button>
      </PhoneHeader>

      <div className="relative flex min-h-0 flex-1 flex-col">
      {pos && (
        <button
          onClick={() => setDirOpen(true)}
          className="on-dark absolute left-1/2 top-2 z-10 max-w-[85%] -translate-x-1/2 truncate rounded-full bg-black/70 px-3 py-1 text-[0.75rem] text-white"
        >
          {pos}
        </button>
      )}
      <div
        ref={list}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {messages.length === 0 && (
          <p className="mt-10 text-center text-[0.8125rem] text-text-tertiary">
            Noch keine Nachrichten.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = !reading && m.character_id === self;
          const sender = character(m.character_id);
          // Beim Mitlesen bekommt die zweite Person eine eigene Blasenfarbe
          const tint = reading && m.character_id === parts[1];
          const prev: DatedMessage | undefined = messages[i - 1];
          const next: DatedMessage | undefined = messages[i + 1];
          // Trenner entstehen beim Anzeigen: neuer Inplay-Tag, Beginn und Ende einer Szene
          const sc = sceneOf(m);
          const newDay = !prev || prev.day !== m.day;
          const sceneStart = !!sc && sceneOf(prev)?.id !== sc.id;
          const sceneEnd = !!sc && sceneOf(next)?.id !== sc.id;
          const cutBefore = newDay || (sceneOf(prev)?.id ?? null) !== (sc?.id ?? null);
          const cutAfter = !next || next.day !== m.day || (sceneOf(next)?.id ?? null) !== (sc?.id ?? null);
          const first = cutBefore || prev.character_id !== m.character_id;
          const lastOfGroup = cutAfter || next.character_id !== m.character_id;
          const picked = !!sel?.includes(m.id);
          const left = leftAt.get(m.id);
          const quoted = m.reply_to ? messages.find((x) => x.id === m.reply_to) : undefined;
          const reactions = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length > 0);
          const big = m.kind === "text" && !quoted && isEmojiOnly(m.content);
          const media = m.kind === "gif" || m.kind === "image";
          // Wie in den bekannten Messengern: nur die letzte Blase einer Folge hat die „Ecke"
          const shape = `rounded-[1.25rem] ${
            lastOfGroup ? (mine ? "rounded-br-md" : "rounded-bl-md") : ""
          }`;
          return (
            <Fragment key={m.id}>
            {newDay && m.day && (
              <div data-pos={formatInplayDate(m.day)} className="my-3 flex justify-center">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[0.75rem] text-text-tertiary">
                  {formatInplayDate(m.day)}
                </span>
              </div>
            )}
            {sceneStart && sc && (
              // Szenentrenner: Titel (Tipp: Optionen), links/rechts zur vorigen/nächsten Szene
              <div
                id={sceneFirst.get(sc.id) === m.id ? sc.id : `head-${m.id}`}
                data-scene-head
                data-pos={`${sc.title} · ${formatInplayDateShort(m.day || sc.inplay_date)}`}
                className="mb-1 mt-3 flex items-center gap-1"
              >
                <button
                  onClick={(e) => stepScene(e.currentTarget.parentElement!, -1)}
                  aria-label="Vorige Szene"
                  className="flex h-7 w-6 shrink-0 items-center justify-center text-text-tertiary hover:text-text-primary"
                >
                  ‹
                </button>
                <span className="h-px flex-1 bg-border-strong" />
                <button
                  onClick={() => setSceneMenu(sc.id)}
                  title={sc.summary || "Szenen-Optionen"}
                  className={`flex min-w-0 max-w-[72%] items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-semibold ${
                    sc.status === "active"
                      ? "border-accent/50 text-text-primary"
                      : "border-border-strong text-text-tertiary"
                  }`}
                >
                  <span className="truncate">{sc.title}</span>
                  {sc.status === "closed" && <span className="shrink-0 font-normal">· beendet</span>}
                </button>
                <span className="h-px flex-1 bg-border-strong" />
                <button
                  onClick={(e) => stepScene(e.currentTarget.parentElement!, 1)}
                  aria-label="Nächste Szene"
                  className="flex h-7 w-6 shrink-0 items-center justify-center text-text-tertiary hover:text-text-primary"
                >
                  ›
                </button>
              </div>
            )}
            <div
              id={m.id}
              className={`relative flex flex-col rounded-xl transition-colors duration-700 ${
                mine ? "items-end" : "items-start"
              } ${first ? "mt-2.5" : "mt-0.5"} ${reading ? "pl-8" : ""} ${
                highlight === m.id ? "bg-accent/20" : picked ? "bg-accent/15" : ""
              }`}
            >
              {reading && first && (
                <span className="mb-0.5 ml-1 text-[0.6875rem] font-semibold text-text-tertiary">
                  {contactShortName(viewer, sender)}
                </span>
              )}
              {reading && lastOfGroup && sender && (
                <PhoneAvatar character={sender} size={24} className="absolute bottom-0 left-0" />
              )}
              {/* Text bleibt markier- und kopierbar: Ist etwas markiert, öffnet weder
                  Klick noch Rechtsklick das Blatt (dann greift das Browser-Menü). */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => (sel ? toggleSel(m.id) : !hasSelection() && setActiveId(m.id))}
                onKeyDown={(e) => e.key === "Enter" && (sel ? toggleSel(m.id) : setActiveId(m.id))}
                onContextMenu={(e) => {
                  if (hasSelection()) return;
                  e.preventDefault();
                  if (sel) toggleSel(m.id);
                  else setActiveId(m.id);
                }}
                className={`relative max-w-[78%] cursor-pointer text-left ${
                  sel ? "select-none" : "select-text"
                } ${picked ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--phone-screen,#0c0c0e)]" : ""} ${
                  big
                    ? "text-[2.75rem] leading-tight"
                    : media
                      ? `overflow-hidden ${shape} bg-bg-surface-2`
                      : `${shape} px-3.5 py-2 text-[0.9375rem] leading-snug ${
                          mine
                            ? "bg-accent text-black"
                            : tint
                              ? "bg-accent-soft text-text-primary"
                              : "bg-bg-surface-2 text-text-primary"
                        }`
                }`}
              >
                {quoted && (
                  <span
                    className={`mb-1 block border-l-2 pl-2 text-[0.75rem] ${
                      mine ? "border-black/40 text-black/70" : "border-accent text-text-tertiary"
                    } ${media ? "mx-3 mt-2" : ""}`}
                  >
                    <span className="block font-semibold">
                      {contactShortName(viewer, character(quoted.character_id))}
                    </span>
                    <span className="line-clamp-2 break-words">{snippet(quoted)}</span>
                  </span>
                )}
                {media ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.content}
                    alt={m.kind === "gif" ? "GIF" : "Foto"}
                    loading="lazy"
                    onLoad={onMedia}
                    className="block max-h-72 min-h-16 w-full min-w-24 object-cover"
                  />
                ) : (
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                )}
                {m.inplay_time &&
                  (media ? (
                    <span className="absolute bottom-1.5 right-2 rounded-full bg-black/55 px-1.5 text-[0.6875rem] text-white">
                      {m.inplay_time}
                    </span>
                  ) : (
                    <span
                      className={`float-right ml-2.5 mt-1.5 text-[0.6875rem] leading-none ${
                        big ? "text-text-tertiary" : mine ? "text-black/60" : "text-text-tertiary"
                      } select-none`}
                    >
                      {m.inplay_time}
                    </span>
                  ))}
              </div>
              {reactions.length > 0 && (
                <div className={`relative z-[1] -mt-1.5 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
                  {reactions.map(([emoji, ids]) => (
                    <button
                      key={emoji}
                      disabled={!canWrite}
                      onClick={() => toggleReaction(m.id, emoji, self)}
                      title={ids.map((id) => character(id)?.name ?? "?").join(", ")}
                      className={`flex items-center gap-0.5 rounded-full border-2 border-[var(--phone-screen,#0c0c0e)] px-1.5 py-px text-[0.8125rem] leading-snug ${
                        ids.includes(self) ? "bg-accent/30" : "bg-bg-surface-2"
                      }`}
                    >
                      {emoji}
                      {ids.length > 1 && (
                        <span className="text-[0.6875rem] text-text-secondary">{ids.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {left && (
              <div
                className={`mt-1 px-1 text-[0.6875rem] text-text-tertiary ${
                  mine ? "text-right" : reading ? "pl-9" : ""
                }`}
              >
                {mine
                  ? "Gelesen"
                  : reading
                    ? `Gelesen · ${chatTitle(left.map((pid) => character(pid)), viewer)} antwortet nicht`
                    : "Leave on read · pausiert"}
              </div>
            )}
            {sceneEnd && (
              <div className="mx-auto mb-3 mt-2.5 h-px w-12 bg-border-strong" aria-hidden />
            )}
            </Fragment>
          );
        })}
      </div>
      </div>

      {sel ? (
        // Markier-Modus: Auswahl einer Szene zuordnen, lösen oder auf einen anderen Tag legen
        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-[0.8125rem]">
            <span className="min-w-0 flex-1 truncate text-text-secondary">
              {sel.length === 0 ? "Nachrichten antippen" : `${sel.length} markiert`}
            </span>
            <button
              disabled={sel.length === 0}
              onClick={() => setAssignOpen(true)}
              className="rounded-md bg-accent/90 px-3 py-1.5 font-medium text-black disabled:opacity-40"
            >
              Szene …
            </button>
            <button
              disabled={sel.length === 0}
              onClick={() => setSelDateOpen(true)}
              className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-text-primary disabled:opacity-40"
            >
              Tag ändern
            </button>
            <button onClick={() => setSel(null)} className="px-1 text-text-tertiary hover:text-text-primary">
              Fertig
            </button>
          </div>
        </div>
      ) : canWrite && !day ? (
        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-4 py-3 text-center">
          <p className="text-[0.8125rem] text-text-tertiary">
            Wann spielt die nächste Nachricht? Lege zuerst das Inplay-Datum fest.
          </p>
          <button
            onClick={() => setDateOpen(true)}
            className="mt-2 rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
          >
            Inplay-Datum festlegen
          </button>
        </div>
      ) : canWrite ? (
        <Composer
          onSend={send}
          media={!burner}
          time={time}
          onTime={setTimeOverride}
          placeholder={`Nachricht als ${selfChar?.name.split(" ")[0] ?? "…"}`}
          above={
            <>
            <SceneBar
              scenes={activeScenes}
              dran={dran}
              targetId={targetId}
              day={day}
              onPick={chooseTarget}
              onNew={() => setSceneForm({})}
              onDay={() => setDateOpen(true)}
            />
            {replyMsg && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-accent bg-white/[0.05] py-1.5 pl-2.5 pr-1">
                <div className="min-w-0 flex-1 text-[0.75rem]">
                  <div className="font-semibold text-accent">
                    Antwort an {contactShortName(viewer, character(replyMsg.character_id))}
                  </div>
                  <div className="truncate text-text-tertiary">{snippet(replyMsg)}</div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  aria-label="Antwort verwerfen"
                  className="flex h-7 w-7 items-center justify-center text-text-tertiary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            )}
            </>
          }
        />
      ) : (
        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-4 py-3 text-center text-[0.8125rem] text-text-tertiary">
          Du liest mit – in diesem Chat ist keiner deiner Charaktere.
        </div>
      )}

      {/* Antippen einer Nachricht: Reaktionen und Aktionen als Blatt von unten */}
      {active && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/55" onClick={closeSheet}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-t-2xl border-t border-border-subtle bg-bg-surface-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {active.kind !== "date" && canWrite && (
              <>
                <div className="flex items-center justify-between gap-1">
                  {QUICK_REACTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        toggleReaction(active.id, e, self);
                        closeSheet();
                      }}
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-[1.625rem] leading-none hover:bg-white/[0.08] ${
                        active.reactions?.[e]?.includes(self) ? "bg-accent/30" : ""
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                  <button
                    onClick={() => setMoreEmoji((v) => !v)}
                    aria-label="Mehr Emojis"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-[1.25rem] text-text-secondary"
                  >
                    +
                  </button>
                </div>
                {moreEmoji && (
                  <EmojiPicker
                    onPick={(e) => {
                      toggleReaction(active.id, e, self);
                      closeSheet();
                    }}
                  />
                )}
              </>
            )}
            <div className="mt-2 flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl bg-white/[0.04] text-[0.9375rem]">
              {active.kind !== "date" && canWrite && (
                <SheetButton
                  onClick={() => {
                    setReplyTo(active.id);
                    closeSheet();
                  }}
                >
                  Antworten
                </SheetButton>
              )}
              {canEdit && (
                <SheetButton
                  onClick={() => {
                    setSel([active.id]);
                    closeSheet();
                  }}
                >
                  Markieren – mehrere zu einer Szene zusammenfügen
                </SheetButton>
              )}
              {active.kind === "text" && (isAdmin || canWriteAs(active.character_id)) && (
                <SheetButton
                  onClick={() => {
                    setEditId(active.id);
                    closeSheet();
                  }}
                >
                  Bearbeiten
                </SheetButton>
              )}
              {(isAdmin || canWriteAs(active.character_id)) && (
                <SheetButton
                  danger
                  onClick={() => {
                    setConfirmDelete(active.id);
                    closeSheet();
                  }}
                >
                  Löschen
                </SheetButton>
              )}
              <SheetButton onClick={closeSheet}>Abbrechen</SheetButton>
            </div>
            <div className="mt-2 text-center text-[0.6875rem] text-text-tertiary">
              Gepostet am {formatDateTime(active.created_at)} (echte Zeit)
            </div>
          </div>
        </div>
      )}

      {/* Chat-Optionen: pausieren („leave on read") und archivieren */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-black/55"
          onClick={() => setMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-t-2xl border-t border-border-subtle bg-bg-surface-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl bg-white/[0.04] text-[0.9375rem]">
              {/* dran und nicht pausiert: pausieren oder (wieder) als ungelesen markieren */}
              {myTurn && lastReal && !leftBy.includes(self) && (
                <>
                  <SheetButton
                    onClick={() => {
                      setMenuOpen(false);
                      leaveOnRead(chat.id, self, lastReal.id);
                    }}
                  >
                    Leave on read – nicht antworten, {targetId ? "Szene" : "Chat"} pausieren
                  </SheetButton>
                  <SheetButton
                    onClick={() => {
                      setMenuOpen(false);
                      markChatUnread(chat.id);
                      router.push("/handy/nachrichten");
                    }}
                  >
                    Als ungelesen markieren
                  </SheetButton>
                </>
              )}
              {/* pausiert: wieder aktivieren – zählt dann auch wieder als ungelesen */}
              {myTurn && lastReal && leftBy.includes(self) && (
                <SheetButton
                  onClick={() => {
                    setMenuOpen(false);
                    leaveOnRead(chat.id, self, null);
                    markChatUnread(chat.id);
                    router.push("/handy/nachrichten");
                  }}
                >
                  Chat wieder aktivieren
                </SheetButton>
              )}
              {phoneId && (
                <SheetButton
                  onClick={() => {
                    archiveChat(chat.id, phoneId, !archived);
                    setMenuOpen(false);
                  }}
                >
                  {archived ? "Aus dem Archiv holen" : "Archivieren (für alle)"}
                </SheetButton>
              )}
              {canDeleteChat && (
                <SheetButton
                  danger
                  onClick={() => {
                    setConfirmDeleteChat(true);
                    setMenuOpen(false);
                  }}
                >
                  Chat löschen
                </SheetButton>
              )}
              <SheetButton onClick={() => setMenuOpen(false)}>Abbrechen</SheetButton>
            </div>
          </div>
        </div>
      )}

      {dateOpen && (
        <DateSheet
          initial={day}
          initialTime={time}
          onCancel={() => setDateOpen(false)}
          onSave={(date, t) => {
            setDayOverride(date);
            setTimeOverride(t);
            setDateOpen(false);
          }}
        />
      )}

      {selDateOpen && sel && (
        <DateSheet
          initial={selMsgs[0]?.day ?? ""}
          hint={`Legt die ${sel.length} markierten Nachrichten auf diesen Tag – sie rutschen im Verlauf dorthin.`}
          onCancel={() => setSelDateOpen(false)}
          onSave={(date) => {
            patchMessages(sel, { inplay_date: date });
            setSelDateOpen(false);
            setSel(null);
          }}
        />
      )}

      {/* Markierte Nachrichten: neue Szene, bestehende Szene oder lose */}
      {assignOpen && sel && (
        <Sheet onClose={() => setAssignOpen(false)}>
          <div className="mb-2 px-1 text-[0.8125rem] text-text-tertiary">
            {sel.length} {sel.length === 1 ? "Nachricht" : "Nachrichten"} zuordnen
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-xl">
            <SheetList>
              <SheetButton
                onClick={() => {
                  setAssignOpen(false);
                  setSceneForm({ from: sel });
                }}
              >
                Neue Szene aus der Auswahl
              </SheetButton>
              {scenesHere.map((sc) => (
                <SheetButton
                  key={sc.id}
                  onClick={() => {
                    patchMessages(sel, { scene_id: sc.id });
                    setAssignOpen(false);
                    setSel(null);
                  }}
                >
                  Zu „{sc.title}“
                </SheetButton>
              ))}
              {selMsgs.some((m) => sceneOf(m)) && (
                <SheetButton
                  onClick={() => {
                    patchMessages(sel, { scene_id: null });
                    setAssignOpen(false);
                    setSel(null);
                  }}
                >
                  Aus der Szene lösen (lose)
                </SheetButton>
              )}
              <SheetButton onClick={() => setAssignOpen(false)}>Abbrechen</SheetButton>
            </SheetList>
          </div>
        </Sheet>
      )}

      {sceneForm && (
        <SmsSceneForm
          scene={sceneForm.scene}
          people={parts.map((pid) => character(pid)).filter((c): c is NonNullable<typeof c> => !!c)}
          defaultDate={sceneForm.from ? (selMsgs[0]?.day ?? day) : day}
          hint={
            sceneForm.scene
              ? undefined
              : sceneForm.from
                ? `Fasst die ${sceneForm.from.length} markierten Nachrichten zu einer Szene zusammen.`
                : "Alles, was ihr ab jetzt in dieser Szene schreibt, gehört zusammen – bis sie beendet wird."
          }
          onCancel={() => setSceneForm(null)}
          onSave={(data) => {
            if (sceneForm.scene) updateChatScene(sceneForm.scene.id, data);
            else {
              const id = addChatScene(chat.id, data);
              if (sceneForm.from) {
                patchMessages(sceneForm.from, { scene_id: id });
                setSel(null);
              } else {
                chooseTarget(id);
                setDayOverride(data.inplay_date);
              }
            }
            setSceneForm(null);
          }}
        />
      )}

      {/* Optionen einer SMS-Szene (Tipp auf den Szenentrenner) */}
      {menuScene && (
        <Sheet onClose={() => setSceneMenu(null)}>
          <div className="mb-2 px-1">
            <div className="truncate text-[0.875rem] font-semibold text-text-primary">{menuScene.title}</div>
            <div className="text-[0.8125rem] text-text-tertiary">
              {formatInplayDate(menuScene.inplay_date)}
              {menuScene.au && ` · ${menuScene.au_name || "AU"}`}
              {menuScene.status === "closed" && " · beendet"}
            </div>
            {menuScene.summary && (
              <p className="mt-1 text-[0.8125rem] italic text-text-secondary">{menuScene.summary}</p>
            )}
          </div>
          <SheetList>
            {canWrite && (
              <SheetButton
                onClick={() => {
                  if (menuScene.status === "closed") updateChatScene(menuScene.id, { status: "active" });
                  chooseTarget(menuScene.id);
                  setSceneMenu(null);
                }}
              >
                {menuScene.status === "closed" ? "Wieder öffnen und weiterschreiben" : "Hier weiterschreiben"}
              </SheetButton>
            )}
            {canEdit && (
              <SheetButton
                onClick={() => {
                  setSceneForm({ scene: menuScene });
                  setSceneMenu(null);
                }}
              >
                Titel, Datum, Zusammenfassung bearbeiten
              </SheetButton>
            )}
            {canEdit && menuScene.status === "active" && (
              <SheetButton
                onClick={() => {
                  updateChatScene(menuScene.id, { status: "closed" });
                  setSceneMenu(null);
                }}
              >
                Szene beenden
              </SheetButton>
            )}
            {canEdit && (
              <SheetButton
                danger
                onClick={() => {
                  deleteChatScene(menuScene.id);
                  setSceneMenu(null);
                }}
              >
                Szene auflösen – Nachrichten bleiben lose im Chat
              </SheetButton>
            )}
            <SheetButton onClick={() => setSceneMenu(null)}>Abbrechen</SheetButton>
          </SheetList>
        </Sheet>
      )}

      {dirOpen && (
        <SceneDirectory
          entries={directory}
          people={people}
          onClose={() => setDirOpen(false)}
          onJump={(entry) => {
            setDirOpen(false);
            if (entry.anchor) scrollToId(entry.anchor, entry.scene ? "start" : "center");
            if (canWrite && entry.scene?.status === "active" && entry.scene.id !== targetId) {
              setPick(entry.scene.id);
              setDayOverride(null);
              setTimeOverride(null);
            }
          }}
        />
      )}

      {editMsg && (
        <EditSheet
          message={editMsg}
          onCancel={() => setEditId(null)}
          onSave={(content, inplay_time) => {
            updateMessage(editMsg.id, { content, inplay_time });
            setEditId(null);
          }}
        />
      )}

      {confirmDeleteChat && (
        <ConfirmDialog
          title="Chat löschen?"
          text="Der ganze Chat mit allen Nachrichten verschwindet für alle – auch für die andere Seite."
          confirmLabel="Chat löschen"
          onCancel={() => setConfirmDeleteChat(false)}
          onConfirm={() => {
            router.push("/handy/nachrichten");
            deleteChat(chat.id);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Nachricht löschen?"
          text="Die Nachricht verschwindet für alle aus dem Chat."
          confirmLabel="Nachricht löschen"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteMessage(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      )}
    </PhoneFrame>
  );
}

// Inplay-Datum der nächsten Nachricht (mit der Uhrzeit, ab der es weitergeht) bzw.
// markierter Nachrichten. Sitzt oben im Handy, damit der aufklappende Kalender
// darunter Platz hat.
function DateSheet({
  initial,
  initialTime,
  hint = "Alles, was du jetzt schreibst, spielt an diesem Tag und steht im Verlauf an der passenden Stelle.",
  onSave,
  onCancel,
}: {
  initial: string;
  initialTime?: string; // ohne: nur das Datum (markierte Nachrichten verlegen)
  hint?: string;
  onSave: (date: string, time: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial);
  const [time, setTime] = useState(initialTime ?? "");
  return (
    <div className="absolute inset-0 z-20 bg-black/55 p-3 pt-16" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border-subtle bg-bg-surface-2 p-4"
      >
        <div className="text-[0.9375rem] font-semibold text-text-primary">Inplay-Datum</div>
        <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">{hint}</p>
        <DatePicker value={date} onChange={setDate} className="mt-3" />
        {initialTime !== undefined && (
        <label className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] text-text-secondary">
          Uhrzeit der nächsten Nachricht
          <input
            type="time"
            value={time}
            onChange={(e) => e.target.value && setTime(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-text-primary outline-none [color-scheme:dark] sm:text-[0.875rem]"
          />
        </label>
        )}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            disabled={!date}
            onClick={() => onSave(date, time)}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}

// Nachricht bearbeiten (eigene; Admins alle): Text und Inplay-Uhrzeit.
function EditSheet({
  message,
  onSave,
  onCancel,
}: {
  message: { content: string; inplay_time?: string | null };
  onSave: (content: string, time: string | null) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(message.content);
  const [time, setTime] = useState(message.inplay_time ?? "");
  return (
    <div className="absolute inset-0 z-20 bg-black/55 p-3 pt-16" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border-subtle bg-bg-surface-2 p-4"
      >
        <div className="text-[0.9375rem] font-semibold text-text-primary">Nachricht bearbeiten</div>
        <textarea
          value={text}
          rows={4}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          className="mt-3 w-full resize-none rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.9375rem]"
        />
        <label className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] text-text-secondary">
          Uhrzeit
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-text-primary outline-none [color-scheme:dark] sm:text-[0.875rem]"
          />
        </label>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            disabled={!text.trim()}
            onClick={() => onSave(text.trim(), time || null)}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
