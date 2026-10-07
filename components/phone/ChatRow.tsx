"use client";

import Link from "next/link";
import type { Chat, ChatScene } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatDateTimeShort, formatInplayDateShort } from "@/lib/format";
import { rememberPhone } from "@/lib/phone";
import { chatHref, chatName, newestMessage } from "@/lib/chats";
import { Icon } from "@/components/Icon";
import { ChatNameText } from "./ChatNameText";

// Chat als kompakte Zeile fürs Dashboard – gleicher Aufbau wie `SceneRow`
// (Symbol, Titel, Unterzeile; rechts wer zuletzt schrieb und wann). Eine Zeile je
// Strang: mit `scene` eine SMS-Szene (ihr Titel steht vorn), mit `scene: null` die
// losen Nachrichten des Chats; ohne Angabe der ganze Chat. Zeigt nie den Text der
// Nachricht. Führt direkt an die Stelle im Chat auf dem Handy; mit `forCharacter`
// auf dem Handy dieses Charakters.
export function ChatRow({
  chat,
  scene,
  forCharacter,
  muted = false,
  action,
}: {
  chat: Chat;
  scene?: ChatScene | null;
  forCharacter?: string;
  muted?: boolean;
  action?: React.ReactNode; // z.B. „Leave on read"
}) {
  const { messagesOf, character, isChatFresh } = useStore();
  const messages = messagesOf(chat.id).filter(
    (m) => scene === undefined || (m.scene_id ?? null) === (scene?.id ?? null),
  );
  const last = newestMessage(messages);
  const lastChar = last ? character(last.character_id) : undefined;
  // Gruppenname, sonst die (anderen) Beteiligten
  const names = chatName(chat, character, forCharacter ? { id: forCharacter } : null);
  const title = scene
    ? scene.title
    : (
        <>
          {chat.name?.trim() ? "Gruppe " : forCharacter ? "Chat mit " : "Neue Nachrichten bei "}
          <ChatNameText chat={chat} owner={forCharacter ? { id: forCharacter } : null} />
        </>
      );
  const day = scene?.inplay_date || last?.day;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "opacity-70" : ""
      }`}
    >
      {/* wie das Streichholz der Szenen: orange bei Ungelesenem, sonst grau */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center ${
          isChatFresh(chat.id, scene === undefined ? undefined : (scene?.id ?? null))
            ? "text-accent"
            : "text-text-tertiary opacity-60"
        }`}
      >
        <Icon name="phone" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[0.875rem] leading-snug text-text-primary">
          <Link
            href={chatHref(chat.id, scene ? scene.id : last?.id)}
            onClick={() => forCharacter && rememberPhone(forCharacter)}
            className="after:absolute after:inset-0"
          >
            {title}
          </Link>
        </div>
        <div className="truncate text-[0.875rem] text-text-tertiary">
          {/* bewusst ohne Vorschau der Nachricht – nichts spoilern */}
          SMS{scene && ` · ${names}`}
          {day && ` · ${formatInplayDateShort(day)}`}
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
