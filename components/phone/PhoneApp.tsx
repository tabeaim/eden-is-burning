"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character, PhoneCall } from "@/lib/types";
import { formatInplayDateShort } from "@/lib/format";
import { DatePicker } from "@/components/DatePicker";
import { Icon } from "@/components/Icon";
import {
  IncomingCall,
  PhoneSceneDialog,
  useCreatePhoneScene,
} from "@/components/phone/IncomingCall";
import { contactName, contactShortName } from "@/lib/phone";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { ContactList } from "@/components/phone/ContactList";
import {
  ContactAvatar,
  PhoneAvatar,
  PhoneFrame,
  PhoneHeader,
  useMyPhone,
} from "@/components/phone/PhoneFrame";
import { Sheet, SheetButton, SheetList } from "@/components/phone/Sheet";
import { useLongPress } from "@/components/phone/useLongPress";
import { SMS_TO_KEY } from "@/lib/phone";

const first = (c: Character | undefined) => c?.name.split(" ")[0] ?? "?";
const when = (c: Pick<PhoneCall, "inplay_date" | "inplay_time">) =>
  [formatInplayDateShort(c.inplay_date), c.inplay_time].filter(Boolean).join(", ");

// Telefon-App: Anrufliste (/handy/telefon) und Kontakte (/handy/kontakte). Aus den
// Kontakten klingelt man einen Charakter an (der nimmt an oder lehnt ab) oder
// erstellt direkt eine Telefonszene; Kontakte lassen sich umbenennen und mit
// eigenem Foto versehen (gilt nur auf diesem Handy).
export function PhoneApp({ initialView }: { initialView: "log" | "contacts" }) {
  const router = useRouter();
  const { calls, scenes, character, addCall, updateCall, updateCharacter } = useStore();
  const { myChars, me, setOwner } = useMyPhone();
  const [view, setView] = useState(initialView);
  const [contact, setContact] = useState<Character | null>(null);
  const [editing, setEditing] = useState<Character | null>(null);
  // Angenommener Anruf ohne Szene: lässt sich aus der Anrufliste nachholen
  const [sceneFor, setSceneFor] = useState<PhoneCall | null>(null);
  const createScene = useCreatePhoneScene();
  // Anruf, dessen Optionen (abbrechen, löschen) gerade offen sind
  const [menuFor, setMenuFor] = useState<PhoneCall | null>(null);
  const longPress = useLongPress<PhoneCall>(setMenuFor);

  if (!me) {
    return (
      <PhoneFrame owner={null}>
        <p className="p-8 text-center text-[0.875rem] text-text-secondary">
          Telefonieren geht nur mit einem eigenen Charakter.
        </p>
      </PhoneFrame>
    );
  }

  const hidden = me.phone?.hidden_calls ?? [];
  const myCalls = calls
    .filter((c) => (c.caller_id === me.id || c.callee_id === me.id) && !hidden.includes(c.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ringing = myCalls.filter((c) => c.status === "ringing" && c.callee_id === me.id);
  const log = myCalls.filter((c) => !ringing.includes(c));

  // Aus der Anrufliste dieses Handys löschen (beim Gegenüber bleibt der Eintrag).
  // Ein eigener, noch klingelnder Anruf wird dabei abgebrochen.
  function removeFromLog(c: PhoneCall) {
    if (c.status === "ringing" && c.caller_id === me!.id) updateCall(c.id, { status: "cancelled" });
    updateCharacter(me!.id, { phone: { ...me!.phone, hidden_calls: [...hidden, c.id] } });
  }

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
                c.status === "accepted"
                  ? "angenommen"
                  : c.status === "declined"
                    ? "abgelehnt"
                    : c.status === "cancelled"
                      ? "abgebrochen"
                      : "klingelt …";
              const body = (
                <>
                  {other && <ContactAvatar owner={me} character={other} size={44} />}
                  <span className="min-w-0 flex-1 border-b border-border-subtle pb-2.5">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[0.9375rem] font-semibold ${
                          c.status === "declined" ? "text-red-300" : "text-text-primary"
                        }`}
                      >
                        {contactName(me, other)}
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
              const cls = "flex w-full items-center gap-3 px-3 py-2.5 text-left";
              return (
                // Rechtsklick oder langes Drücken auf einen Eintrag: abbrechen (eigener
                // klingelnder Anruf) / löschen
                <div
                  key={c.id}
                  {...longPress(c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(c);
                  }}
                  className="select-none [-webkit-touch-callout:none]"
                >
                  {scene ? (
                    <Link href={`/szenen/${scene.id}`} className={`${cls} hover:bg-white/[0.03]`}>
                      {body}
                    </Link>
                  ) : c.status === "accepted" ? (
                    // angenommen, aber (noch) ohne Szene: lässt sich nachholen
                    <button
                      onClick={() => setSceneFor(c)}
                      title="Szene zu diesem Anruf erstellen"
                      className={`${cls} hover:bg-white/[0.03]`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <ContactList
            owner={me}
            onPick={setContact}
            onEdit={setEditing}
            onMessage={(c) => {
              // „Neue SMS" mit diesem Kontakt als Empfänger*in öffnen
              try {
                sessionStorage.setItem(SMS_TO_KEY, c.id);
              } catch {
                /* ignore */
              }
              router.push("/handy/neu");
            }}
          />
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
          onScene={(date, time, title) => {
            const call = { caller_id: me.id, callee_id: contact.id, inplay_date: date, inplay_time: time };
            const sceneId = createScene(call, title);
            addCall({ ...call, status: "accepted", scene_id: sceneId });
            router.push(`/szenen/${sceneId}`);
          }}
        />
      )}

      {editing && (
        <ContactDialog
          key={editing.id}
          me={me}
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            const contacts = { ...(me.phone?.contacts ?? {}) };
            if (entry) contacts[editing.id] = entry;
            else delete contacts[editing.id];
            updateCharacter(me.id, { phone: { ...me.phone, contacts } });
            setEditing(null);
          }}
        />
      )}

      {menuFor && (
        <Sheet onClose={() => setMenuFor(null)}>
          <SheetList>
            {menuFor.status === "ringing" && menuFor.caller_id === me.id && (
              <SheetButton
                onClick={() => {
                  updateCall(menuFor.id, { status: "cancelled" });
                  setMenuFor(null);
                }}
              >
                Anruf abbrechen
              </SheetButton>
            )}
            <SheetButton
              danger
              onClick={() => {
                removeFromLog(menuFor);
                setMenuFor(null);
              }}
            >
              Aus der Anrufliste löschen
            </SheetButton>
            <SheetButton onClick={() => setMenuFor(null)}>Abbrechen</SheetButton>
          </SheetList>
        </Sheet>
      )}

      {sceneFor ? (
        <PhoneSceneDialog call={sceneFor} onClose={() => setSceneFor(null)} />
      ) : (
        <IncomingCall characterId={me.id} always />
      )}
    </PhoneFrame>
  );
}

const dialogWrap = "absolute inset-0 z-20 overflow-y-auto bg-black/55 p-3 pt-12";
const dialogBox = "rounded-2xl border border-border-subtle bg-bg-surface-2 p-4";

// Anruf starten: oben Inplay-Datum und Uhrzeit (Pflicht) und „anklingeln",
// darunter optionaler Titel und „Telefonszene erstellen" (ohne anzuklingeln).
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
  onScene: (date: string, time: string, title: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [title, setTitle] = useState("");
  const ok = !!date && !!time;
  const button =
    "w-full rounded-md border px-3 py-2 text-[0.8125rem] font-medium disabled:opacity-40";
  const hint = "mt-1.5 text-center text-[0.75rem] text-text-tertiary";
  return (
    <div className={dialogWrap} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className={dialogBox}>
        <div className="flex items-center gap-3">
          <ContactAvatar owner={me} character={contact} size={48} />
          <div className="min-w-0">
            <div className="truncate text-[1rem] font-semibold text-text-primary">{contactName(me, contact)}</div>
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

        <button
          disabled={!ok}
          onClick={() => onRing(date, time)}
          className={`${button} mt-4 border-transparent bg-accent/90 text-black hover:bg-accent`}
        >
          {contactShortName(me, contact)} anklingeln
        </button>
        <p className={hint}>
          {contactShortName(me, contact)} bekommt den Anruf aufs Handy und kann annehmen oder ablehnen.
        </p>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Titel (optional): ${first(me)} & ${first(contact)} on the phone`}
            className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]"
          />
          <button
            disabled={!ok}
            onClick={() => onScene(date, time, title)}
            className={`${button} mt-2 border-border-subtle bg-white/[0.04] text-text-primary hover:bg-white/[0.08]`}
          >
            Telefonszene erstellen
          </button>
          <p className={hint}>Direkt eine Szene eröffnen, ohne vorher anzuklingeln.</p>
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full py-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// Kontakt bearbeiten: eigener Name und eigenes Foto für diesen Charakter – nur auf
// dem Handy, von dem aus man gerade arbeitet. Der Name gilt dort überall, das
// Foto nur bei Kontakten und Anrufen (nicht im Messenger).
function ContactDialog({
  me,
  contact,
  onSave,
  onClose,
}: {
  me: Character;
  contact: Character;
  onSave: (entry: { name?: string; photo?: string } | null) => void;
  onClose: () => void;
}) {
  const current = me.phone?.contacts?.[contact.id] ?? {};
  const [name, setName] = useState(current.name ?? "");
  const [photo, setPhoto] = useState(current.photo ?? "");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const button = "rounded-md border px-3 py-1.5 text-[0.8125rem] disabled:opacity-40";

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      setPhoto(await uploadImage(f, "phones", IMAGE_SIZES.avatar));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={dialogWrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={dialogBox}>
        <div className="text-[0.9375rem] font-semibold text-text-primary">Kontakt bearbeiten</div>
        <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">
          So ist {contact.name} auf dem Handy von {first(me)} gespeichert. Das Foto erscheint nur
          bei Kontakten und Anrufen.
        </p>
        <div className="mt-3 flex items-center gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <PhoneAvatar character={contact} size={56} link={false} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={uploading}
              onClick={() => file.current?.click()}
              className={`${button} border-border-subtle bg-white/[0.04] text-text-primary hover:bg-white/[0.08]`}
            >
              {uploading ? "Lädt…" : "Foto hochladen"}
            </button>
            {photo && (
              <button onClick={() => setPhoto("")} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
                Foto entfernen
              </button>
            )}
          </div>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <label className="mt-3 block text-[0.8125rem] text-text-secondary">
          Name
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={contact.name}
            className="mt-1 w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[16px] text-text-primary outline-none focus:border-white/20 sm:text-[0.875rem]"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button onClick={onClose} className="mr-auto px-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Abbrechen
          </button>
          {(current.name || current.photo) && (
            <button
              onClick={() => onSave(null)}
              className={`${button} border-border-subtle bg-white/[0.04] text-text-primary hover:bg-white/[0.08]`}
            >
              Zurücksetzen
            </button>
          )}
          <button
            onClick={() => {
              const entry = { ...(name.trim() ? { name: name.trim() } : {}), ...(photo ? { photo } : {}) };
              onSave(Object.keys(entry).length ? entry : null);
            }}
            className={`${button} border-transparent bg-accent/90 font-medium text-black hover:bg-accent`}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
