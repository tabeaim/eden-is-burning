"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ageAt } from "@/lib/characters";
import { DatePicker } from "./DatePicker";
import { Icon } from "./Icon";

const KINDS = {
  character: { label: "Neuer Main Character", placeholder: "Anzeigename …" },
  sc: { label: "Neuer Supporting Character", placeholder: "Name des Supporting Characters …" },
  extra: { label: "Neue*r Statist*in", placeholder: "Name der Statist*in …" },
} as const;

const field =
  "bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

// „Neu anlegen" für alle drei Stufen: gestrichelte Pill (siehe DESIGN.md), die erst
// die Pflichtangaben abfragt – ohne sie wird nichts angelegt. Supporting
// Characters und Statist*innen brauchen nur einen Namen; ein Main Character dazu
// Geburtsdatum (daraus das Alter), Faceclaim und Beschäftigung. Danach geht es in
// den Editor (Main/Supporting Character) bzw. ins Profil (Statist*in).
export function NewCharacterButton({ kind }: { kind: keyof typeof KINDS }) {
  const router = useRouter();
  const { addNpc, addCharacter, currentPlayer } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [faceclaim, setFaceclaim] = useState("");
  const [role, setRole] = useState("");
  const main = kind === "character";
  const ready = !!name.trim() && (!main || (!!birthdate && !!faceclaim.trim() && !!role.trim()));

  function create() {
    if (!ready || !currentPlayer) return;
    if (kind === "extra") {
      router.push(`/charaktere/${addNpc({ name, role: null, age: null }, "extra")}`);
    } else if (kind === "sc") {
      router.push(`/einstellungen#charakter-${addNpc({ name, role: null, age: null }, "supporting")}`);
    } else {
      const profile = { birthdate };
      const id = addCharacter(currentPlayer.id, name, {
        faceclaim: faceclaim.trim(),
        role: role.trim(),
        age: ageAt({ age: null, profile }),
        profile,
      });
      router.push(`/einstellungen#charakter-${id}`);
    }
    setOpen(false);
    setName("");
    setBirthdate("");
    setFaceclaim("");
    setRole("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent"
      >
        <Icon name="plus" size={12} /> {KINDS[kind].label}
      </button>
    );
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") create();
    if (e.key === "Escape") setOpen(false);
  };
  const buttons = (
    <>
      <button
        onClick={create}
        disabled={!ready}
        className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-2 py-1 disabled:opacity-40"
      >
        Anlegen
      </button>
      <button onClick={() => setOpen(false)} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-1">
        Abbrechen
      </button>
    </>
  );

  if (!main) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKey}
          placeholder={KINDS[kind].placeholder}
          autoFocus
          className={`${field} w-56 max-w-full`}
        />
        {buttons}
      </span>
    );
  }
  return (
    <div className="flex w-full max-w-xl flex-col gap-2 self-start rounded-xl border border-border-subtle bg-bg-surface p-3 text-left">
      <div className="text-[0.8125rem] text-text-secondary">
        Neuer Main Character <span className="text-text-tertiary">– alle vier Angaben sind Pflicht</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKey}
          placeholder="Anzeigename"
          autoFocus
          className={`${field} py-2`}
        />
        <DatePicker value={birthdate} onChange={setBirthdate} />
        <input
          value={faceclaim}
          onChange={(e) => setFaceclaim(e.target.value)}
          onKeyDown={onKey}
          placeholder="Faceclaim"
          className={`${field} py-2`}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={onKey}
          placeholder="Beschäftigung"
          className={`${field} py-2`}
        />
      </div>
      <p className="text-[0.8125rem] text-text-tertiary">
        Das zweite Feld ist das Geburtsdatum – daraus wird das Alter berechnet.
      </p>
      <div className="flex items-center justify-end gap-1.5">{buttons}</div>
    </div>
  );
}
