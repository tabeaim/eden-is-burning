"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character } from "@/lib/types";
import { CALL_TO_KEY, SMS_TO_KEY, hasPhone, resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { ContactAvatar, OwnerPicker, useMyPhone } from "@/components/phone/PhoneFrame";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { btn } from "@/components/admin/ui";

// „Andere Handys": alle Handys fremder Charaktere zum Ansehen. Übersicht mit
// Hintergrund, Profilbild (das Kontaktfoto dieses Handys, sonst das eigene) und
// echtem Namen (mit Suche); ein Handy lässt sich groß öffnen, mit ‹ › neben dem
// Gerät weiterblättern, und von dort aus SMS schreiben oder anrufen (Captic über
// die App im Gerät) – immer aus Sicht des Handys, das ich gerade in der Hand habe
// (umschaltbar). Oben nach Relevanz für diesen Charakter sortiert (ohne
// Überschriften), darunter eingeklappt „weitere.".
// „Alexanders Handy", aber „Max' Handy" (Name endet auf s, x, z, ß)
const possessive = (first: string) => (/[sxzß]$/i.test(first) ? `${first}'` : `${first}s`);

export default function OtherPhonesPage() {
  const router = useRouter();
  const { characters, npcs, chats, chatMessages, calls, scenes, posts } = useStore();
  const { me, myChars, setOwner } = useMyPhone();
  const [q, setQ] = useState("");
  const [now] = useState(() => Date.now());
  const [restOpen, setRestOpen] = useState(false);
  // offenes Handy und die Liste, aus der es geöffnet wurde (‹ › blättert darin)
  const [opened, setOpened] = useState<{ id: string; list: string[] } | null>(null);

  const query = q.trim().toLowerCase();
  // alle Handys außer dem, das ich gerade in der Hand habe (auch meine anderen Charaktere); die Reihenfolge gilt aus seiner Sicht
  const mine = new Set(myChars.map((c) => c.id));
  const meId = me?.id ?? "";
  const all = [...characters, ...npcs]
    .filter((c) => hasPhone(c) && c.id !== me?.id)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const byId = new Map(all.map((c) => [c.id, c]));

  // Reihenfolge nach Wichtigkeit – jede Person nur in der ersten passenden Gruppe
  const ranked = (() => {
    // in diesem Handy aus „Relevante" entfernt: nicht in den Reihen (außer Favoriten)
    const notRelevant = new Set(me?.phone?.not_relevant ?? []);
    const used = new Set<string>();
    const take = (ids: string[]) =>
      ids.filter((id) => byId.has(id) && !used.has(id) && (used.add(id), true)).map((id) => byId.get(id)!);

    // 1. Favoriten dieses Handys
    const favorites = take(me?.phone?.favorites ?? []);
    for (const id of notRelevant) used.add(id);

    // 2. Schreibt mit dir: SMS oder Anrufe mit diesem Charakter, zuletzt aktiv vorn
    const last = new Map<string, string>();
    const touch = (id: string, at: string) => {
      if (id !== meId && at > (last.get(id) ?? "")) last.set(id, at);
    };
    const newestIn = new Map<string, string>();
    for (const m of chatMessages) if (m.created_at > (newestIn.get(m.chat_id) ?? "")) newestIn.set(m.chat_id, m.created_at);
    for (const c of chats) {
      if (!c.participant_ids.includes(meId)) continue;
      const at = newestIn.get(c.id);
      if (at) for (const id of c.participant_ids) touch(id, at);
    }
    for (const call of calls) {
      if (call.caller_id === meId) touch(call.callee_id, call.created_at);
      if (call.callee_id === meId) touch(call.caller_id, call.created_at);
    }
    const writing = take([...last.keys()].sort((a, b) => last.get(b)!.localeCompare(last.get(a)!)));

    // 3. Aus deinen Szenen
    const together = new Map<string, number>();
    for (const sc of scenes) {
      if (!sc.participant_ids.includes(meId)) continue;
      for (const id of sc.participant_ids) together.set(id, (together.get(id) ?? 0) + 1);
    }
    const fromScenes = take([...together.keys()].sort((a, b) => together.get(b)! - together.get(a)!));

    // 4. Relevante: wer in diesem Handy unter „Relevante" steht (von Hand
    // hinzugefügt oder mit eigenem Kontakt-Eintrag) und oben noch fehlt
    const relevantIds = new Set([
      ...(me?.phone?.relevant ?? []),
      ...Object.keys(me?.phone?.contacts ?? {}).filter((id) => !notRelevant.has(id)),
    ]);
    const relevant = take(all.filter((c) => relevantIds.has(c.id)).map((c) => c.id));

    // 5. Neu dabei: in den letzten 14 Tagen angelegt
    const since = new Date(now - 14 * 86_400_000).toISOString();
    const fresh = take(
      all
        .filter((c) => c.created_at && c.created_at >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((c) => c.id),
    );

    // ohne Überschriften: die Gruppen geben nur die Reihenfolge vor
    const front = [...favorites, ...writing, ...fromScenes, ...relevant, ...fresh];
    const inFront = new Set(front.map((c) => c.id));
    // Datum der letzten Interaktion mit diesem Charakter: SMS, Anruf oder Post
    // in einer gemeinsamen Szene (echte Zeit)
    const lastContact = new Map(last);
    const sceneById = new Map(scenes.map((sc) => [sc.id, sc]));
    for (const p of posts) {
      const sc = sceneById.get(p.scene_id);
      if (!sc?.participant_ids.includes(meId)) continue;
      for (const id of sc.participant_ids)
        if (id !== meId && p.created_at > (lastContact.get(id) ?? "")) lastContact.set(id, p.created_at);
    }
    return { front, rest: all.filter((c) => !inFront.has(c.id)), lastContact };
  })();

  // oben die nach Relevanz sortierten (ohne Überschriften), darunter eingeklappt
  // „weitere." (alphabetisch); die Suche zeigt alle Treffer in einer Liste
  const hit = (c: Character) => c.name.toLowerCase().includes(query);
  const grid = query ? [...ranked.front, ...ranked.rest].filter(hit) : ranked.front;
  const rest = query ? [] : ranked.rest;
  // ohne Relevante gibt es nichts einzuklappen
  const restShown = restOpen || grid.length === 0;

  const openList = opened?.list ?? [];
  const index = opened ? openList.indexOf(opened.id) : -1;
  const open = opened ? (byId.get(opened.id) ?? null) : null;
  const step = (dir: -1 | 1) => {
    if (!opened || !openList.length) return;
    setOpened({ ...opened, id: openList[(index + dir + openList.length) % openList.length] });
  };
  const setOpenId = (id: string | null, list: Character[] = grid) =>
    setOpened(id ? { id, list: list.map((c) => c.id) } : null);

  // Pfeiltasten blättern, Esc schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Aktionen laufen über das eigene Handy (wie „Nachricht schreiben" in den Kontakten)
  const go = (key: string, value: string, href: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    router.push(href);
  };

  const arrowBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.14]";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-6">
      {/* Zurück zum eigenen Handy (mit Namen), darunter Titel, Sicht-Auswahl und Suche */}
      <Link href="/handy" className="inline-flex items-center gap-1 text-[0.8125rem] text-accent hover:underline">
        <Icon name="chevron-right" size={16} className="rotate-180" />
        {me ? `${possessive(me.name.split(" ")[0])} Handy` : "Zum Handy"}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display lowercase text-[1.625rem] leading-none text-text-primary">andere handys.</h1>
        {me && myChars.length > 1 && (
          <OwnerPicker
            owner={me.id}
            options={myChars.map((c) => c.id)}
            onOwner={setOwner}
            prefix="aus Sicht von"
          />
        )}
        <label className="ml-auto flex w-full items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary sm:w-64">
          <Icon name="search" size={15} className="shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Charakter suchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary sm:text-[0.875rem]"
          />
        </label>
      </div>

      {grid.length === 0 && rest.length === 0 && (
        <p className="pt-16 text-center text-[0.875rem] text-text-tertiary">
          {query ? "Kein Handy gefunden." : "Noch keine anderen Handys."}
        </p>
      )}

      {/* alle Handys in einer Liste: wer für dieses Handy wichtig ist, steht vorn */}
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
        {grid.map((c) => (
          <PhoneTile key={c.id} c={c} owner={me} sub={shortDate(ranked.lastContact.get(c.id))} onOpen={() => setOpenId(c.id, grid)} />
        ))}
      </div>

      {rest.length > 0 && grid.length > 0 && (
        <button
          onClick={() => setRestOpen((v) => !v)}
          aria-expanded={restOpen}
          className="group mb-2 mt-6 flex items-center gap-1.5 text-left"
        >
          <Icon
            name="chevron-right"
            size={12}
            className={`text-text-tertiary transition-transform ${restOpen ? "rotate-90" : ""}`}
          />
          <span className="text-[0.875rem] font-semibold uppercase tracking-wider text-text-tertiary transition-colors group-hover:text-text-secondary">
            Weitere · {rest.length}
          </span>
        </button>
      )}
      {rest.length > 0 && restShown && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
          {rest.map((c) => (
            <PhoneTile key={c.id} c={c} owner={me} sub={shortDate(ranked.lastContact.get(c.id))} onOpen={() => setOpenId(c.id, rest)} />
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black/75 p-3 pt-6"
          onClick={() => setOpenId(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
            <div className="min-w-0 max-w-full text-center">
              <div className="truncate text-[1rem] font-semibold text-text-primary">Handy von {open.name}</div>
              <div className="text-[0.75rem] text-text-tertiary">
                {index + 1} / {openList.length}
              </div>
            </div>

            {/* key: beim Blättern beginnt die Vorschau wieder auf dem Startbildschirm */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => step(-1)} aria-label="Voriges Handy" className={arrowBtn}>
                <Icon name="chevron-right" size={18} className="rotate-180" />
              </button>
              <PhonePreview key={open.id} character={open} />
              <button onClick={() => step(1)} aria-label="Nächstes Handy" className={arrowBtn}>
                <Icon name="chevron-right" size={18} />
              </button>
            </div>

            {me && (
              <div className="flex flex-wrap justify-center gap-2">
                {/* eigener Charakter: direkt auf sein Handy wechseln */}
                {mine.has(open.id) && (
                  <button
                    onClick={() => {
                      setOwner(open.id);
                      router.push("/handy");
                    }}
                    className={btn}
                  >
                    <Icon name="phone" size={15} />
                    Dieses Handy nehmen
                  </button>
                )}
                <button onClick={() => go(SMS_TO_KEY, open.id, "/handy/neu")} className={btn}>
                  <Icon name="message" size={15} />
                  SMS schreiben
                </button>
                <button onClick={() => go(CALL_TO_KEY, open.id, "/handy/kontakte")} className={btn}>
                  <Icon name="call" size={15} />
                  Anrufen
                </button>
              </div>
            )}

            <button
              onClick={() => setOpenId(null)}
              className="py-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// „24. Nov." – Datum der letzten Interaktion
function shortDate(iso: string | undefined): string | null {
  return iso ? new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
}

// Kleine Handy-Vorschau: Gehäusefarbe als Rahmen, Hintergrund, Profilbild (Kontaktfoto
// des eigenen Handys, sonst das des Charakters), darunter mittig der echte
// Vorname und das Datum der letzten Interaktion
function PhoneTile({
  c,
  owner,
  sub,
  onOpen,
}: {
  c: Character;
  owner: Character | null | undefined;
  sub?: string | null;
  onOpen: () => void;
}) {
  const phone = resolvePhone(c);
  return (
    <button
      onClick={onOpen}
      style={{ ["--frame" as string]: phone.frame }}
      className={`group flex shrink-0 flex-col overflow-hidden rounded-2xl border-[4px] border-[var(--frame)] text-left shadow-lg shadow-black/40 transition-transform hover:-translate-y-0.5`}
    >
      <span
        style={{ background: phone.wallpaper }}
        className={`flex aspect-[9/13] items-center justify-center p-2 ${phone.burner ? "grayscale" : ""}`}
      >
        <span className="pointer-events-none">
          <ContactAvatar owner={owner} character={c} size={52} />
        </span>
      </span>
      <span className="block bg-bg-surface px-2 py-1 text-center">
        <span className="block truncate text-[0.75rem] font-semibold text-text-primary" title={c.name}>
          {c.name.split(" ")[0]}
        </span>
        {sub && <span className="block truncate text-[0.625rem] text-text-tertiary">{sub}</span>}
      </span>
    </button>
  );
}
