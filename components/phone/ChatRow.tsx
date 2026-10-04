"use client";

import Link from "next/link";
import type { Chat } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatDateTimeShort, formatInplayDateShort } from "@/lib/format";
import { rememberPhone } from "@/lib/phone";
import { chatTitle } from "@/lib/chats";
import { Icon } from "@/components/Icon";

// Chat als kompakte Zeile fürs Dashboard – gleicher Aufbau wie `SceneRow`
// (Symbol, Titel, Unterzeile; rechts wer zuletzt schrieb und wann). Zeigt nie
// den Text der Nachricht. Führt direkt
// in den Chat auf dem Handy; mit `forCharacter` auf dem Handy dieses Charakters.
export function ChatRow({
  chat,
  forCharacter,
  muted = false,
  action,
}: {
  chat: Chat;
  forCharacter?: string;
  muted?: boolean;
  action?: React.ReactNode; // z.B. „Left on read"
}) {
  const { messagesOf, character, isChatFresh } = useStore();
  const messages = messagesOf(chat.id);
  const last = [...messages].reverse().find((m) => m.kind !== "date");
  const date = [...messages].reverse().find((m) => m.kind === "date");
  const lastChar = last ? character(last.character_id) : undefined;
  const others = chat.participant_ids.filter((id) => id !== forCharacter).map((id) => character(id));
  const title = forCharacter
    ? `Chat mit ${chatTitle(others)}`
    : `Neue Nachrichten bei ${chatTitle(chat.participant_ids.map((id) => character(id)))}`;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "opacity-70" : ""
      }`}
    >
      {/* wie das Streichholz der Szenen: orange bei Ungelesenem, sonst grau */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center ${
          isChatFresh(chat.id) ? "text-accent" : "text-text-tertiary opacity-60"
        }`}
      >
        <Icon name="phone" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[0.875rem] leading-snug text-text-primary">
          <Link
            href={`/handy/${chat.id}`}
            onClick={() => forCharacter && rememberPhone(forCharacter)}
            className="after:absolute after:inset-0"
          >
            {title}
          </Link>
        </div>
        <div className="truncate text-[0.875rem] text-text-tertiary">
          {/* bewusst ohne Vorschau der Nachricht – nichts spoilern */}
          SMS{date && ` · ${formatInplayDateShort(date.content.split("|")[0])}`}
        </div>
      </div>
      {action ? (
        <div className="relative z-10 shrink-0">{action}</div>
      ) : (
        last && (
          <div className="shrink-0 text-right text-[0.875rem]">
            {lastChar && <div className="text-text-secondary">{lastChar.name.split(" ")[0]}</div>}
            <div className="text-text-tertiary">{formatDateTimeShort(last.created_at)}</div>
          </div>
        )
      )}
    </div>
  );
}
