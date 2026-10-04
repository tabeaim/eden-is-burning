"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character, PhoneCall } from "@/lib/types";
import { formatInplayDateShort } from "@/lib/format";
import { DatePicker } from "@/components/DatePicker";
import { Icon } from "@/components/Icon";
import { phoneSceneHref } from "@/lib/phone";
import { IncomingCall } from "@/components/phone/IncomingCall";
import { PhoneAvatar, PhoneFrame, PhoneHeader, useMyPhone } from "@/components/phone/PhoneFrame";

const first = (c: Character | undefined) => c?.name.split(" ")[0] ?? "?";
const when = (c: Pick<PhoneCall, "inplay_date" | "inplay_time">) =>
  [formatInplayDateShort(c.inplay_date), c.inplay_time].filter(Boolean).join(", ");

// Telefon-App: Anrufliste und Kontakte. Aus den Kontakten klingelt man einen
// Charakter an (der nimmt an oder lehnt ab) oder erstellt direkt eine Telefonszene.
export default function PhoneAppPage() {
  const router = useRouter();
  const { calls, scenes, character, characters, npcs, addCall, currentPlayer } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  const [view, setView] = useState<"log" | "contacts">(() =>
    typeof window !== "undefined" && window.location.hash === "#kontakte" ? "contacts" : "log",
  );
  const [q, setQ] = useState("");
  const [contact, setContact] = useState<Character | null>(null);
  // „Neuer Anruf" im Seitenmenü führt per #kontakte direkt zu den Kontakten
  useEffect(() => {
    const onHash = () => window.location.hash === "#kontakte" && setView("contacts");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Telefonieren geht nur mit einem eigenen Charakter.
        </p>
      </PhoneFrame>
    );
  }

  const myCalls = calls
    .filter((c) => c.caller_id === me.id || c.callee_id === me.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ringing = myCalls.filter((c) => c.status === "ringing" && c.callee_id === me.id);
  const log = myCalls.filter((c) => !ringing.includes(c));

  const query = q.trim().toLowerCase();
  const contacts = [...characters, ...npcs]
    .filter((c) => c.id !== me.id && (!query || c.name.toLowerCase().includes(query)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const tabBtn = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium ${
      active ? "text-accent" : "text-text-tertiary"
    }`;

  return (
    <PhoneFrame owner={me.id} options={myChars.map((c) => c.id)} onOwner={setOwner} callBanner={false}>
      <PhoneHeader back="/handy">
        <div className="text-[1.1875rem] font-bold leading-tight text-text-primary">
          {view === "log" ? "Anrufliste" : "Kontakte"}
        </div>
      </PhoneHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === "log" ? (
          <>
            {log.length === 0 && ringing.length === 0 && (
              <p className="px-8 pt-16 text-center text-[0.875rem] text-text-tertiary">
                Noch keine Anrufe. Unter „Kontakte“ kannst du jemanden anrufen.
              </p>
            )}
            {log.map((c) => {
              const outgoing = c.caller_id === me.id;
              const other = character(outgoing ? c.callee_id : c.caller_id);
              const scene = c.scene_id ? scenes.find((s) => s.id === c.scene_id) : undefined;
              const status =
                c.status === "accepted" ? "angenommen" : c.status === "declined" ? "abgelehnt" : "klingelt …";
              const body = (
                <>
                  {other && <PhoneAvatar character={other} size={44} />}
                  <span className="min-w-0 flex-1 border-b border-border-subtle pb-2.5">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[0.9375rem] font-semibold ${
                          c.status === "declined" ? "text-red-300" : "text-text-primary"
                        }`}
                      >
                        {other?.name ?? "Unbekannt"}
                      </span>
                      <span className="shrink-0 text-[0.75rem] text-text-tertiary">{when(c)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[0.8125rem] text-text-tertiary">
                      <span className="min-w-0 flex-1 truncate">
                        {outgoing ? "↗ ausgehend" : "↙ eingehend"} · {status}
                      </span>
                      {scene && <span className="shrink-0 text-accent">Zur Szene ›</span>}
                    </span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-3 px-3 py-2.5";
              return scene ? (
                <Link key={c.id} href={`/szenen/${scene.id}`} className={`${cls} hover:bg-white/[0.03]`}>
                  {body}
                </Link>
              ) : c.status === "accepted" ? (
                // angenommen, aber (noch) ohne Szene: lässt sich nachholen
                <Link
                  key={c.id}
                  href={phoneSceneHref({ from: c.caller_id, to: c.callee_id, date: c.inplay_date, time: c.inplay_time, call: c.id })}
                  title="Szene zu diesem Anruf erstellen"
                  className={`${cls} hover:bg-white/[0.03]`}
                >
                  {body}
                </Link>
              ) : (
                <div key={c.id} className={cls}>
                  {body}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="px-3 py-2">
              <label className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary">
                <Icon name="search" size={15} className="shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Kontakt suchen"
                  className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
                />
              </label>
            </div>
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setContact(c)}
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
                    {[c.role, c.player_id === currentPlayer?.id ? "du" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Icon name="phone" size={18} className="shrink-0 text-accent" />
              </button>
            ))}
          </>
        )}
      </div>

      {/* Reiter unten, wie in einer Telefon-App */}
      <div className="flex shrink-0 border-t border-border-subtle bg-bg-surface">
        <button onClick={() => setView("log")} className={tabBtn(view === "log")}>
          <Icon name="calendar" size={20} />
          Anrufliste
        </button>
        <button onClick={() => setView("contacts")} className={tabBtn(view === "contacts")}>
          <Icon name="users" size={20} />
          Kontakte
        </button>
      </div>

      {contact && (
        <CallDialog
          me={me}
          contact={contact}
          onCancel={() => setContact(null)}
          onRing={(date, time) => {
            addCall({ caller_id: me.id, callee_id: contact.id, inplay_date: date, inplay_time: time, status: "ringing", scene_id: null });
            setContact(null);
            setView("log");
          }}
          onScene={(date, time) =>
            router.push(phoneSceneHref({ from: me.id, to: contact.id, date, time, log: true }))
          }
        />
      )}

      <IncomingCall characterId={me.id} />
    </PhoneFrame>
  );
}

