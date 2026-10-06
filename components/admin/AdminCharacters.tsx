"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TIER_NAMES, tierOf, type Tier } from "@/lib/characters";
import { characterImage } from "@/lib/avatar";
import { CharacterBasicsForm } from "../CharacterBasicsForm";
import { ProfileEditPanel } from "../ProfileEditPanel";
import { PhoneSettings } from "../phone/PhoneSettings";
import { MultiSelect } from "../MultiSelect";
import { ConfirmDialog } from "../ConfirmDialog";
import type { Character } from "@/lib/types";
import { btnDanger, btnPrimary, field, hint, pill, row } from "./ui";

type Mode = "profile" | "basics" | "phone" | "owners";

// Charaktere einer Stufe verwalten: Grunddaten, Profil, Handy, Besitzer*innen und
// Stufe ändern, in den Papierkorb legen – auch die der anderen. Fremde Profile
// bearbeitet man ausschließlich hier; im Profil selbst nur die eigenen.
export function AdminCharacters({ tier }: { tier: Tier }) {
  const { characters, npcs, players, player, addCharacter, addNpc, updateCharacter, trashCharacter } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ id: string; mode: Mode } | null>(null);
  const [ask, setAsk] = useState<{ title: string; text: string; label: string; run: () => void } | null>(null);
  const [newName, setNewName] = useState("");
  const [newOwner, setNewOwner] = useState(players[0]?.id ?? "");

  const list = [...characters, ...npcs]
    .filter((c) => tierOf(c) === tier && !c.deleted_at)
    .filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const names = (ids: string[]) => ids.map((id) => player(id)?.username).filter(Boolean).join(", ");

  function create() {
    const name = newName.trim();
    if (!name) return;
    if (tier === "main") {
      if (newOwner) addCharacter(newOwner, name);
    } else {
      const id = addNpc({ name, role: null, age: null }, tier);
      // Besitzer*in festlegen (ohne Angabe bleibt der/die Admin eingetragen)
      if (tier === "supporting" && newOwner) updateCharacter(id, { player_id: newOwner, co_owner_ids: [] });
    }
    setNewName("");
  }

  const changeTier = (c: Character, to: Tier) =>
    setAsk({
      title: `${c.name} zum ${TIER_NAMES[to]} machen?`,
      text:
        to === "main"
          ? "Der Charakter bekommt das volle Profil und gehört danach nur noch der Person, die unter „Besitzer*in“ steht. Weitere Zuordnungen entfallen."
          : to === "supporting"
            ? "Der Charakter wird zur Nebenfigur, die nur den Zugeordneten gehört."
            : "Der Charakter wird zur Statist*in, die alle bearbeiten und zeitweise bespielen können.",
      label: `Zum ${TIER_NAMES[to]} machen`,
      run: () =>
        updateCharacter(c.id, {
          is_npc: to !== "main",
          npc_tier: to === "main" ? null : to,
          co_owner_ids: to === "main" ? [] : (c.co_owner_ids ?? []),
        }),
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${TIER_NAMES[tier]} suchen …`}
          className={`${field} max-w-xs`}
        />
        <span className={hint}>
          {list.length} {list.length === 1 ? "Eintrag" : "Einträge"}
        </span>
      </div>

      {list.map((c) => {
        const mode = open?.id === c.id ? open.mode : null;
        const toggle = (m: Mode) => setOpen(mode === m ? null : { id: c.id, mode: m });
        const owner = player(c.player_id)?.username;
        return (
          <div key={c.id} className={row}>
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterImage(c)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover bg-bg-primary" />
              <div className="min-w-0 flex-1">
                <Link href={`/charaktere/${c.id}`} className="text-[0.875rem] text-text-primary hover:text-accent">
                  {c.name}
                </Link>
                <div className="truncate text-[0.8125rem] text-text-tertiary">
                  {tier === "extra"
                    ? (c.co_owner_ids ?? []).length
                      ? `bespielt von ${names(c.co_owner_ids ?? [])}`
                      : "wird gerade nicht bespielt"
                    : `von ${[owner, ...(c.co_owner_ids ?? []).map((id) => player(id)?.username)].filter(Boolean).join(", ") || "–"}`}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => toggle("profile")} className={pill(mode === "profile")}>
                  Profil
                </button>
                <button onClick={() => toggle("basics")} className={pill(mode === "basics")}>
                  Grunddaten
                </button>
                {tier !== "extra" && (
                  <button onClick={() => toggle("phone")} className={pill(mode === "phone")}>
                    Handy
                  </button>
                )}
                <button onClick={() => toggle("owners")} className={pill(mode === "owners")}>
                  Besitz & Stufe
                </button>
              </div>
            </div>

            {mode && (
              <div className="border-t border-border-subtle p-3 sm:p-4">
                {mode === "profile" && <ProfileEditPanel character={c} onClose={() => setOpen(null)} />}
                {mode === "basics" && <CharacterBasicsForm character={c} />}
                {mode === "phone" && <PhoneSettings character={c} reduced={tier === "supporting"} />}
                {mode === "owners" && (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-[0.8125rem] text-text-secondary">
                        {tier === "extra" ? "Angelegt von" : "Besitzer*in"}
                        <select
                          value={c.player_id}
                          onChange={(e) => updateCharacter(c.id, { player_id: e.target.value })}
                          className={`mt-1 ${field}`}
                        >
                          {players.map((p) => (
                            <option key={p.id} value={p.id} className="bg-bg-surface">
                              {p.username}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[0.8125rem] text-text-secondary">
                        Stufe
                        <select
                          value={tier}
                          onChange={(e) => changeTier(c, e.target.value as Tier)}
                          className={`mt-1 ${field}`}
                        >
                          {(Object.keys(TIER_NAMES) as Tier[]).map((t) => (
                            <option key={t} value={t} className="bg-bg-surface">
                              {TIER_NAMES[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {tier !== "main" && (
                      <div className="flex flex-wrap items-center gap-3">
                        <MultiSelect
                          label={tier === "extra" ? "Bespielt von" : "Weitere Spieler*innen"}
                          icon="users"
                          options={players.filter((p) => tier === "extra" || p.id !== c.player_id).map((p) => ({ value: p.id, label: p.username }))}
                          selected={c.co_owner_ids ?? []}
                          onToggle={(id) => {
                            const cur = c.co_owner_ids ?? [];
                            updateCharacter(c.id, { co_owner_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
                          }}
                          onClear={() => updateCharacter(c.id, { co_owner_ids: [] })}
                        />
                        <span className="text-[0.8125rem] text-text-secondary">{names(c.co_owner_ids ?? [])}</span>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          setAsk({
                            title: `${c.name} in den Papierkorb legen?`,
                            text: "Der Charakter verschwindet aus allen Listen, bleibt aber erhalten und lässt sich im Papierkorb wiederherstellen.",
                            label: "In den Papierkorb",
                            run: () => trashCharacter(c.id),
                          })
                        }
                        className={btnDanger}
                      >
                        In den Papierkorb
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Neu anlegen */}
      <div className="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-3">
        <label className="min-w-40 flex-1 text-[0.8125rem] text-text-secondary">
          Neu: Name
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`mt-1 ${field}`} />
        </label>
        {tier !== "extra" && (
          <label className="text-[0.8125rem] text-text-secondary">
            für
            <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className={`mt-1 ${field}`}>
              {players.map((p) => (
                <option key={p.id} value={p.id} className="bg-bg-surface">
                  {p.username}
                </option>
              ))}
            </select>
          </label>
        )}
        <button onClick={create} disabled={!newName.trim()} className={btnPrimary}>
          Anlegen
        </button>
        <span className={`${hint} basis-full`}>Profil und Details füllst du danach über „Profil“ und „Grunddaten“ aus.</span>
      </div>

      {ask && (
        <ConfirmDialog
          title={ask.title}
          text={ask.text}
          confirmLabel={ask.label}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            ask.run();
            setAsk(null);
          }}
        />
      )}
    </div>
  );
}
