"use client";

import type { Character, CharacterProfile, FamilyMember } from "@/lib/types";
import {
  DEGREES,
  TIER_NAMES,
  ageAt,
  isHidden,
  isStudent,
  isWorking,
  normalizeHeight,
  studyYearAt,
  tierOf,
  zodiacOf,
} from "@/lib/characters";
import { AREA_ORDER, AREAS, areaName } from "@/lib/world";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { DEFAULT_AVATAR, characterImage } from "@/lib/avatar";
import { Facts, FactRow } from "./Facts";
import { Bubble, LocationBubble } from "./Bubble";
import { Icon } from "./Icon";

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
  const { locations, scenes } = useStore();
  const p = c.profile ?? {};
  const age = ageAt(c);
  const year = studyYearAt(c);
  const full = tierOf(c) !== "extra";

  // Arbeitsplatz und Uni stehen in eigenen Zeilen unter der Beschäftigung.
  // Gibt es den Ort im Verzeichnis, steht er als Pilltag (Link aufs Ortsprofil);
  // ebenso eine Gegend (Byron University ist Gegend und Arbeitsplatz zugleich).
  const place = (name: string | null | undefined, id?: string | null) => {
    if (!name) return null;
    const q = name.trim().toLowerCase();
    const loc =
      (id ? locations.find((l) => l.id === id) : undefined) ?? locations.find((l) => l.name.toLowerCase() === q);
    if (loc) {
      const played = scenes.some((s) => s.location_area === loc.area && s.location_name === loc.name);
      return <LocationBubble key={loc.id} id={loc.id} name={loc.name} played={played} />;
    }
    const area = AREA_ORDER.find((k) => AREAS[k].name.toLowerCase() === q);
    if (area) {
      return (
        <Bubble
          key={area}
          href={`/orte?area=${area}`}
          leading={
            <span className="flex h-5 w-5 items-center justify-center text-accent">
              <Icon name="map" size={13} />
            </span>
          }
        >
          {AREAS[area].name}
        </Bubble>
      );
    }
    return <span key={name}>{name}</span>;
  };
  const role = shown(c, "role", c.role) ?? (c.job || null);
  const workplace =
    full && isWorking(c)
      ? place(shown(c, "employer", p.employer), p.employer_location_id)
      : // Altbestand: Company aus dem früheren Profil
        !isStudent(c) && !isWorking(c)
        ? place(c.company)
        : null;
  const university = full && isStudent(c) ? place(shown(c, "university", p.university)) : null;
  const studies =
    full && isStudent(c)
      ? [
          shown(c, "major", p.major),
          shown(c, "degree", p.degree ? DEGREES[p.degree] : null),
          shown(c, "study_year", year != null ? `Year ${year}` : null),
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  // Supporting Characters und Statist*innen tragen ihre Art als „Role"
  const tier = tierOf(c);
  const groups: [string, [string, React.ReactNode][]][] = [
    [
      "identity.",
      [
        ["Name", shown(c, "full_name", c.full_name) ?? c.name],
        ["Age", shown(c, "age", age != null ? `${age}` : null)],
        ["Zodiac", shown(c, "age", zodiacOf(p.birthdate)?.en)],
        ["Gender", shown(c, "gender", p.gender)],
        ["Role", tier === "main" ? null : TIER_NAMES[tier]],
      ],
    ],
    [
      "life.",
      [
        ["Residence", shown(c, "area", c.area ? areaName(c.area) : null)],
        ["Origin", shown(c, "origin", c.origin)],
        ["Status", shown(c, "status", c.status)],
        ["Sexuality", shown(c, "sexuality", c.sexuality)],
      ],
    ],
    [
      "occupation.",
      [
        ["Occupation", role],
        ["Workplace", workplace],
        ["University", university],
        ["Studies", studies],
      ],
    ],
  ];
  return (
    <>
      {groups.map(([title, rows]) =>
        rows.some(([, v]) => v !== null && v !== undefined && v !== "") ? (
          // die Beschäftigung braucht mit Ort die ganze Breite
          <div key={title} className={title === "occupation." ? "sm:col-span-2" : ""}>
            <FactBox title={title}>
              <Facts>
                {rows.map(([label, value]) => (
                  <FactRow key={label} label={label} value={value} />
                ))}
              </Facts>
            </FactBox>
          </div>
        ) : null,
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

export function ProfileTimeline({ c, bare = false }: { c: Character; bare?: boolean }) {
  const items = c.profile?.timeline ?? [];
  if (items.length === 0) return null;
  return (
    <section>
      {!bare && <SectionHeading>timeline.</SectionHeading>}
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
  { key: "0", generation: 0, side: false, label: "Geschwister" },
  { key: "0s", generation: 0, side: true, label: "Cousinen & Cousins" },
  { key: "1", generation: 1, side: false, label: "Kinder" },
  { key: "2", generation: 2, side: false, label: "Enkel" },
];
// Platz eines Eintrags; Seitenlinien gibt es nur bis zur eigenen Generation
export const familySlotOf = (m: FamilyMember) =>
  FAMILY_SLOTS.find((x) => x.generation === m.generation && x.side === !!m.side) ??
  FAMILY_SLOTS.find((x) => x.generation === m.generation && !x.side) ??
  FAMILY_SLOTS[2];

// Wer ist wessen Partner*in? (Eintrag-id -> id der Person bzw. „self"). Nur
// Angaben, die auf den Charakter selbst oder auf eine Person zeigen, die selbst
// kein*e Partner*in ist, gelten – alles andere (verwaiste Verweise, Ketten,
// Kreise) wird zum gewöhnlichen Eintrag, damit nie jemand verschwindet.
export function familyPartners(family: FamilyMember[]): Map<string, string> {
  const ids = new Set(family.map((m) => m.id));
  const plausible = (m: FamilyMember) =>
    m.partner_of === "self" || (!!m.partner_of && m.partner_of !== m.id && ids.has(m.partner_of));
  const roots = new Set(family.filter((m) => !plausible(m)).map((m) => m.id));
  const out = new Map<string, string>();
  for (const m of family) {
    if (m.partner_of === "self" || (m.partner_of && m.partner_of !== m.id && roots.has(m.partner_of))) {
      out.set(m.id, m.partner_of);
    }
  }
  return out;
}

// Räumt Altlasten auf: Angaben, die laut `familyPartners` nicht gelten (Ketten,
// Kreise, verwaiste Verweise), werden zu gewöhnlichen Einträgen.
export function normalizeFamily(family: FamilyMember[]): FamilyMember[] {
  const valid = familyPartners(family);
  return family.map((m) => (m.partner_of && valid.get(m.id) !== m.partner_of ? { ...m, partner_of: null } : m));
}

export function ProfileFamilyTree({ c }: { c: Character }) {
  const { character } = useStore();
  const family = c.profile?.family ?? [];
  if (family.length === 0) return null;
  // Angeheiratete/Partner*innen stehen direkt neben ihrer Person (verbunden
  // durch ein Herz) statt als eigener Eintrag in der Reihe – so sind sie von
  // Geschwistern zu unterscheiden.
  const partnerOf = familyPartners(family);
  const partnersOf = (id: string) => family.filter((m) => partnerOf.get(m.id) === id);
  const generations = [...new Set(FAMILY_SLOTS.map((x) => x.generation))];
  const used = generations
    .map((gen) => ({
      gen,
      // je Generation erst die direkte Linie (in der eigenen mit dem Charakter selbst), dann die Seitenlinie
      groups: FAMILY_SLOTS.filter((x) => x.generation === gen)
        .map((slot) => {
          const members: (FamilyMember | null)[] = family.filter((m) => !partnerOf.has(m.id) && familySlotOf(m) === slot);
          return { slot, members: gen === 0 && !slot.side ? [null, ...members] : members };
        })
        .filter((g) => g.members.length > 0),
    }))
    .filter((r) => r.groups.length > 0);

  // Eine Generation bleibt immer in EINER Zeile: Die Karten schrumpfen, wenn der
  // Platz knapp wird (Handy), und sind am Desktop auf eine Höchstbreite begrenzt.
  const CARD = 10.5; // rem je Karte inkl. Abstand, bestimmt die Höchstbreite
  const card =
    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-3";
  const face = "aspect-square w-3/5 max-w-16 rounded-full object-cover sm:w-16";
  const name = "w-full break-words text-[0.6875rem] leading-tight text-text-primary sm:text-[0.875rem]";
  const tag = "w-full break-words text-[0.5625rem] uppercase tracking-wider text-text-tertiary sm:text-[0.6875rem]";

  const memberCard = (m: FamilyMember) => {
    const linked = m.character_id ? character(m.character_id) : undefined;
    const body = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={linked ? characterImage(linked) : DEFAULT_AVATAR} alt="" className={face} />
        <span className={name}>{m.name}</span>
        {m.relation && <span className={tag}>{m.relation}</span>}
        {/* angelegte Supporting Characters und Statist*innen als solche kennzeichnen */}
        {linked?.is_npc && (
          <span className="rounded-full border border-border-subtle px-1.5 py-px text-[0.5rem] uppercase tracking-wider text-text-secondary sm:text-[0.625rem]">
            {TIER_NAMES[tierOf(linked)]}
          </span>
        )}
      </>
    );
    return linked ? (
      <Link
        key={m.id}
        href={`/charaktere/${linked.id}`}
        title={`Zum Profil von ${linked.name}`}
        className={`${card} border-border-subtle bg-bg-surface hover:border-accent/50`}
      >
        {body}
      </Link>
    ) : (
      <div key={m.id} className={`${card} border-border-subtle bg-bg-surface`}>
        {body}
      </div>
    );
  };
  // eine Person samt Partner*innen: Karte – ♥ – Karte; zählt als so viele Karten
  const unit = (m: FamilyMember | null) => {
    const partners = partnersOf(m ? m.id : "self");
    const own =
      m === null ? (
        <div key="self" className={`${card} border-accent/70 bg-accent-soft`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterImage(c)} alt="" className={face} />
          <span className={name}>{c.full_name || c.name}</span>
        </div>
      ) : (
        memberCard(m)
      );
    const n = 1 + partners.length;
    return {
      n,
      node: (
        <div key={m ? m.id : "self"} style={{ flex: `${n} 1 0` }} className="flex min-w-0 items-center">
          {own}
          {partners.map((x) => (
            <div key={x.id} className="flex min-w-0 flex-1 items-center">
              <span className="flex shrink-0 items-center text-accent" aria-label="verpartnert mit" role="img">
                <span className="h-px w-1 bg-accent/60 sm:w-2.5" />
                <span className="px-0.5 text-[0.625rem] leading-none sm:px-1 sm:text-[0.75rem]">♥</span>
                <span className="h-px w-1 bg-accent/60 sm:w-2.5" />
              </span>
              {memberCard(x)}
            </div>
          ))}
        </div>
      ),
    };
  };
  return (
    <section>
      <div className="flex flex-col items-center">
        {used.map((row, i) => (
          <div key={row.gen} className="flex w-full flex-col items-center">
            {i > 0 && <span className="h-6 w-px bg-white/25 sm:h-8" />}
            <div
              className={`flex w-full flex-nowrap items-start justify-center gap-x-3 pt-4 sm:gap-x-12 sm:px-10 sm:pt-5 ${
                i > 0 ? "border-t border-white/25" : ""
              }`}
            >
              {row.groups.map(({ slot, members }) => {
                const units = members.map(unit);
                const n = units.reduce((sum, u) => sum + u.n, 0);
                return (
                  <div
                    key={slot.key}
                    style={{ flex: `${n} 1 0`, maxWidth: `${n * CARD}rem` }}
                    className="flex min-w-0 flex-col items-center gap-2"
                  >
                    {/* Beschriftung nur, wenn in der Reihe auch die Seitenlinie steht */}
                    {row.groups.some((g) => g.slot.side) && <span className={`${tag} text-center`}>{slot.label}</span>}
                    <div className="flex w-full flex-nowrap items-center justify-center gap-1.5 sm:gap-4">
                      {units.map((u) => u.node)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
