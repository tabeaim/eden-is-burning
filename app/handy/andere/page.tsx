"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Character } from "@/lib/types";
import { CALL_TO_KEY, PHONE_MODELS, SMS_TO_KEY, hasPhone, resolvePhone } from "@/lib/phone";
import { Icon } from "@/components/Icon";
import { PhoneAvatar, useMyPhone } from "@/components/phone/PhoneFrame";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { CAPTIC_OPEN_KEY } from "@/components/phone/captic/CapticApp";

// „Andere Handys": alle Handys fremder Charaktere zum Ansehen. Übersicht mit
// Hintergrund, Profilbild und Modell (mit Suche); ein Handy lässt sich groß
// öffnen, mit ‹ › weiterblättern, und von dort aus SMS schreiben, anrufen oder
// das Captic-Profil öffnen – immer aus Sicht des Handys, das ich gerade in der
// Hand habe (umschaltbar). Oben nach Relevanz für diesen Charakter sortiert
// (ohne Überschriften), darunter eingeklappt „Weitere".
export default function OtherPhonesPage() {
  const router = useRouter();
  const { characters, npcs, chats, chatMessages, calls, scenes } = useStore();
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

    // ohne Überschriften: die Gruppen geben nur die Reihenfolge vor, die
    // kleine Zeile unter dem Namen verrät, warum jemand weit vorn steht
    const hint = new Map<string, string | null>();
    for (const c of favorites) hint.set(c.id, "★ Favorit");
    for (const c of writing) hint.set(c.id, relativeDay(last.get(c.id)));
    for (const c of fromScenes) hint.set(c.id, `${together.get(c.id)} ${together.get(c.id) === 1 ? "Szene" : "Szenen"}`);
    for (const c of fresh) hint.set(c.id, "neu dabei");
    const front = [...favorites, ...writing, ...fromScenes, ...relevant, ...fresh];
    const inFront = new Set(front.map((c) => c.id));
    return { front, rest: all.filter((c) => !inFront.has(c.id)), hint };
  })();

  // oben die nach Relevanz sortierten (ohne Überschriften), darunter eingeklappt
  // „Weitere" (alphabetisch); die Suche zeigt alle Treffer in einer Liste
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

  const actionBtn =
    "flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] font-medium text-text-primary hover:bg-white/[0.08]";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/handy" className="flex items-center gap-1 text-[0.8125rem] text-accent hover:underline">
          <Icon name="chevron-right" size={16} className="rotate-180" />
          Eigenes Handy
        </Link>
        <h1 className="text-[1.25rem] font-bold text-text-primary">Andere Handys</h1>
        {me && (
          <span className="flex items-center gap-1.5 text-[0.8125rem] text-text-tertiary">
            aus Sicht von
            {myChars.length > 1 ? (
              <select
                value={me.id}
                onChange={(e) => setOwner(e.target.value)}
                className="rounded-md border border-border-subtle bg-white/[0.04] px-2 py-1 font-medium text-text-primary"
                aria-label="Von welchem Handy aus"
              >
                {myChars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-text-primary">{me.name}</span>
            )}
          </span>
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
          <PhoneTile key={c.id} c={c} sub={ranked.hint.get(c.id) ?? modelLabel(c)} onOpen={() => setOpenId(c.id, grid)} />
        ))}
      </div>

      {rest.length > 0 && grid.length > 0 && (
        <button
          onClick={() => setRestOpen((v) => !v)}
          aria-expanded={restOpen}
          className="mb-2 mt-6 flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
        >
          Weitere <span className="font-normal">· {rest.length}</span>
          <Icon name="chevron-right" size={14} className={`transition-transform ${restOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      )}
      {rest.length > 0 && restShown && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
          {rest.map((c) => (
            <PhoneTile key={c.id} c={c} sub={modelLabel(c)} onOpen={() => setOpenId(c.id, rest)} />
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black/75 p-3 pt-6"
          onClick={() => setOpenId(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center gap-2">
              <button
                onClick={() => step(-1)}
                aria-label="Voriges Handy"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.14]"
              >
                <Icon name="chevron-right" size={18} className="rotate-180" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[1rem] font-semibold text-text-primary">Handy von {open.name}</div>
                <div className="text-[0.75rem] text-text-tertiary">
                  {index + 1} / {openList.length} · {modelLabel(open)}
                </div>
              </div>
              <button
                onClick={() => step(1)}
                aria-label="Nächstes Handy"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.14]"
              >
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
                    className={actionBtn}
                  >
                    <Icon name="phone" size={15} className="text-accent" />
                    Dieses Handy nehmen
                  </button>
                )}
                <button onClick={() => go(SMS_TO_KEY, open.id, "/handy/neu")} className={actionBtn}>
                  <Icon name="message" size={15} className="text-accent" />
                  SMS schreiben
                </button>
                <button onClick={() => go(CALL_TO_KEY, open.id, "/handy/kontakte")} className={actionBtn}>
                  <Icon name="call" size={15} className="text-accent" />
                  Anrufen
                </button>
                {resolvePhone(open).captic && resolvePhone(me).captic && (
                  <button onClick={() => go(CAPTIC_OPEN_KEY, `profile:${open.id}`, "/handy/captic")} className={actionBtn}>
                    <Icon name="camera" size={15} className="text-accent" />
                    Captic-Profil
                  </button>
                )}
              </div>
            )}

            {/* key: beim Blättern beginnt die Vorschau wieder auf dem Startbildschirm */}
            <PhonePreview key={open.id} character={open} />

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

const modelLabel = (c: Character) => PHONE_MODELS.find((m) => m.key === resolvePhone(c).model)?.label ?? "";

// „heute", „gestern", „vor 3 Tagen", sonst das Datum
function relativeDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const day = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);
  const diff = day(new Date()) - day(new Date(iso));
  if (diff <= 0) return "heute";
  if (diff === 1) return "gestern";
  if (diff < 7) return `vor ${diff} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

// Kleine Handy-Vorschau: Gehäusefarbe als Rahmen, Hintergrund, Profilbild, Name
function PhoneTile({ c, sub, onOpen }: { c: Character; sub?: string | null; onOpen: () => void }) {
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
          <PhoneAvatar character={c} size={52} />
        </span>
      </span>
      <span className="block bg-bg-surface px-2 py-1">
        <span className="block truncate text-[0.75rem] font-semibold text-text-primary">{c.name.split(" ")[0]}</span>
        <span className="block truncate text-[0.625rem] text-text-tertiary">{sub || c.name}</span>
      </span>
    </button>
  );
}
