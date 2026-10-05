// Messenger-Logik, die Handy und Dashboard teilen.
import type { Character, Chat, ChatMessage } from "./types";
import { contactName, contactShortName } from "./phone";

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
export function isLeftOnRead(chat: Chat, characterId: string, last: ChatMessage | undefined): boolean {
  return !!last && chat.left_on_read?.[characterId] === last.id;
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

// Kurzfassung einer Nachricht (Chat-Liste, Antwort-Zitat)
export function messageSnippet(m: ChatMessage): string {
  if (m.kind === "gif") return "GIF";
  if (m.kind === "image") return "Foto";
  return m.content;
}
