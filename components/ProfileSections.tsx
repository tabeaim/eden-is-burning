"use client";

import type { Character, CharacterProfile, FamilyMember } from "@/lib/types";
import {
  DEGREES,
  ageAt,
  isHidden,
  isStudent,
  isWorking,
  normalizeHeight,
  studyYearAt,
  tierOf,
  zodiacOf,
} from "@/lib/characters";
import { areaName } from "@/lib/world";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { DEFAULT_AVATAR, characterImage } from "@/lib/avatar";
import { Facts, FactRow } from "./Facts";

// Bausteine des Charakterprofils (siehe DESIGN.md): Facts mit englischen Labels,
// dazu die frei gestaltbaren Abschnitte Skills, Eigenschaften, Slider,
// Likes/Dislikes und Timeline. Leere Abschnitte fallen weg; im Profil versteckte
// Angaben (`profile.hidden`) ebenso.

// Fakten-Kategorie: Überschrift + Liste in einer dezenten Box (Label links in
// einer Flucht, Werte daneben)
function FactBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      <div className="rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-3">{children}</div>
    </section>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display lowercase text-[2rem] leading-none text-accent">{children}</h2>
  );
}

// Wert nur, wenn die Angabe nicht versteckt ist
function shown(c: Character, key: string, value: string | null | undefined): string | null {
  return value && !isHidden(c, key) ? value : null;
}

export function ProfileFacts({ c }: { c: Character }) {
  const p = c.profile ?? {};
  const age = ageAt(c);
  const year = studyYearAt(c);
  const main = tierOf(c) === "main";
  return (
    <>
      <FactBox title="facts.">
        <Facts>
          <FactRow label="Name" value={shown(c, "full_name", c.full_name) ?? c.name} />
          <FactRow label="Age" value={shown(c, "age", age != null ? `${age}` : null)} />
          <FactRow label="Zodiac" value={shown(c, "age", zodiacOf(p.birthdate)?.en)} />
          <FactRow label="Gender" value={shown(c, "gender", p.gender)} />
          <FactRow label="Residence" value={shown(c, "area", c.area ? areaName(c.area) : null)} />
          <FactRow label="Origin" value={shown(c, "origin", c.origin)} />
          <FactRow label="Status" value={shown(c, "status", c.status)} />
          <FactRow label="Sexuality" value={shown(c, "sexuality", c.sexuality)} />
          <FactRow label="Occupation" value={shown(c, "role", c.role)} />
        </Facts>
      </FactBox>

      {main && isStudent(c) && (
        <FactBox title="studies.">
          <Facts>
            <FactRow label="University" value={shown(c, "university", p.university)} />
            <FactRow label="Major" value={shown(c, "major", p.major)} />
            <FactRow label="Degree" value={shown(c, "degree", p.degree ? DEGREES[p.degree] : null)} />
            <FactRow label="Year" value={shown(c, "study_year", year != null ? `${year}` : null)} />
          </Facts>
        </FactBox>
      )}
      {main && isWorking(c) && shown(c, "employer", p.employer) && (
        <FactBox title="work.">
          <Facts>
            <FactRow label="Employer" value={p.employer} />
          </Facts>
        </FactBox>
      )}
      {/* Altbestand: Job/Company aus dem früheren Profil */}
      {!isStudent(c) && !isWorking(c) && (c.job || c.company) && (
        <FactBox title="occupation.">
          <Facts>
            <FactRow label="Job" value={c.job} />
            <FactRow label="Company" value={c.company} />
          </Facts>
        </FactBox>
      )}
    </>
  );
}

export function ProfileLooks({ c }: { c: Character }) {
  const rows = [
    ["Height", shown(c, "height", normalizeHeight(c.height))],
    ["Figure", shown(c, "figure", c.figure)],
    ["Hair", shown(c, "hair", c.hair)],
    ["Eyes", shown(c, "eyes", c.eyes)],
    ["Faceclaim", c.faceclaim],
  ] as const;
  const note = c.profile?.looks_note;
  if (!rows.some(([, v]) => v) && !note) return null;
  return (
    <FactBox title="looks.">
      {note && <p className="mb-2 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-text-secondary">{note}</p>}
      <Facts>
        {rows.map(([label, value]) => (
          <FactRow key={label} label={label} value={value} />
        ))}
      </Facts>
    </FactBox>
  );
}

