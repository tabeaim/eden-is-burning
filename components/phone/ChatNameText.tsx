"use client";

import { Fragment } from "react";
import type { Character, Chat } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ownerGone } from "@/lib/characters";
import { GONE_CLASS } from "@/lib/gone";
import { contactName, contactShortName } from "@/lib/phone";

// Name eines Chats als Text (Gruppenname, sonst die anderen Beteiligten – wie
// `chatName`). Gelöschte Charaktere stehen durchgestrichen da, wie in den Szenen;
// endgültig gelöschte als „Unbekannt".
export function ChatNameText({
  chat,
  owner,
}: {
  chat: Pick<Chat, "name" | "participant_ids">;
  owner?: Pick<Character, "id" | "phone"> | null; // dessen Handy: eigene Kontaktnamen, ohne ihn selbst
}) {
  const { character, player } = useStore();
  if (chat.name?.trim()) return <>{chat.name.trim()}</>;
  const ids = chat.participant_ids.filter((id) => id !== owner?.id);
  if (ids.length === 0) return <span className={GONE_CLASS}>Unbekannt</span>;
  return (
    <>
      {ids.map((id, i) => {
        const c = character(id);
        return (
          <Fragment key={id}>
            {i > 0 && " & "}
            <span className={!c || ownerGone(c, player) ? GONE_CLASS : undefined}>
              {!c ? "Unbekannt" : ids.length === 1 ? contactName(owner, c) : contactShortName(owner, c)}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}
