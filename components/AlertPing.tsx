"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { newestMessage } from "@/lib/chats";

// Ton bei Neuem (pro Gerät abschaltbar: Einstellungen → Darstellung)
export const PING_KEY = "eden:ping";
export function pingEnabled(): boolean {
  try {
    return localStorage.getItem(PING_KEY) !== "0";
  } catch {
    return true;
  }
}

// Kurzer Zweiklang, direkt erzeugt (keine Tondatei). Browser spielen Töne erst,
// nachdem man die Seite einmal angeklickt hat – vorher bleibt es still.
let audio: AudioContext | null = null;
export function playPing() {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    void ctx.resume();
    [880, 1320].forEach((freq, i) => {
      const at = ctx.currentTime + i * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.5);
    });
  } catch {
    /* kein Ton möglich */
  }
}

// Spielt einen Ton, sobald für die eigenen Charaktere etwas Neues passiert: neuer
// Post in einer eigenen Szene, neue Nachricht, Anruf, Mailbox, Captic-Aktivität.
// Jedes Ereignis hat einen Schlüssel; der Ton kommt, wenn ein neuer auftaucht.
export function AlertPing() {
  const {
    currentPlayer,
    charactersOf,
    myNpcs,
    scenes,
    postsOf,
    isSceneNew,
    isSubscribed,
    chats,
    chatMessages,
    isChatNew,
    incomingCalls,
    mailboxAlerts,
    capticUnread,
  } = useStore();

  const myIds = new Set(currentPlayer ? charactersOf(currentPlayer.id).map((c) => c.id) : []);
  const myNpcIds = new Set(myNpcs.map((c) => c.id));
  const keys: string[] = [];
  for (const s of scenes) {
    // bespielte Nebenfiguren zählen nur in abonnierten Szenen (wie beim Dashboard-Zähler)
    const mine = s.participant_ids.some((id) => myIds.has(id) || (myNpcIds.has(id) && isSubscribed(s.id)));
    if (!mine || !isSceneNew(s.id)) continue;
    const posts = postsOf(s.id);
    keys.push(`scene:${s.id}:${posts[posts.length - 1]?.id ?? ""}`);
  }
  for (const c of chats) {
    if (!isChatNew(c.id)) continue;
    keys.push(`chat:${c.id}:${newestMessage(chatMessages.filter((m) => m.chat_id === c.id))?.id ?? ""}`);
  }
  for (const c of incomingCalls) keys.push(`call:${c.id}`);
  for (const a of mailboxAlerts) keys.push(`mailbox:${a.kind}:${a.call.id}`);
  for (const a of capticUnread) keys.push(`captic:${a.characterId}:${a.count}`);
  const signature = keys.sort().join("|");

  const known = useRef<Set<string> | null>(null);
  const since = useRef(0);
  useEffect(() => {
    const now = keys;
    // Beim Start (und solange die Daten noch eintrudeln) nur merken, nicht klingeln
    if (!known.current) {
      known.current = new Set(now);
      since.current = Date.now();
      return;
    }
    const fresh = now.some((k) => !known.current!.has(k));
    for (const k of now) known.current.add(k);
    if (fresh && Date.now() - since.current > 5000 && pingEnabled()) playPing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
