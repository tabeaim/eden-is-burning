"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { TIER_NAMES, playsAs, tierOf } from "@/lib/characters";
import { Icon } from "./Icon";
import { SuggestInput } from "./SuggestInput";

// Einen bestehenden Supporting Character oder eine bestehende Statist*in per Namen
// suchen und ab jetzt (mit) bespielen: Man wird der Figur zugeordnet, sie steht
// danach in der eigenen Liste, im Handy-Wechsel und im „Antwort als"-Menü.
export function PlayExistingButton({ tier }: { tier: "supporting" | "extra" }) {
  const { npcs, currentPlayer, updateCharacter } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  if (!currentPlayer) return null;
  const me = currentPlayer.id;
  const query = q.trim().toLowerCase();
  const pool = npcs
    .filter((c) => tierOf(c) === tier && !playsAs(c, me) && (!query || c.name.toLowerCase().includes(query)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const label = tier === "extra" ? "Bestehende*n Statist*in bespielen" : "Bestehenden Supporting Character bespielen";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent"
      >
        <Icon name="search" size={12} /> {label}
      </button>
    );
  }
  return (
    <span className="flex w-full max-w-md flex-wrap items-center gap-1.5">
      <SuggestInput
        className="min-w-0 flex-1"
        value={q}
        onChange={setQ}
        placeholder={`${TIER_NAMES[tier]} suchen …`}
        suggestions={pool.slice(0, 8).map((c) => ({ key: c.id, label: c.name, hint: c.role ?? undefined }))}
        onPick={(id) => {
          const c = npcs.find((x) => x.id === id);
          if (c) updateCharacter(c.id, { co_owner_ids: [...(c.co_owner_ids ?? []), me] });
          setOpen(false);
          setQ("");
        }}
      />
      <button onClick={() => setOpen(false)} className="px-1 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
        Abbrechen
      </button>
    </span>
  );
}
