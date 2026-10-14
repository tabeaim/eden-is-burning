"use client";

import Link from "next/link";
import type { Chat, ChatScene } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatDateTimeShort, formatInplayDateShort } from "@/lib/format";
import { rememberPhone } from "@/lib/phone";
import { chatHref, chatName, newestMessage } from "@/lib/chats";
import { Icon } from "@/components/Icon";
import { Bubble } from "@/components/Bubble";
import { characterImage } from "@/lib/avatar";
import type { Character } from "@/lib/types";
import { ChatNameText } from "./ChatNameText";

// Chat als kompakte Zeile fürs Dashboard – gleicher Aufbau wie `SceneRow`
// (Symbol, Titel, Unterzeile; rechts wer zuletzt schrieb und wann). Eine Zeile je
// Strang: mit `scene` eine SMS-Szene (ihr Titel steht vorn), mit `scene: null` die
// losen Nachrichten des Chats; ohne Angabe der ganze Chat. Zeigt nie den Text der
// Nachricht. Führt direkt an die Stelle im Chat auf dem Handy; mit `forCharacter`
// auf dem Handy dieses Charakters.
// Mit `card` sieht die Zeile aus wie die ausführliche `SceneCard` (zweizeilig:
// Titel; darunter alle Beteiligten in einer Bubble und „SMS · Datum"; rechts die
// letzte Nachricht) – für Listen, in denen Chats zwischen Szenenkarten stehen.
export function ChatRow({
  chat,
  scene,
  forCharacter,
  muted = false,
  action,
  card = false,
}: {
  card?: boolean;
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

  if (card) {
    const participants = chat.participant_ids.map((id) => character(id)).filter(Boolean) as Character[];
    // am Zug ist im Zweier-Chat, wer nicht zuletzt geschrieben hat
    const turnId =
      last && participants.length === 2 ? (participants.find((c) => c.id !== last.character_id)?.id ?? null) : null;
    return (
      <div
        className={`relative flex items-center gap-4 rounded-xl border border-border-subtle px-4 py-3.5 transition-colors hover:bg-white/[0.03] ${
          muted ? "bg-bg-surface/60" : "bg-bg-surface"
        }`}
      >
        {/* an der Stelle des Streichholzes: grün bei Ungelesenem, sonst grau */}
        <span
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center ${
            isChatFresh(chat.id, scene === undefined ? undefined : (scene?.id ?? null))
              ? "text-accent"
              : "text-text-tertiary opacity-60"
          }`}
        >
          <Icon name="phone" size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[1rem] leading-tight text-text-primary">
            <Link
              href={chatHref(chat.id, scene ? scene.id : last?.id)}
              onClick={() => forCharacter && rememberPhone(forCharacter)}
              className="after:absolute after:inset-0"
            >
              {title}
            </Link>
          </h3>
          <div className="mt-2 flex min-w-0 items-center gap-3">
            <Bubble
              className="min-w-0 max-w-[65%] shrink-0 whitespace-nowrap"
              leading={
                <span className="flex shrink-0 -space-x-1.5">
                  {participants.map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={c.id}
                      src={characterImage(c)}
                      alt=""
                      className={`h-5 w-5 rounded-full object-cover ring-2 ${
                        c.id === turnId ? "ring-accent" : "ring-bg-surface"
                      }`}
                    />
                  ))}
                </span>
              }
            >
              <span className="min-w-0 truncate">
              {participants.map((c, n) => (
                <span key={c.id} className={c.id === turnId ? "text-accent" : undefined}>
                  {n > 0 && n === participants.length - 1 && <span className="text-text-secondary">&amp;&nbsp;</span>}
                  {c.name.split(" ")[0]}
                  {c.id === turnId && <Icon name="flame" size={12} className="ml-0.5 inline-block align-[-0.1em]" />}
                  {participants.length > 2 && n < participants.length - 2 && (
                    <span className="text-text-secondary">,</span>
                  )}
                  {n < participants.length - 1 && " "}
                </span>
              ))}
              </span>
            </Bubble>
            {/* bewusst ohne Vorschau der Nachricht – nichts spoilern */}
            <div className="min-w-0 flex-1 truncate text-[0.875rem] text-text-tertiary">
              SMS{day && ` · ${formatInplayDateShort(day)}`}
            </div>
          </div>
        </div>
        {last && (
          <div className="shrink-0 text-right text-[0.8125rem] leading-snug text-text-tertiary">
            {/* wie in der `SceneCard`: Klick springt zur neuesten Nachricht */}
            <Link
              href={chatHref(chat.id, last.id)}
              onClick={() => forCharacter && rememberPhone(forCharacter)}
              title="Zur neuesten Nachricht springen"
              className="group/last relative z-10 block hover:text-accent"
            >
              <div className="text-text-secondary group-hover/last:text-accent group-hover/last:underline">
                Letzte Nachricht
              </div>
              <div className="group-hover/last:underline">{formatDateTimeShort(last.created_at)}</div>
            </Link>
          </div>
        )}
        {action && <div className="relative z-10 shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "opacity-70" : ""
      }`}
    >
      {/* wie das Streichholz der Szenen: grün bei Ungelesenem, sonst grau */}
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
