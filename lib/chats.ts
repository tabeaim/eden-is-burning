// Messenger-Logik, die Handy und Dashboard teilen.
import type { Character, Chat, ChatMessage, ChatScene, Scene } from "./types";
import { PHONE_AREA, PHONE_LOCATION, contactName, contactShortName } from "./phone";
import { EDEN_AREA, areaName } from "./world";

// Nachricht mit ihrem Inplay-Tag („" = unbekannt, Altbestand ohne Trenner)
export type DatedMessage = ChatMessage & { day: string };

// Der fortlaufende Chat in Lesereihenfolge. Eingabe: die Nachrichten EINES Chats.
// Sortiert wird nach Inplay-Tag, nicht nach Schreibzeit – so lassen sich mehrere
// Stränge (auch in verschiedenen Jahren) nebeneinander bespielen. Innerhalb eines
// Tages bleiben Szenen und lose Nachrichten je am Stück (in der Reihenfolge, in
// der sie begonnen wurden), darin gilt die Schreibreihenfolge. Die alten
// Tagestrenner-Zeilen liefern nur noch das Datum und fallen heraus.
export function orderMessages(messages: ChatMessage[]): DatedMessage[] {
  const byWritten = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const dated: DatedMessage[] = [];
  let divider = "";
  for (const m of byWritten) {
    if (m.kind === "date") {
      divider = m.content.split("|")[0];
      continue;
    }
    dated.push({ ...m, day: m.inplay_date || divider });
  }
  const blockStart = new Map<string, string>();
  const block = (m: DatedMessage) => `${m.day}|${m.scene_id ?? ""}`;
  for (const m of dated) if (!blockStart.has(block(m))) blockStart.set(block(m), m.created_at);
  return dated.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      blockStart.get(block(a))!.localeCompare(blockStart.get(block(b))!) ||
      a.created_at.localeCompare(b.created_at),
  );
}

// Zuletzt geschriebene Nachricht (echte Zeit) – egal, wo sie im Verlauf steht
export function newestMessage<T extends ChatMessage>(messages: T[]): T | undefined {
  let newest: T | undefined;
  for (const m of messages) {
    if (m.kind !== "date" && (!newest || m.created_at > newest.created_at)) newest = m;
  }
  return newest;
}

// Woran in einem Chat gerade gespielt wird: jede aktive SMS-Szene mit Nachrichten
// und – falls vorhanden – die losen Nachrichten (scene: null). `last` ist die
// zuletzt geschriebene Nachricht des Strangs; wer sie nicht schrieb, ist dran.
export interface ChatUnit {
  chat: Chat;
  scene: ChatScene | null;
  last: ChatMessage;
}
export function chatUnits(chat: Chat, messages: ChatMessage[], scenes: ChatScene[]): ChatUnit[] {
  const mine = scenes.filter((s) => s.chat_id === chat.id);
  const known = new Set(mine.map((s) => s.id));
  const last = new Map<string, ChatMessage>();
  for (const m of messages) {
    if (m.chat_id !== chat.id || m.kind === "date") continue;
    const key = m.scene_id && known.has(m.scene_id) ? m.scene_id : "";
    const cur = last.get(key);
    if (!cur || m.created_at > cur.created_at) last.set(key, m);
  }
  const units: ChatUnit[] = [];
  for (const s of mine) {
    const l = last.get(s.id);
    if (l && s.status === "active") units.push({ chat, scene: s, last: l });
  }
  const loose = last.get("");
  if (loose) units.push({ chat, scene: null, last: loose });
  return units;
}
export const unitKey = (u: ChatUnit) => u.scene?.id ?? u.chat.id;

// Ziel eines Strangs auf dem Handy: die Szene (Anker = ihre ID) oder der Chat
export function chatHref(chatId: string, anchor?: string | null): string {
  return `/handy/${chatId}${anchor ? `#${anchor}` : ""}`;
}

// Art einer Szene für die Filter in Szenenübersicht und Timeline
export type SceneKind = "scene" | "call" | "sms";
export const SCENE_KINDS: { value: SceneKind; label: string }[] = [
  { value: "scene", label: "Szene" },
  { value: "call", label: "Anruf" },
  { value: "sms", label: "SMS" },
];
export function sceneKind(s: Pick<Scene, "chat_id" | "location_area">): SceneKind {
  return s.chat_id ? "sms" : s.location_area === PHONE_AREA ? "call" : "scene";
}
export function sceneHref(s: Pick<Scene, "id" | "chat_id">): string {
  return s.chat_id ? chatHref(s.chat_id, s.id) : `/szenen/${s.id}`;
}

