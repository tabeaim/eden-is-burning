import type { Character } from "@/lib/types";
import { Icon } from "./Icon";

// Teilnehmende Charaktere als Pills; der Charakter, der am Zug ist, wird mit
// Akzent-Ring + Flamme markiert (wie in der Szenenansicht). Rendert bewusst
// <span> (keine Links), damit es innerhalb einer verlinkten Karte gültig ist.
export function SceneTurnBar({
  participants,
  activeCharId,
  active,
  firstNameOnly = false,
}: {
  participants: Character[];
  activeCharId: string | null;
  active: boolean;
  firstNameOnly?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {participants.map((c) => {
        const isTurn = active && c.id === activeCharId;
        const name = firstNameOnly ? c.name.split(" ")[0] : c.name;
        return (
          <span
            key={c.id}
            title={isTurn ? `${c.name} · am Zug` : c.name}
            className={`flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-0.5 text-[0.8125rem] ${
              isTurn
                ? "border-accent/70 bg-accent-soft text-text-primary"
                : "border-border-subtle bg-bg-primary text-text-secondary"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              className={`w-5 h-5 rounded-full object-cover ${
                isTurn ? "ring-2 ring-accent" : ""
              }`}
            />
            {name}
            {isTurn && <Icon name="flame" size={12} className="text-accent" />}
          </span>
        );
      })}
    </div>
  );
}
