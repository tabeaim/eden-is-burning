"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ageAt } from "@/lib/characters";
import { AREA_ORDER, areaName } from "@/lib/world";
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
// Geburtsdatum (daraus das Alter), Faceclaim und Wohngegend. Danach geht es ins Profil, wo
// gleich die Bearbeitung offen ist – dort wird alles Weitere ausgefüllt.
export function NewCharacterButton({ kind }: { kind: keyof typeof KINDS }) {
  const router = useRouter();
  const { addNpc, addCharacter, currentPlayer } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [faceclaim, setFaceclaim] = useState("");
  const [area, setArea] = useState("");
  const main = kind === "character";
  const ready = !!name.trim() && (!main || (!!birthdate && !!faceclaim.trim() && !!area));

  function create() {
    if (!ready || !currentPlayer) return;
    const id =
      kind === "character"
        ? addCharacter(currentPlayer.id, name, {
            area,
            faceclaim: faceclaim.trim(),
            age: ageAt({ age: null, profile: { birthdate } }),
            profile: { birthdate },
          })
        : addNpc({ name, role: null, age: null }, kind === "sc" ? "supporting" : "extra");
    router.push(`/charaktere/${id}?bearbeiten`);
    setOpen(false);
    setName("");
    setBirthdate("");
    setFaceclaim("");
    setArea("");
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
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={`${field} py-2 ${area ? "" : "text-text-tertiary"}`}
        >
          <option value="" className="bg-bg-surface">
            Wohngegend …
          </option>
          {AREA_ORDER.map((k) => (
            <option key={k} value={k} className="bg-bg-surface text-text-primary">
              {areaName(k)}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[0.8125rem] text-text-tertiary">
        Das zweite Feld ist das Geburtsdatum – daraus wird das Alter berechnet; das aktuelle
        Spieljahr ist 2021. Alles Weitere
        trägst du danach direkt im Profil ein.
      </p>
      <div className="flex items-center justify-end gap-1.5">{buttons}</div>
    </div>
  );
}
