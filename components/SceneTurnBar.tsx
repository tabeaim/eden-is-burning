import type { Character } from "@/lib/types";
import { CharacterBubble } from "./Bubble";
import { Icon } from "./Icon";

// Teilnehmende Charaktere als Bubbles; der Charakter, der am Zug ist, wird mit
// Akzent-Ring + Flamme markiert (wie in der Szenenansicht). Bewusst ohne Links,
// damit es innerhalb einer verlinkten Karte gültig ist.
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
        return (
          <CharacterBubble
            key={c.id}
            character={c}
            linked={false}
            firstNameOnly={firstNameOnly}
            tone={isTurn ? "accent" : undefined}
            trailing={isTurn && <Icon name="flame" size={12} className="text-accent" />}
          />
        );
      })}
    </div>
  );
}
