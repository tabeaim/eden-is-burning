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
const smallSelect =
  "max-w-full rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.75rem] text-text-primary outline-none focus:border-white/20";
const removeBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.06] hover:text-red-300";
const addBtn =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[0.75rem] text-text-tertiary hover:border-accent/50 hover:text-accent";

// Wo steht jemand im Baum? `side` = Seitenlinie (Onkel/Tanten, Cousins …)
type Ref = { id: string; generation: number; side: boolean };

// Stammbaum bearbeiten (Profil → Bearbeiten). Zwei Beziehungsarten genügen, alles
// andere ergibt sich daraus:
//   · „Kind von" – bei jeder Person (auch beim Charakter selbst) die Eltern
//   · „Partner*in von" – unter der Person, mit Status (zusammen/getrennt/geschieden)
// Geschwister sind, wer dieselben Eltern hat; Großeltern, Onkel/Tanten und Cousins
// folgen aus der Kette. Neue Leute legt man am schnellsten über „+ Verwandte*r"
// an der Person an: Elternteil, Kind, Geschwister oder Partner*in – Platz im Baum
// und Verknüpfung ergeben sich dabei von selbst. Wählt man beim Namen einen
// vorhandenen Charakter, führt der Eintrag aufs Profil.
export function FamilyEditor({
  family,
  onChange,
  selfParents,
  onSelfParents,
  character,
  everyone,
}: {
  family: FamilyMember[];
  onChange: (next: FamilyMember[]) => void;
  selfParents: string[];
  onSelfParents: (next: string[]) => void;
  character: Character;
  everyone: Character[];
}) {
  const partnerOf = familyPartners(family);
  const selfName = character.full_name || character.name;
  const update = (id: string, patch: Partial<FamilyMember>) =>
    onChange(family.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const partnersFor = (id: string) => family.filter((x) => partnerOf.get(x.id) === id);

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
  // Wer entfernt wird, hinterlässt seine Partner*innen als gewöhnliche Einträge und
  // verschwindet aus allen „Kind von"-Angaben
  const remove = (id: string) => {
    onSelfParents(selfParents.filter((p) => p !== id));
    onChange(
      family
        .filter((m) => m.id !== id)
        .map((m) => ({
          ...m,
          partner_of: m.partner_of === id ? null : m.partner_of,
          parent_ids: m.parent_ids?.filter((p) => p !== id),
        })),
    );
  };

  // --- „Kind von" ------------------------------------------------------------
  // Mögliche Eltern: die Generation darüber. Bei Cousins die Onkel/Tanten, sonst die
  // direkte Linie; Kinder (Generation 1) können auch den Charakter selbst als Elternteil haben.
  const parentPool = (generation: number, side: boolean) => {
    const wantSide = generation === 0 ? side : false;
    const pool = family
      .filter((x) => x.generation === generation - 1 && !!x.side === wantSide && x.name.trim())
      .map((x) => ({ id: x.id, name: x.name }));
    return generation === 1 ? [{ id: "self", name: selfName }, ...pool] : pool;
  };
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const parentPills = (
    pool: { id: string; name: string }[],
    chosen: string[],
    onToggle: (id: string) => void,
    hint?: string,
  ) => {
    if (pool.length === 0 && !hint) return null;
    return (
      <div className="ml-3 flex flex-wrap items-center gap-1.5 pl-3 text-[0.75rem] text-text-tertiary">
        Kind von
        {pool.length === 0 && <span>– {hint}</span>}
        {pool.map((a) => {
          const on = chosen.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(a.id)}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                on ? "border-accent/70 bg-accent-soft text-text-primary" : "border-border-subtle hover:text-text-primary"
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    );
  };

  // --- „+ Verwandte*r" -------------------------------------------------------
  const siblingSlot = (ref: Ref) =>
    // Geschwister der Eltern/Großeltern stehen in der Seitenlinie, sonst im selben Platz
    ref.generation <= -1 && !ref.side ? { generation: ref.generation, side: true } : { generation: ref.generation, side: ref.side };
  const options = (ref: Ref): [string, string][] => {
    const g = ref.generation;
    const list: [string, string][] = [["partner", "Partner*in"]];
    if (g > -2) list.push(["parent", "Elternteil"]);
    if (g === -2 && !ref.side) {
      list.push(["child_direct", "Kind (Elternteil von " + selfName.split(" ")[0] + ")"], ["child_side", "Kind (Onkel/Tante)"]);
    } else if (g === -2) {
      list.push(["child_side", "Kind"]);
    } else if (g < 2) {
      list.push(["child", g === -1 ? (ref.side ? "Kind (Cousin*e)" : `Kind (Geschwister von ${selfName.split(" ")[0]})`) : "Kind"]);
    }
    list.push(["sibling", "Geschwister"]);
    return list;
  };
  const create = (kind: string, ref: Ref) => {
    const id = newId();
    const refParents = ref.id === "self" ? selfParents : (family.find((x) => x.id === ref.id)?.parent_ids ?? []);
    const entry: FamilyMember = {
      id,
      name: "",
      relation: "",
      generation: ref.generation,
      side: ref.side,
      character_id: null,
      partner_of: null,
    };
    let next = family;
    if (kind === "partner") {
      entry.partner_of = ref.id;
    } else if (kind === "parent") {
      entry.generation = ref.generation - 1;
      entry.side = ref.generation === 0 ? ref.side : false;
      if (ref.id === "self") onSelfParents([...selfParents, id]);
      else next = family.map((x) => (x.id === ref.id ? { ...x, parent_ids: [...(x.parent_ids ?? []), id] } : x));
    } else if (kind.startsWith("child")) {
      // Kinder der Großeltern: Elternteil des Charakters (direkte Linie) oder Onkel/Tante
      const ofGrandparent = kind === "child_direct" || kind === "child_side";
      entry.generation = ofGrandparent ? -1 : ref.generation + 1;
      entry.side = kind === "child_side" ? true : kind === "child_direct" ? false : ref.generation === -1 ? ref.side : false;
      // Kinder gehören zu beiden Eltern, wenn die Person einen Partner hat
      entry.parent_ids = [ref.id, ...partnersFor(ref.id).map((x) => x.id)];
    } else if (kind === "sibling") {
      const slot = siblingSlot(ref);
      entry.generation = slot.generation;
      entry.side = slot.side;
      if (refParents.length) entry.parent_ids = [...refParents];
    }
    onChange([...next, entry]);
  };
  const menu = (ref: Ref) => {
    const candidates = family.filter(
      (o) => o.id !== ref.id && o.name.trim() && !partnerOf.has(o.id) && !family.some((x) => partnerOf.get(x.id) === o.id),
    );
    return (
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("existing:")) attach(v.slice(9), ref.id);
          else if (v) create(v, ref);
        }}
        aria-label="Verwandte*n hinzufügen"
        className="max-w-full self-start rounded-full border border-dashed border-border-strong bg-transparent px-2.5 py-1 text-[0.75rem] text-text-tertiary outline-none hover:border-accent/50 hover:text-accent focus:border-accent/50"
      >
        <option value="" className="bg-bg-surface">
          + Verwandte*r
        </option>
        <optgroup label="Neu anlegen">
          {options(ref).map(([value, label]) => (
            <option key={value} value={value} className="bg-bg-surface">
              {label}
            </option>
          ))}
        </optgroup>
        {candidates.length > 0 && (
          <optgroup label="Vorhandene als Partner*in zuordnen">
            {candidates.map((o) => (
              <option key={o.id} value={`existing:${o.id}`} className="bg-bg-surface">
                {o.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    );
  };

  // --- Zeilen ----------------------------------------------------------------
  // Name (mit Vorschlägen) und Verhältnis nebeneinander, ✕ rechts in derselben Zeile
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

  // Partner*innen einer Person (oder des Charakters selbst) – eingerückt darunter,
  // mit Auswahl, bei wem sie stehen, und Beziehungsstatus
  const partnersBlock = (ref: Ref) => {
    const partners = partnersFor(ref.id);
    return (
      <div className={`ml-3 flex flex-col gap-2 pl-3 ${partners.length ? "border-l border-border-subtle" : ""}`}>
        {partners.map((x) => (
          <div key={x.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <span className="mt-2 text-[0.75rem] text-accent" role="img" aria-label="Partner*in">
              ♥
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              {row(x, "z. B. Ehefrau")}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <label className="flex flex-wrap items-center gap-2 text-[0.75rem] text-text-tertiary">
                  Partner*in von
                  <select
                    value={x.partner_of ?? ""}
                    onChange={(e) => attach(x.id, e.target.value || null)}
                    className={smallSelect}
                  >
                    <option value="self" className="bg-bg-surface">
                      {selfName}
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
                    className={smallSelect}
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
        {menu(ref)}
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
              <button
                onClick={() => onChange([...family, { id: newId(), name: "", relation: "", generation: slot.generation, side: slot.side, character_id: null, partner_of: null }])}
                className={addBtn}
              >
                <Icon name="plus" size={11} /> Hinzufügen
              </button>
            </div>
            {(own || members.length > 0) && (
              <div className="mt-3 flex flex-col gap-3">
                {own && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-[0.875rem] text-text-primary">
                      {selfName}
                      <span className="text-[0.75rem] text-text-tertiary">(dein Charakter)</span>
                    </div>
                    {parentPills(
                      parentPool(0, false),
                      selfParents,
                      (id) => onSelfParents(toggle(selfParents, id)),
                      "lege zuerst Eltern an",
                    )}
                    {partnersBlock({ id: "self", generation: 0, side: false })}
                  </div>
                )}
                {members.map((m) => (
                  <div key={m.id} className="flex flex-col gap-2">
                    {row(m, PLACEHOLDER[slot.key])}
                    {parentPills(
                      parentPool(m.generation, !!m.side),
                      m.parent_ids ?? [],
                      (id) => update(m.id, { parent_ids: toggle(m.parent_ids ?? [], id) }),
                      slot.key === "0s" ? "lege zuerst Onkel oder Tanten an" : undefined,
                    )}
                    {partnersBlock({ id: m.id, generation: m.generation, side: !!m.side })}
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
