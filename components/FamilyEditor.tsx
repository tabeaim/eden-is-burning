"use client";

import type { Character, FamilyMember } from "@/lib/types";
import { FAMILY_SLOTS, familyPartners } from "./ProfileSections";
import { SuggestInput } from "./SuggestInput";
import { Icon } from "./Icon";

const newId = () => `fam_${Math.random().toString(36).slice(2, 9)}`;
const PLACEHOLDER: Record<string, string> = {
  "-2": "z. B. Großmutter",
  "-2s": "z. B. Großonkel",
  "-1": "z. B. Mutter",
  "-1s": "z. B. Tante",
  "0": "z. B. Bruder",
  "0s": "z. B. Cousine",
  "1": "z. B. Tochter",
  "2": "z. B. Enkelin",
};
const TITLE: Record<string, string> = { "0": "Du & Geschwister" };

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";
const removeBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.06] hover:text-red-300";
const addBtn =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[0.75rem] text-text-tertiary hover:border-accent/50 hover:text-accent";

// Stammbaum bearbeiten (Profil → Bearbeiten): ein Kasten je Generation bzw.
// Seitenlinie, darin die Verwandten. Partner*innen und Angeheiratete legt man
// direkt unter ihrer Person an („+ Partner*in") – im Stammbaum stehen sie dann
// daneben. Wählt man beim Namen einen vorhandenen Charakter, führt der Eintrag
// aufs Profil.
export function FamilyEditor({
  family,
  onChange,
  character,
  everyone,
}: {
  family: FamilyMember[];
  onChange: (next: FamilyMember[]) => void;
  character: Character;
  everyone: Character[];
}) {
  const partnerOf = familyPartners(family);
  const update = (id: string, patch: Partial<FamilyMember>) =>
    onChange(family.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  // `id` wird Partner*in von `target` (Person oder „self"). Das Ziel wird dabei zur
  // Hauptperson (keine Ketten), und wer bisher an `id` hing, wird wieder ein
  // gewöhnlicher Eintrag.
  const attach = (id: string, target: string | null) =>
    onChange(
      family.map((m) => {
        if (m.id === id) return { ...m, partner_of: target };
        if (m.id === target || m.partner_of === id) return { ...m, partner_of: null };
        return m;
      }),
    );
  // Wer entfernt wird, hinterlässt seine Partner*innen als gewöhnliche Einträge
  // und verschwindet aus den „Kind von"-Angaben
  const remove = (id: string) =>
    onChange(
      family
        .filter((m) => m.id !== id)
        .map((m) => ({
          ...m,
          partner_of: m.partner_of === id ? null : m.partner_of,
          parent_ids: m.parent_ids?.filter((p) => p !== id),
        })),
    );
  // Onkel/Tanten (samt angeheirateten) – die Eltern der Cousinen und Cousins
  const aunts = family.filter((m) => m.generation === -1 && m.side && m.name.trim());
  const add = (patch: Partial<FamilyMember>) =>
    onChange([...family, { id: newId(), name: "", relation: "", generation: -1, character_id: null, partner_of: null, ...patch }]);

  // Eine Zeile: Name (mit Vorschlägen) und Verhältnis nebeneinander, ✕ rechts
  const row = (m: FamilyMember, placeholder: string) => {
    const q = m.name.trim().toLowerCase();
    return (
      <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          <SuggestInput
            value={m.name}
            placeholder="Name"
            onChange={(value) =>
              update(m.id, {
                name: value,
                character_id: everyone.find((c) => c.name.toLowerCase() === value.trim().toLowerCase())?.id ?? null,
              })
            }
            suggestions={everyone
              .filter((c) => q && c.name.toLowerCase().includes(q))
              .slice(0, 6)
              .map((c) => ({ key: c.id, label: c.name, hint: c.role ?? undefined }))}
            onPick={(id) => {
              const c = everyone.find((x) => x.id === id);
              if (c) update(m.id, { name: c.name, character_id: c.id });
            }}
          />
          <input
            value={m.relation}
            onChange={(e) => update(m.id, { relation: e.target.value })}
            placeholder={placeholder}
            aria-label="Verhältnis"
            className={field}
          />
        </div>
        <button onClick={() => remove(m.id)} aria-label="Eintrag entfernen" className={removeBtn}>
          ✕
        </button>
      </div>
    );
  };

  // Partner*innen einer Person (oder des Charakters selbst) – eingerückt darunter
  const partnersBlock = (target: string, at: { generation: number; side?: boolean }) => {
    const partners = family.filter((x) => partnerOf.get(x.id) === target);
    return (
      <div className={`ml-3 flex flex-col gap-2 pl-3 ${partners.length ? "border-l border-border-subtle" : ""}`}>
        {partners.map((x) => (
          <div key={x.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <span className="mt-2 text-[0.75rem] text-accent" role="img" aria-label="Partner*in">
              ♥
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              {row(x, "z. B. Ehefrau")}
              {/* umhängen: bei wem steht sie/er im Stammbaum? */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="flex flex-wrap items-center gap-2 text-[0.75rem] text-text-tertiary">
                Partner*in von
                <select
                  value={x.partner_of ?? ""}
                  onChange={(e) => attach(x.id, e.target.value || null)}
                  className="max-w-full rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.75rem] text-text-primary outline-none focus:border-white/20"
                >
                  <option value="self" className="bg-bg-surface">
                    {character.full_name || character.name}
                  </option>
                  {family
                    .filter((o) => o.id !== x.id && o.name.trim() && !partnerOf.has(o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id} className="bg-bg-surface">
                        {o.name}
                      </option>
                    ))}
                  <option value="" className="bg-bg-surface">
                    niemand (normaler Eintrag)
                  </option>
                </select>
              </label>
              <label className="flex flex-wrap items-center gap-2 text-[0.75rem] text-text-tertiary">
                Status
                <select
                  value={x.partner_status ?? ""}
                  onChange={(e) => update(x.id, { partner_status: (e.target.value || null) as FamilyMember["partner_status"] })}
                  className="max-w-full rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.75rem] text-text-primary outline-none focus:border-white/20"
                >
                  <option value="" className="bg-bg-surface">
                    zusammen / verheiratet
                  </option>
                  <option value="separated" className="bg-bg-surface">
                    getrennt
                  </option>
                  <option value="divorced" className="bg-bg-surface">
                    geschieden
                  </option>
                </select>
              </label>
              </div>
            </div>
          </div>
        ))}
        {/* neue Person anlegen – oder eine vorhandene Zeile als Partner*in zuordnen */}
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "new") add({ partner_of: target, generation: at.generation, side: at.side });
            else if (v) attach(v, target);
          }}
          aria-label="Partner*in hinzufügen"
          className="max-w-full self-start rounded-full border border-dashed border-border-strong bg-transparent px-2.5 py-1 text-[0.75rem] text-text-tertiary outline-none hover:border-accent/50 hover:text-accent focus:border-accent/50"
        >
          <option value="" className="bg-bg-surface">
            + Partner*in
          </option>
          <option value="new" className="bg-bg-surface">
            Neue Person anlegen
          </option>
          {family
            .filter(
              (o) =>
                o.id !== target &&
                o.name.trim() &&
                !partnerOf.has(o.id) &&
                !family.some((x) => partnerOf.get(x.id) === o.id),
            )
            .map((o) => (
              <option key={o.id} value={o.id} className="bg-bg-surface">
                {o.name} (vorhanden)
              </option>
            ))}
        </select>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {FAMILY_SLOTS.map((slot) => {
        const members = family.filter(
          (m) => !partnerOf.has(m.id) && (m.generation === slot.generation ? !!m.side === slot.side : false),
        );
        const own = slot.key === "0";
        return (
          <div key={slot.key} className="rounded-lg border border-border-subtle p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.8125rem] font-medium text-text-primary">{TITLE[slot.key] ?? slot.label}</span>
              <button onClick={() => add({ generation: slot.generation, side: slot.side })} className={addBtn}>
                <Icon name="plus" size={11} /> Hinzufügen
              </button>
            </div>
            {(own || members.length > 0) && (
              <div className="mt-3 flex flex-col gap-3">
                {own && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-[0.875rem] text-text-primary">
                      {character.full_name || character.name}
                      <span className="text-[0.75rem] text-text-tertiary">(dein Charakter)</span>
                    </div>
                    {partnersBlock("self", { generation: 0 })}
                  </div>
                )}
                {members.map((m) => (
                  <div key={m.id} className="flex flex-col gap-2">
                    {row(m, PLACEHOLDER[slot.key])}
                    {/* Cousinen und Cousins: mit ihren Eltern (Onkel/Tanten) verbinden */}
                    {slot.key === "0s" && (
                      <div className="ml-3 flex flex-wrap items-center gap-1.5 pl-3 text-[0.75rem] text-text-tertiary">
                        Kind von
                        {aunts.length === 0 && <span>– lege zuerst Onkel oder Tanten an</span>}
                        {aunts.map((a) => {
                          const on = (m.parent_ids ?? []).includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                update(m.id, {
                                  parent_ids: on
                                    ? (m.parent_ids ?? []).filter((id) => id !== a.id)
                                    : [...(m.parent_ids ?? []), a.id],
                                })
                              }
                              className={`rounded-full border px-2 py-0.5 transition-colors ${
                                on
                                  ? "border-accent/70 bg-accent-soft text-text-primary"
                                  : "border-border-subtle hover:text-text-primary"
                              }`}
                            >
                              {a.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {partnersBlock(m.id, { generation: m.generation, side: m.side })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