// Ortsangabe einer Szene als Text: der Ortsname; ohne Ortsnamen die Gegend
// („Eden" statt „Eden (ohne Bezirk)"). Leer, wenn beides fehlt – dann entfällt
// die Angabe samt Trennpunkt.
export function scenePlace(s: Pick<Scene, "location_area" | "location_name">): string {
  const name = (s.location_name ?? "").trim();
  if (name) return name;
  if (!s.location_area) return "";
  if (s.location_area === PHONE_AREA) return PHONE_LOCATION;
  return s.location_area === EDEN_AREA ? "Eden" : areaName(s.location_area);
}

export const SMS_LOCATION = "per SMS";
// Standardtitel einer SMS-Szene: „Reece & Irina texting"
export function smsSceneTitle(people: { name: string }[]): string {
  return `${people.map((p) => p.name.split(" ")[0]).join(" & ") || "Jemand"} texting`;
}

// SMS-Szene in der Form einer Szene – damit Szenenübersicht, Timeline und Plots
// sie wie jede andere behandeln (Ort „per SMS", Beteiligte = die im Chat). Wer
// dran ist, steht in `next_up`.
export function smsAsScene(scene: ChatScene, chat: Chat, messages: ChatMessage[]): Scene {
  const own = messages.filter((m) => m.scene_id === scene.id && m.kind !== "date");
  const first = own.reduce<ChatMessage | undefined>(
    (a, m) => (!a || m.created_at < a.created_at ? m : a),
    undefined,
  );
  const last = newestMessage(own);
  return {
    id: scene.id,
    chat_id: chat.id,
    title: scene.title,
    location_area: PHONE_AREA,
    location_name: SMS_LOCATION,
    inplay_date: scene.inplay_date,
    inplay_time: first?.inplay_time ?? "",
    status: scene.status,
    trigger_warning: false,
    au: !!scene.au,
    au_name: scene.au_name ?? null,
    next_up: last ? (chat.participant_ids.find((id) => id !== last.character_id) ?? null) : null,
    created_at: scene.created_at,
    participant_ids: chat.participant_ids,
    summary: scene.summary ?? null,
  };
}

// Neueste echte Nachricht je Chat (Tagestrenner zählen nicht)
export function lastMessages(messages: ChatMessage[]): Map<string, ChatMessage> {
  const map = new Map<string, ChatMessage>();
  for (const m of messages) {
    if (m.kind === "date") continue;
    const cur = map.get(m.chat_id);
    if (!cur || m.created_at > cur.created_at) map.set(m.chat_id, m);
  }
  return map;
}

// Wer müsste antworten? Alle Beteiligten außer der Person, die zuletzt schrieb.
export function chatTurn(chat: Chat, last: ChatMessage | undefined): string[] {
  if (!last) return [];
  return chat.participant_ids.filter((id) => id !== last.character_id);
}

// Hat dieser Charakter die neueste Nachricht bewusst unbeantwortet gelassen?
// (Je Strang – SMS-Szene oder lose Nachrichten – kann eine Nachricht so markiert
// sein; mehrere stehen mit Komma getrennt.)
export function isLeftOnRead(chat: Chat, characterId: string, last: ChatMessage | undefined): boolean {
  return !!last && (chat.left_on_read?.[characterId] ?? "").split(",").includes(last.id);
}

// Archiviert ist ein Chat für alle – `archived_by` hält nur fest, wer es war.
export function isArchived(chat: Chat): boolean {
  return (chat.archived_by ?? []).length > 0;
}

// Chat-Name: eine Person mit vollem Namen, mehrere nur mit Vornamen. Mit `owner`
// gelten die Kontaktnamen dieses Handys.
export function chatTitle(
  people: (Character | undefined)[],
  owner?: Pick<Character, "phone"> | null,
): string {
  const known = people.filter(Boolean) as Character[];
  if (known.length === 0) return "Unbekannt";
  if (known.length === 1) return contactName(owner, known[0]);
  return known.map((p) => contactShortName(owner, p)).join(" & ");
}

// Wie der Chat auf dem Handy von `owner` heißt: der Gruppenname, sonst die anderen
// Beteiligten (ohne `owner`: alle).
export function chatName(
  chat: Pick<Chat, "name" | "participant_ids">,
  character: (id: string) => Character | undefined,
  owner?: Pick<Character, "id" | "phone"> | null,
): string {
  return (
    chat.name?.trim() ||
    chatTitle(
      chat.participant_ids.filter((id) => id !== owner?.id).map((id) => character(id)),
      owner,
    )
  );
}
export const isGroup = (chat: Pick<Chat, "participant_ids">) => chat.participant_ids.length > 2;

// Kurzfassung einer Nachricht (Chat-Liste, Antwort-Zitat)
export function messageSnippet(m: ChatMessage): string {
  if (m.kind === "gif") return "GIF";
  if (m.kind === "image") return "Foto";
  return m.content;
}
