"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Chat, ChatMessage, ChatMessageKind } from "@/lib/types";
import { formatDateTime, formatInplayDate } from "@/lib/format";
import { isEmojiOnly, QUICK_REACTIONS } from "@/lib/emoji";
import { addMinutes, resolvePhone } from "@/lib/phone";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { Composer } from "@/components/phone/Composer";
import { EmojiPicker } from "@/components/phone/EmojiPicker";
import {
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  usePhoneOwner,
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

// Kurzfassung einer Nachricht (Antwort-Zitat)
function snippet(m: ChatMessage): string {
  if (m.kind === "gif") return "GIF";
  if (m.kind === "image") return "Foto";
  return m.content;
}

// Tagestrenner: Inplay-Datum „2021-11-23"
function dividerLabel(content: string): string {
  return formatInplayDate(content.split("|")[0]);
}

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
  } = useStore();
  const messages = messagesOf(chat.id);
  const parts = chat.participant_ids;

  // Wessen Handy? Eigene Charaktere im Chat haben Vorrang (rechts = „ich"). Sind
  // beide meine oder keiner, lässt sich die Seite über die Leiste oben tauschen.
  const [owner, setOwner] = usePhoneOwner();
  const writable = parts.filter(canWriteAs);
  const candidates = writable.length > 0 ? writable : parts;
  const self = owner && candidates.includes(owner) ? owner : candidates[0];
  const canWrite = canWriteAs(self);
  const selfChar = character(self);
  const others = parts.filter((p) => p !== self).map((p) => character(p));
  const other = others[0];

  // Inplay-Uhrzeit der nächsten Nachricht: läuft von der letzten Nachricht aus
  // eine Minute weiter, lässt sich in der Eingabezeile überschreiben.
  const lastTime = [...messages].reverse().find((m) => m.inplay_time)?.inplay_time;
  const [timeOverride, setTimeOverride] = useState<string | null>(null);
  const time = timeOverride ?? (lastTime ? addMinutes(lastTime, 1) : "12:00");
  // Ohne Tagestrenner kein Chat: zuerst das Inplay-Datum festlegen
  const hasDate = messages.some((m) => m.kind === "date");
  const burner = resolvePhone(selfChar).burner;

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const active = messages.find((m) => m.id === activeId);
  const replyMsg = messages.find((m) => m.id === replyTo);

  // Neue Nachrichten: ans Ende springen und den Chat als gelesen merken
  const list = useRef<HTMLDivElement>(null);
  const toBottom = () => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(() => {
    toBottom();
    markChatSeen(chat.id);
  }, [chat.id, messages.length, markChatSeen]);
  // Bilder laden nach — unten bleiben, wenn man ohnehin am Ende war
  const onMedia = () => {
    const el = list.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 500) toBottom();
  };

  function send(kind: ChatMessageKind, content: string) {
    addMessage(chat.id, self, kind, content, { replyTo, time });
    setReplyTo(null);
    setTimeOverride(null);
  }

  function closeSheet() {
    setActiveId(null);
    setMoreEmoji(false);
  }

  return (
    <PhoneFrame owner={self} options={candidates} onOwner={setOwner}>
      <PhoneHeader back="/handy/nachrichten">
        <Link href={other ? `/charaktere/${other.id}` : "/handy"} className="flex items-center gap-2.5">
          {other && <PhoneAvatar character={other} size={38} />}
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-semibold leading-tight text-text-primary">
              {others.map((o) => o?.name ?? "Unbekannt").join(" & ") || "Unbekannt"}
            </span>
            {!canWrite && (
              <span className="block truncate text-[0.75rem] text-text-tertiary">nur lesen</span>
            )}
          </span>
        </Link>
      </PhoneHeader>

      <div ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-[0.8125rem] text-text-tertiary">
            Noch keine Nachrichten.
          </p>
        )}
        {messages.map((m, i) => {
          if (m.kind === "date") {
            return (
              <div key={m.id} className="my-3 flex justify-center">
                <button
                  onClick={() => setActiveId(m.id)}
                  className="rounded-full bg-white/[0.06] px-3 py-1 text-[0.75rem] text-text-tertiary"
                >
                  {dividerLabel(m.content)}
                </button>
              </div>
            );
          }
          const mine = m.character_id === self;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const first = !prev || prev.kind === "date" || prev.character_id !== m.character_id;
          const lastOfGroup = !next || next.kind === "date" || next.character_id !== m.character_id;
          const quoted = m.reply_to ? messages.find((x) => x.id === m.reply_to) : undefined;
          const reactions = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length > 0);
          const big = m.kind === "text" && !quoted && isEmojiOnly(m.content);
          const media = m.kind === "gif" || m.kind === "image";
          // Wie in den bekannten Messengern: nur die letzte Blase einer Folge hat die „Ecke"
          const shape = `rounded-[1.25rem] ${
            lastOfGroup ? (mine ? "rounded-br-md" : "rounded-bl-md") : ""
          }`;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"} ${first ? "mt-2.5" : "mt-0.5"}`}
            >
              <button
                onClick={() => setActiveId(m.id)}
                className={`relative max-w-[78%] text-left ${
                  big
                    ? "text-[2.75rem] leading-tight"
                    : media
                      ? `overflow-hidden ${shape} bg-bg-surface-2`
                      : `${shape} px-3.5 py-2 text-[0.9375rem] leading-snug ${
                          mine ? "bg-accent text-black" : "bg-bg-surface-2 text-text-primary"
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
                      {character(quoted.character_id)?.name.split(" ")[0] ?? "?"}
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
                      }`}
                    >
                      {m.inplay_time}
                    </span>
                  ))}
              </button>
              {reactions.length > 0 && (
                <div className={`relative z-[1] -mt-1.5 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
                  {reactions.map(([emoji, ids]) => (
                    <button
                      key={emoji}
                      disabled={!canWrite}
                      onClick={() => toggleReaction(m.id, emoji, self)}
                      title={ids.map((id) => character(id)?.name ?? "?").join(", ")}
                      className={`flex items-center gap-0.5 rounded-full border-2 border-[#0c0c0e] px-1.5 py-px text-[0.8125rem] leading-snug ${
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
          );
        })}
      </div>

      {canWrite && !hasDate ? (
        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-4 py-3 text-center">
          <p className="text-[0.8125rem] text-text-tertiary">
            Wann spielt dieser Chat? Lege zuerst das Inplay-Datum fest.
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
          onDate={() => setDateOpen(true)}
          media={!burner}
          time={time}
          onTime={setTimeOverride}
          placeholder={`Nachricht als ${selfChar?.name.split(" ")[0] ?? "…"}`}
          above={
            replyMsg && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-accent bg-white/[0.05] py-1.5 pl-2.5 pr-1">
                <div className="min-w-0 flex-1 text-[0.75rem]">
                  <div className="font-semibold text-accent">
                    Antwort an {character(replyMsg.character_id)?.name.split(" ")[0] ?? "?"}
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
            )
          }
        />
      ) : (
        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-4 py-3 text-center text-[0.8125rem] text-text-tertiary">
          Du liest mit — keiner dieser Charaktere gehört dir.
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
              {active.kind === "text" && (
                <SheetButton
                  onClick={() => {
                    void navigator.clipboard?.writeText(active.content);
                    closeSheet();
                  }}
                >
                  Kopieren
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

      {dateOpen && (
        <DateSheet
          initial={[...messages].reverse().find((m) => m.kind === "date")?.content.split("|")[0] ?? ""}
          initialTime={time}
          onCancel={() => setDateOpen(false)}
          onSave={(date, t) => {
            addMessage(chat.id, self, "date", date);
            setTimeOverride(t);
            setDateOpen(false);
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

function SheetButton({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-left hover:bg-white/[0.05] ${danger ? "text-red-300" : "text-text-primary"}`}
    >
      {children}
    </button>
  );
}

// Tagestrenner einfügen: Inplay-Datum und die Uhrzeit, ab der es weitergeht. Sitzt
// oben im Handy, damit der aufklappende Kalender darunter Platz hat.
function DateSheet({
  initial,
  initialTime,
  onSave,
  onCancel,
}: {
  initial: string;
  initialTime: string;
  onSave: (date: string, time: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial);
  const [time, setTime] = useState(initialTime);
  return (
    <div className="absolute inset-0 z-20 bg-black/55 p-3 pt-16" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border-subtle bg-bg-surface-2 p-4"
      >
        <div className="text-[0.9375rem] font-semibold text-text-primary">Inplay-Datum</div>
        <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">
          Setzt einen Trenner in den Chat — alles danach spielt an diesem Tag.
        </p>
        <DatePicker value={date} onChange={setDate} className="mt-3" />
        <label className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] text-text-secondary">
          Uhrzeit der nächsten Nachricht
          <input
            type="time"
            value={time}
            onChange={(e) => e.target.value && setTime(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-text-primary outline-none [color-scheme:dark] sm:text-[0.875rem]"
          />
        </label>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            disabled={!date}
            onClick={() => onSave(date, time)}
            className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
          >
            Einfügen
          </button>
        </div>
      </div>
    </div>
  );
}
