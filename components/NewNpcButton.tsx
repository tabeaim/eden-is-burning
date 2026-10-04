"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// „Neuen NPC anlegen": fragt nur den Namen (und optional die Rolle) ab und führt
// danach ins Profil, wo sich der Rest ausfüllen lässt. Gestrichelte Pill wie
// überall bei „Neu anlegen" (siehe DESIGN.md) mit `pill`, sonst die breite Kachel
// der Einstellungen.
export function NewNpcButton({ pill = false }: { pill?: boolean }) {
  const router = useRouter();
  const { addNpc } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  function create() {
    if (!name.trim()) return;
    const id = addNpc({ name, role: role.trim() || null, age: null });
    router.push(`/charaktere/${id}`);
  }

  const field =
    "min-w-0 flex-1 bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          pill
            ? "flex items-center gap-1 rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent"
            : "flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-4 text-[0.8125rem] text-text-secondary hover:text-text-primary hover:border-white/30 transition-colors"
        }
      >
        <Icon name="plus" size={pill ? 12 : 16} /> {pill ? "Neuer NPC" : "Neuen NPC anlegen"}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="Name des NPCs"
        autoFocus
        className={field}
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="Rolle (optional), z. B. Türsteher"
        className={field}
      />
      <button
        onClick={() => setOpen(false)}
        className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
      >
        Abbrechen
      </button>
      <button
        onClick={create}
        disabled={!name.trim()}
        className="rounded-md bg-accent/90 px-3 py-1.5 text-[0.8125rem] font-medium text-black hover:bg-accent disabled:opacity-40"
      >
        Anlegen
      </button>
    </div>
  );
}
