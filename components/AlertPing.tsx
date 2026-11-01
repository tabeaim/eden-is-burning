"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { newestMessage } from "@/lib/chats";

// Ton bei Neuem (pro Gerät abschaltbar: Einstellungen → Benachrichtigungen)
export const PING_KEY = "eden:ping";
export function pingEnabled(): boolean {
  try {
    return localStorage.getItem(PING_KEY) !== "0";
  } catch {
    return true;
  }
}

// Bei welchen Szenen ein neuer Post klingelt (pro Gerät): standardmäßig nur in
// Szenen mit eigenen Charakteren, wahlweise auch abonnierte oder alle Szenen.
export const PING_SCENES_KEY = "eden:ping-scenes";
export type PingScenes = "own" | "subscribed" | "all";
export const PING_SCENE_OPTIONS: { key: PingScenes; label: string }[] = [
  { key: "own", label: "Nur eigene Szenen" },
  { key: "subscribed", label: "Eigene und abonnierte" },
  { key: "all", label: "Alle Szenen" },
];
export function pingScenes(): PingScenes {
  try {
    const v = localStorage.getItem(PING_SCENES_KEY);
    return v === "subscribed" || v === "all" ? v : "own";
  } catch {
    return "own";
  }
}

// Welcher Ton (pro Gerät): eine der eingebauten Varianten oder ein eigener,
// hochgeladener Ton. Der eigene Ton liegt als data:-Adresse im Browser.
export const PING_SOUND_KEY = "eden:ping-sound";
export const PING_CUSTOM_KEY = "eden:ping-custom";
export const PING_CUSTOM_NAME_KEY = "eden:ping-custom-name";
export const MAX_CUSTOM_PING_BYTES = 1024 * 1024;
export const MAX_CUSTOM_PING_SECONDS = 10;

type Tone = { notes: number[]; gap: number; decay: number; wave: OscillatorType; volume: number };
export const PING_SOUNDS = {
  chime: { label: "Zweiklang", tone: { notes: [880, 1320], gap: 0.13, decay: 0.45, wave: "sine", volume: 0.18 } },
  bell: { label: "Glocke", tone: { notes: [1046.5], gap: 0, decay: 1.2, wave: "triangle", volume: 0.22 } },
  drop: { label: "Tropfen", tone: { notes: [1400, 700], gap: 0.06, decay: 0.18, wave: "sine", volume: 0.2 } },
  knock: { label: "Klopfen", tone: { notes: [220, 220], gap: 0.16, decay: 0.08, wave: "square", volume: 0.08 } },
  spark: { label: "Funke", tone: { notes: [988, 1319, 1760], gap: 0.07, decay: 0.3, wave: "sine", volume: 0.14 } },
} satisfies Record<string, { label: string; tone: Tone }>;
export type PingSound = keyof typeof PING_SOUNDS | "custom";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function pingSound(): PingSound {
  const v = read(PING_SOUND_KEY);
  if (v === "custom") return read(PING_CUSTOM_KEY) ? "custom" : "chime";
  return v && v in PING_SOUNDS ? (v as PingSound) : "chime";
}

// Tongeneratoren direkt im Browser (keine Tondatei). Browser spielen Töne erst,
// nachdem man die Seite einmal angeklickt hat – vorher bleibt es still.
let audio: AudioContext | null = null;
function playTone({ notes, gap, decay, wave, volume }: Tone) {
  audio ??= new AudioContext();
  const ctx = audio;
  void ctx.resume();
  notes.forEach((freq, i) => {
    const at = ctx.currentTime + i * gap;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  });
}

// Spielt den gewählten Ton (oder `sound`, z.B. zum Vorhören in den Einstellungen)
export function playPing(sound: PingSound = pingSound()) {
  try {
    if (sound === "custom") {
      const src = read(PING_CUSTOM_KEY);
      if (src) {
        void new Audio(src).play().catch(() => {});
        return;
      }
      sound = "chime";
    }
    playTone(PING_SOUNDS[sound].tone);
  } catch {
    /* kein Ton möglich */
  }
}

// Prüft eine hochgeladene Tondatei (Größe, Länge) und liefert sie als data:-Adresse
export async function readCustomPing(file: File): Promise<string> {
  if (!file.type.startsWith("audio/")) throw new Error("Das ist keine Tondatei.");
  if (file.size > MAX_CUSTOM_PING_BYTES) throw new Error("Die Datei ist größer als 1 MB.");
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
  const seconds = await new Promise<number>((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(a.duration);
    a.onerror = () => reject(new Error("Dieses Tonformat kann der Browser nicht abspielen."));
    a.src = url;
  });
  if (Number.isFinite(seconds) && seconds > MAX_CUSTOM_PING_SECONDS)
    throw new Error(`Der Ton ist länger als ${MAX_CUSTOM_PING_SECONDS} Sekunden.`);
  return url;
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
  const sceneMode = pingScenes();
  const keys: string[] = [];
  for (const s of scenes) {
    // bespielte Nebenfiguren zählen nur in abonnierten Szenen (wie beim Dashboard-Zähler)
    const mine = s.participant_ids.some((id) => myIds.has(id) || (myNpcIds.has(id) && isSubscribed(s.id)));
    const counts =
      sceneMode === "all" || mine || (sceneMode === "subscribed" && isSubscribed(s.id));
    if (!counts || !isSceneNew(s.id)) continue;
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
  const signature = sceneMode + "#" + keys.sort().join("|");

  const known = useRef<Set<string> | null>(null);
  const since = useRef(0);
  const lastMode = useRef(sceneMode);
  useEffect(() => {
    const now = keys;
    // Beim Start (und solange die Daten noch eintrudeln) nur merken, nicht klingeln
    if (!known.current) {
      known.current = new Set(now);
      since.current = Date.now();
      return;
    }
    // Szenen-Auswahl wurde umgestellt: neu hinzugekommene Szenen nur merken
    if (lastMode.current !== sceneMode) {
      lastMode.current = sceneMode;
      for (const k of now) known.current.add(k);
      return;
    }
    const fresh = now.some((k) => !known.current!.has(k));
    for (const k of now) known.current.add(k);
    if (fresh && Date.now() - since.current > 5000 && pingEnabled()) playPing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
