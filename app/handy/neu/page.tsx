"use client";

import { capFirst } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character, ChatMessageKind } from "@/lib/types";
import { SMS_TO_KEY, hasPhone, contactName, contactShortName, resolvePhone } from "@/lib/phone";
import { tierLabel } from "@/lib/characters";
import { chatHref, smsSceneTitle } from "@/lib/chats";
import { DatePicker } from "@/components/DatePicker";
import { Composer } from "@/components/phone/Composer";
import { PhoneAvatar, PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

const field =
  "w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]";

// „Neue SMS": vom Handy des gewählten eigenen Charakters (Leiste über dem Gerät)
// an einen oder mehrere Charaktere/NPCs – ab zwei Empfänger*innen wird es ein
// Gruppenchat (Name optional). Je Zusammensetzung gibt es einen fortlaufenden
// Chat: Besteht er schon, geht es dort weiter. Ein neuer Chat braucht das
// Inplay-Datum der ersten Nachricht; mit Titel beginnt er gleich als SMS-Szene.
export default function NewSmsPage() {
  const router = useRouter();
  const { characters, npcs, chats, currentPlayer, openChat, addMessage, addChatScene } = useStore();
  const { myChars, me: from, setOwner } = useMyPhone();
  // Aus den Kontakten kommend ist der/die Empfänger*in schon gewählt
  const [preset] = useState<string | null>(() => {
    try {
      const id = typeof window === "undefined" ? null : sessionStorage.getItem(SMS_TO_KEY);
      if (id) sessionStorage.removeItem(SMS_TO_KEY);
      return id;
    } catch {
      return null;
    }
  });
  const [toIds, setToIds] = useState<string[]>(preset ? [preset] : []);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [groupName, setGroupName] = useState("");
  const [timeOverride, setTimeOverride] = useState<string | null>(null);

  const everyone = [...characters, ...npcs].filter((c) => hasPhone(c)); // ohne Handy keine SMS
  const to = toIds
    .map((id) => everyone.find((c) => c.id === id && c.id !== from?.id))
    .filter((c): c is Character => !!c);
  const query = q.trim().toLowerCase();
  const suggestions = everyone
    .filter(
      (c) =>
        c.id !== from?.id &&
        !toIds.includes(c.id) &&
        (!query || c.name.toLowerCase().includes(query) || contactName(from, c).toLowerCase().includes(query)),
    )
    .sort((a, b) => contactName(from, a).localeCompare(contactName(from, b), "de"));
  // Den Chat in genau dieser Zusammensetzung gibt es schon?
  const key = from && to.length > 0 ? [from.id, ...to.map((c) => c.id)].sort().join("|") : "";
  const existing = key ? chats.find((c) => [...c.participant_ids].sort().join("|") === key) : undefined;
  // Aus den Kontakten: direkt dorthin (wer eine Gruppe will, beginnt bei „Neue SMS")
  const jumpTo = preset && toIds.length === 1 && toIds[0] === preset ? existing?.id : undefined;
  useEffect(() => {
    if (jumpTo) router.replace(chatHref(jumpTo));
  }, [jumpTo, router]);
  const time = timeOverride ?? "12:00";
  const group = to.length > 1;
  // Empfänger*innen suchen: solange noch niemand gewählt ist oder man tippt
  const picking = to.length === 0 || !!query;

  function send(kind: ChatMessageKind, content: string) {
    if (!from || to.length === 0 || !date || existing) return;
    const id = openChat([from.id, ...to.map((c) => c.id)], group ? groupName : null);
    const sceneId = title.trim()
      ? addChatScene(id, { title: title.trim(), inplay_date: date, summary: null, au: false, au_name: null })
      : null;
    addMessage(id, from.id, kind, content, { time, date, sceneId });
    setOwner(from.id);
    router.push(chatHref(id));
  }

  return (
    <PhoneFrame owner={from?.id ?? null} options={myChars.map((c) => c.id)} onOwner={setOwner}>
      <PhoneHeader back="/handy/nachrichten">
        <div className="text-[1.0625rem] font-semibold text-text-primary">Neue SMS</div>
      </PhoneHeader>

      {!from ? (
        <p className="p-6 text-center text-[0.875rem] text-text-secondary">
          Du brauchst einen eigenen Charakter, um Nachrichten zu schreiben.
        </p>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border-subtle px-3 py-2">
            <span className="w-7 shrink-0 text-[0.8125rem] text-text-tertiary">An:</span>
            {to.map((c) => (
              <button
                key={c.id}
                onClick={() => setToIds((ids) => ids.filter((id) => id !== c.id))}
                title="Entfernen"
                className="flex items-center gap-1.5 rounded-full bg-white/[0.08] py-1 pl-1 pr-2.5 text-[0.8125rem] text-text-primary"
              >
                <PhoneAvatar character={c} size={24} link={false} />
                {group ? contactShortName(from, c) : contactName(from, c)}
                <span className="text-text-tertiary">✕</span>
              </button>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={to.length === 0 ? "Charakter suchen…" : "Weitere Person (Gruppe)…"}
              autoFocus={to.length === 0}
              className="min-w-[8rem] flex-1 bg-transparent py-1 text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.9375rem]"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {picking &&
              suggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setToIds((ids) => [...ids, c.id]);
                    setQ("");
                    setTimeOverride(null);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] active:bg-white/[0.06]"
                >
                  <PhoneAvatar character={c} size={40} link={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] text-text-primary">
                      {contactName(from, c)}
                      {c.is_npc && (
                        <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                          {tierLabel(c)}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[0.75rem] text-text-tertiary">
                      {[capFirst(c.role), c.player_id === currentPlayer?.id ? "du" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            {picking && suggestions.length === 0 && (
              <p className="p-6 text-center text-[0.875rem] text-text-tertiary">Niemand gefunden.</p>
            )}
            {!picking && (
              <div className="flex flex-col items-center gap-2 px-5 pt-6 text-center">
                <span className="flex -space-x-5">
                  {to.slice(0, 4).map((c) => (
                    <PhoneAvatar
                      key={c.id}
                      character={c}
                      size={group ? 52 : 64}
                      link={false}
                      className="ring-2 ring-[var(--phone-screen,#0c0c0e)]"
                    />
                  ))}
                </span>
                <div className="text-[1rem] font-semibold text-text-primary">
                  {group ? to.map((c) => contactShortName(from, c)).join(" & ") : contactName(from, to[0])}
                </div>
                {existing ? (
                  <>
                    <p className="text-[0.8125rem] text-text-tertiary">
                      {group
                        ? "Diese Gruppe gibt es schon."
                        : `${from.name.split(" ")[0]} hat schon einen Chat mit ${contactShortName(from, to[0])}.`}{" "}
                      {jumpTo ? "Einen Moment …" : "Schreib dort weiter, oder füge oben jemanden hinzu."}
                    </p>
                    <Link
                      href={chatHref(existing.id)}
                      className="mt-1 rounded-full bg-accent/90 px-4 py-2 text-[0.8125rem] font-medium text-black"
                    >
                      Chat öffnen
                    </Link>
                  </>
                ) : (
                  <div className="mt-2 w-full max-w-[17rem] text-left">
                    {group && (
                      <>
                        <div className="mb-1 text-[0.8125rem] text-text-secondary">
                          Name der Gruppe (optional)
                        </div>
                        <input
                          value={groupName}
                          maxLength={40}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder={[from, ...to].map((c) => c.name.split(" ")[0]).join(" & ")}
                          className={`${field} mb-3`}
                        />
                      </>
                    )}
                    <div className="mb-1 text-[0.8125rem] text-text-secondary">
                      Wann spielt die erste Nachricht? <span className="text-accent">*</span>
                    </div>
                    <DatePicker value={date} onChange={setDate} />
                    <div className="mb-1 mt-3 text-[0.8125rem] text-text-secondary">
                      Titel der SMS-Szene (optional)
                    </div>
                    <input
                      value={title}
                      maxLength={80}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={smsSceneTitle([from, ...to])}
                      className={field}
                    />
                    <p className="mt-2 text-[0.75rem] text-text-tertiary">
                      Mit Titel steht der Austausch als SMS-Szene in Szenenübersicht und Timeline;
                      ohne bleibt er loses Geplänkel. Die Uhrzeit stellst du unten in der
                      Eingabezeile ein.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!picking && !existing && date && (
            <Composer
              onSend={send}
              media={!resolvePhone(from).burner}
              time={time}
              onTime={setTimeOverride}
              placeholder={`SMS als ${from.name.split(" ")[0]}`}
            />
          )}
        </>
      )}
    </PhoneFrame>
  );
}