// Schlagwort-Kachel (Eigenschaften, Likes, Dislikes)
function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="rounded-md bg-white/[0.08] px-2.5 py-1 text-[0.6875rem] uppercase tracking-wider text-text-primary"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

type WithProfile = { profile?: CharacterProfile | null };

export function ProfileSkills({ c }: { c: WithProfile }) {
  const skills = c.profile?.skills ?? [];
  if (skills.length === 0) return null;
  return (
    <section>
      <SectionHeading>skills.</SectionHeading>
      <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        {skills.map((s, i) => (
          <div key={i} className="contents">
            <div className="max-w-[14rem] text-right text-[0.6875rem] uppercase tracking-wider text-text-primary">
              {s.name}
            </div>
            <div className="h-5 min-w-24 bg-white/[0.12]" role="img" aria-label={`${s.name}: ${s.value} %`}>
              <div className="h-full bg-text-primary/85" style={{ width: `${Math.min(100, Math.max(0, s.value))}%` }} />
            </div>
            <div className="text-[0.6875rem] tabular-nums text-text-secondary">{s.value}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfileTraits({ c }: { c: Character }) {
  const plus = c.profile?.traits_plus ?? [];
  const minus = c.profile?.traits_minus ?? [];
  if (plus.length + minus.length === 0) return null;
  return (
    <section>
      <SectionHeading>character.</SectionHeading>
      <div className="grid gap-6 sm:grid-cols-2">
        {[
          ["+", plus],
          ["–", minus],
        ].map(([sign, items]) => (
          <div key={sign as string}>
            <div className="mb-2 text-center text-[1.5rem] leading-none text-text-primary">{sign as string}</div>
            <Tags items={items as string[]} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfileSliders({ c }: { c: WithProfile }) {
  const sliders = c.profile?.sliders ?? [];
  if (sliders.length === 0) return null;
  return (
    <section>
      <SectionHeading>sliders.</SectionHeading>
      <div className="flex flex-col gap-4">
        {sliders.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-3">
            <div className="text-right text-[0.6875rem] uppercase leading-tight tracking-wider text-text-primary">
              {s.left}
            </div>
            <div className="relative h-5" role="img" aria-label={`${s.left} – ${s.right}: ${s.value} %`}>
              <div className="absolute inset-x-0 top-1/2 h-px bg-text-primary/80" />
              <div
                className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-text-primary"
                style={{ left: `${Math.min(100, Math.max(0, s.value))}%` }}
              />
            </div>
            <div className="text-[0.6875rem] uppercase leading-tight tracking-wider text-text-primary">{s.right}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfileLikes({ c }: { c: WithProfile }) {
  const likes = c.profile?.likes ?? [];
  const dislikes = c.profile?.dislikes ?? [];
  if (likes.length + dislikes.length === 0) return null;
  return (
    <section>
      <SectionHeading>likes/dislikes.</SectionHeading>
      <div className="grid gap-6 sm:grid-cols-2">
        {(
          [
            ["❤️", "Likes", likes],
            ["💔", "Dislikes", dislikes],
          ] as const
        ).map(([icon, name, items]) => (
          <div key={name}>
            <div className="mb-2 text-center text-[1.125rem] leading-none" aria-label={name}>
              {icon}
            </div>
            <Tags items={[...items]} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfileTimeline({ c }: { c: Character }) {
  const items = c.profile?.timeline ?? [];
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading>timeline.</SectionHeading>
      <ol className="relative ml-2 border-l-2 border-white/20 pl-7">
        {items.map((t, i) => (
          <li key={i} className="relative pb-7 last:pb-0">
            <span className="absolute -left-[2.2rem] top-1.5 h-4 w-4 rounded-full bg-white/30" />
            <div className="text-[1.5rem] font-bold leading-tight text-text-primary">{t.year}</div>
            {t.title && (
              <div className="mt-1 inline-block rounded-md bg-white/[0.1] px-2 py-1 text-[0.75rem] font-bold uppercase tracking-wider text-text-primary">
                {t.title}
              </div>
            )}
            {t.text && (
              <p className="mt-2 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-text-secondary">{t.text}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// Stammbaum: Verwandte nach Generation in Reihen (oben die Ältesten), die Reihen
// durch eine Linie verbunden; der Charakter selbst steht hervorgehoben in seiner
// Generation. Neben der direkten Linie hat jede der oberen Generationen eine
// Seitenlinie: Geschwister der Großeltern, Onkel/Tanten, Cousinen/Cousins.
// Mit einem Charakter verknüpfte Einträge führen auf dessen Profil.
export const FAMILY_SLOTS: { key: string; generation: number; side: boolean; label: string }[] = [
  { key: "-2", generation: -2, side: false, label: "Großeltern" },
  { key: "-2s", generation: -2, side: true, label: "Geschwister der Großeltern" },
  { key: "-1", generation: -1, side: false, label: "Eltern" },
  { key: "-1s", generation: -1, side: true, label: "Onkel & Tanten" },
  { key: "0", generation: 0, side: false, label: "Geschwister & Partner*innen" },
  { key: "0s", generation: 0, side: true, label: "Cousinen & Cousins" },
  { key: "1", generation: 1, side: false, label: "Kinder" },
  { key: "2", generation: 2, side: false, label: "Enkel" },
];
// Platz eines Eintrags; Seitenlinien gibt es nur bis zur eigenen Generation
export const familySlotOf = (m: FamilyMember) =>
  FAMILY_SLOTS.find((x) => x.generation === m.generation && x.side === !!m.side) ??
  FAMILY_SLOTS.find((x) => x.generation === m.generation && !x.side) ??
  FAMILY_SLOTS[2];

export function ProfileFamilyTree({ c }: { c: Character }) {
  const { character } = useStore();
  const family = c.profile?.family ?? [];
  if (family.length === 0) return null;
  const generations = [...new Set(FAMILY_SLOTS.map((x) => x.generation))];
  const used = generations
    .map((gen) => ({
      gen,
      // je Generation erst die direkte Linie (in der eigenen mit dem Charakter selbst), dann die Seitenlinie
      groups: FAMILY_SLOTS.filter((x) => x.generation === gen)
        .map((slot) => {
          const members: (FamilyMember | null)[] = family.filter((m) => familySlotOf(m) === slot);
          return { slot, members: gen === 0 && !slot.side ? [null, ...members] : members };
        })
        .filter((g) => g.members.length > 0),
    }))
    .filter((r) => r.groups.length > 0);
  const card = "flex w-28 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center";
  return (
    <section>
      <SectionHeading>family tree.</SectionHeading>
      <div className="flex flex-col items-center">
        {used.map((row, i) => (
          <div key={row.gen} className="flex flex-col items-center">
            {i > 0 && <span className="h-5 w-px bg-white/25" />}
            <div className={`flex flex-wrap items-start justify-center gap-x-6 gap-y-4 pt-3 ${i > 0 ? "border-t border-white/25" : ""}`}>
              {row.groups.map(({ slot, members }) => (
                <div key={slot.key} className="flex flex-col items-center gap-2">
                  {/* Beschriftung nur, wenn in der Reihe auch die Seitenlinie steht */}
                  {row.groups.some((g) => g.slot.side) && (
                    <span className="text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                      {slot.generation === 0 && !slot.side ? "Geschwister" : slot.label}
                    </span>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {members.map((m) => {
                      if (m === null) {
                        return (
                          <div key="self" className={`${card} border-accent/70 bg-accent-soft`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={characterImage(c)} alt="" className="h-10 w-10 rounded-full object-cover" />
                            <span className="text-[0.8125rem] leading-tight text-text-primary">{c.name.split(" ")[0]}</span>
                          </div>
                        );
                      }
                      const linked = m.character_id ? character(m.character_id) : undefined;
                      const body = (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={linked ? characterImage(linked) : DEFAULT_AVATAR}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <span className="text-[0.8125rem] leading-tight text-text-primary">{m.name}</span>
                          {m.relation && (
                            <span className="text-[0.6875rem] uppercase tracking-wider text-text-tertiary">{m.relation}</span>
                          )}
                        </>
                      );
                      return linked ? (
                        <Link
                          key={m.id}
                          href={`/charaktere/${linked.id}`}
                          className={`${card} border-border-subtle bg-bg-surface hover:border-accent/50`}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div key={m.id} className={`${card} border-border-subtle bg-bg-surface`}>
                          {body}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