const dialogWrap = "absolute inset-0 z-20 overflow-y-auto bg-black/55 p-3 pt-12";
const dialogBox = "rounded-2xl border border-border-subtle bg-bg-surface-2 p-4";

// Anruf starten: Inplay-Datum und Uhrzeit sind Pflicht; dann anklingeln oder
// direkt eine Telefonszene erstellen (Neue-Szene-Formular, vorausgefüllt).
// Buttons nach DESIGN.md: rounded-md, Primär-Aktion in Akzentfarbe.
function CallDialog({
  me,
  contact,
  onRing,
  onScene,
  onCancel,
}: {
  me: Character;
  contact: Character;
  onRing: (date: string, time: string) => void;
  onScene: (date: string, time: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const ok = !!date && !!time;
  const button =
    "rounded-md border border-border-subtle px-3 py-1.5 text-[0.8125rem] disabled:opacity-40";
  return (
    <div className={dialogWrap} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className={dialogBox}>
        <div className="flex items-center gap-3">
          <PhoneAvatar character={contact} size={48} />
          <div className="min-w-0">
            <div className="truncate text-[1rem] font-semibold text-text-primary">{contact.name}</div>
            <div className="text-[0.8125rem] text-text-tertiary">{first(me)} ruft an</div>
          </div>
        </div>
        <div className="mt-3 text-[0.8125rem] text-text-secondary">
          Wann ist der Anruf? <span className="text-accent">*</span>
        </div>
        <DatePicker value={date} onChange={setDate} className="mt-1" />
        <label className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[0.875rem] text-text-secondary">
          Uhrzeit
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-text-primary outline-none [color-scheme:dark] sm:text-[0.875rem]"
          />
        </label>

        <p className="mt-3 text-[0.75rem] leading-relaxed text-text-tertiary">
          <span className="text-text-secondary">Anklingeln:</span> {first(contact)} bekommt den Anruf
          aufs Handy und kann annehmen oder ablehnen.{" "}
          <span className="text-text-secondary">Telefonszene erstellen:</span> direkt eine Szene
          eröffnen, ohne vorher anzuklingeln.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button onClick={onCancel} className="mr-auto px-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          <button
            disabled={!ok}
            onClick={() => onScene(date, time)}
            className={`${button} bg-white/[0.04] text-text-primary hover:bg-white/[0.08]`}
          >
            Telefonszene erstellen
          </button>
          <button
            disabled={!ok}
            onClick={() => onRing(date, time)}
            className={`${button} border-transparent bg-accent/90 font-medium text-black hover:bg-accent`}
          >
            {first(contact)} anklingeln
          </button>
        </div>
      </div>
    </div>
  );
}
