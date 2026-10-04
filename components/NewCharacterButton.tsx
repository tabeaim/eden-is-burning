"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// „Neuer Charakter" / „Neuer NPC": gestrichelte Pill (siehe DESIGN.md), die erst
// den Namen abfragt – ohne Namen wird nichts angelegt. Danach geht es in den
// Editor (Charakter) bzw. ins Profil (NPC), wo sich der Rest ausfüllen lässt.
export function NewCharacterButton({ kind }: { kind: "character" | "npc" }) {
  const router = useRouter();
  const { addNpc, addCharacter, currentPlayer } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const npc = kind === "npc";

  function create() {
    if (!name.trim() || !currentPlayer) return;
    if (npc) {
      router.push(`/charaktere/${addNpc({ name, role: null, age: null })}`);
    } else {
      router.push(`/einstellungen#charakter-${addCharacter(currentPlayer.id, name)}`);
    }
    setOpen(false);
    setName("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent"
      >
        <Icon name="plus" size={12} /> {npc ? "Neuer NPC" : "Neuer Charakter"}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={npc ? "Name des NPCs …" : "Name des Charakters …"}
        autoFocus
        className="w-48 max-w-full bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
      />
      <button
        onClick={create}
        disabled={!name.trim()}
        className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
      >
        Anlegen
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1"
      >
        Abbrechen
      </button>
    </span>
  );
}
