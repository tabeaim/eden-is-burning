"use client";

import { useLayoutEffect, useRef } from "react";
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
  webUrl,
  zodiacOf,
} from "@/lib/characters";
import { AREA_ORDER, areaName } from "@/lib/world";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { DEFAULT_AVATAR, characterImage } from "@/lib/avatar";
import { Facts, FactRow } from "./Facts";
import { Bubble, LocationBubble } from "./Bubble";
import { Icon } from "./Icon";
import { RichText } from "./RichText";

// Bausteine des Charakterprofils (siehe DESIGN.md): Facts mit englischen Labels,
// dazu die frei gestaltbaren Abschnitte Skills, Eigenschaften, Slider,
// Likes/Dislikes und Timeline. Leere Abschnitte fallen weg; im Profil versteckte
// Angaben (`profile.hidden`) ebenso.

// Abschnitt des Profils: dezente Box, die Überschrift steht mit in der Box
// (Facts-Gruppen, Skills, Slider, Eigenschaften, Likes, About, Style …)
export function SectionBox({
  title,
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${className} rounded-lg border border-border-subtle bg-bg-surface px-5 pb-5 pt-4`}>
      {title && <SectionHeading>{title}</SectionHeading>}
      {children}
    </section>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display lowercase text-[1.75rem] leading-none text-accent">{children}</h2>
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
      return <LocationBubble key={loc.id} id={loc.id} name={loc.name} category={loc.category} played={played} />;
    }
    const area = AREA_ORDER.find((k) => areaName(k).toLowerCase() === q);
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
          {areaName(area)}
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
  const gpa = full && isStudent(c) ? shown(c, "gpa", p.gpa) : null;
  const spotifyUrl = webUrl(shown(c, "spotify", p.spotify_url));
  const spotify = spotifyUrl ? (
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 align-bottom text-olive hover:text-accent"
    >
      <Icon name="spotify" size={16} /> Listen
    </a>
  ) : null;
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
        ["Spotify", spotify],
      ],
    ],
    [
      "occupation.",
      [
        ["Occupation", role],
        ["Workplace", workplace],
        ["University", university],
        ["Studies", studies],
        ["GPA", gpa],
      ],
    ],
  ];
  return (
    <>
      {groups.map(([title, rows]) =>
        rows.some(([, v]) => v !== null && v !== undefined && v !== "") ? (
          // die Beschäftigung braucht mit Ort die ganze Breite
          <SectionBox key={title} title={title} className={title === "occupation." ? "sm:col-span-2" : ""}>
            <Facts>
              {rows.map(([label, value]) => (
                <FactRow key={label} label={label} value={value} />
              ))}
            </Facts>
          </SectionBox>
        ) : null,
      )}
    </>
  );
}

// `wide` (Reiter „Looks"): Fließtext über die ganze Breite, darunter – durch eine
// Linie abgesetzt – die Angaben in zwei Spalten
export function ProfileLooks({ c, wide = false }: { c: Character; wide?: boolean }) {
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
    <SectionBox title="looks.">
      {note && (
        <RichText
          html={note}
          className={`text-[0.875rem] leading-relaxed text-text-secondary ${
            wide && rows.some(([, v]) => v) ? "mb-4 border-b border-border-subtle pb-4" : "mb-2"
          }`}
        />
      )}
      <Facts
        className={
          wide ? "gap-y-2.5 sm:grid-cols-[max-content_minmax(0,1fr)_max-content_minmax(0,1fr)]" : ""
        }
      >
        {rows.map(([label, value]) => (
          <FactRow key={label} label={label} value={value} />
        ))}
      </Facts>
    </SectionBox>
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
    <SectionBox title="skills.">
      {/* Name und Wert über dem Balken, der Balken dünn und in der Akzentfarbe */}
      <div className="flex flex-col gap-4">
        {skills.map((s, i) => (
          <div key={i}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0 break-words text-[0.75rem] text-text-primary/80">
                {s.name}
              </div>
              <div className="text-[0.75rem] tabular-nums text-text-tertiary">{s.value}%</div>
            </div>
            <div
              className="h-1 overflow-hidden rounded-full bg-white/[0.12]"
              role="img"
              aria-label={`${s.name}: ${s.value} %`}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, s.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionBox>
  );
}

export function ProfileTraits({ c }: { c: Character }) {
  const plus = c.profile?.traits_plus ?? [];
  const minus = c.profile?.traits_minus ?? [];
  if (plus.length + minus.length === 0) return null;
  return (
    <SectionBox title="character.">
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
    </SectionBox>
  );
}

export function ProfileSliders({ c }: { c: WithProfile }) {
  const sliders = c.profile?.sliders ?? [];
  if (sliders.length === 0) return null;
  return (
    <SectionBox title="sliders.">
      {/* Beide Pole über dem Balken; der Balken ist bis zum runden Regler gefüllt */}
      <div className="flex flex-col gap-4">
        {sliders.map((s, i) => {
          const at = `${Math.min(100, Math.max(0, s.value))}%`;
          return (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between gap-4 text-[0.75rem] leading-tight text-text-primary/80">
                <div className="min-w-0 break-words">{s.left}</div>
                <div className="min-w-0 break-words text-right">{s.right}</div>
              </div>
              {/* seitlich eingerückt, damit der Regler an den Enden nicht übersteht */}
              <div className="relative mx-[7px] h-4" role="img" aria-label={`${s.left} – ${s.right}: ${s.value} %`}>
                <div className="absolute -inset-x-[7px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/[0.12]" />
                <div
                  className="absolute -left-[7px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent/40 to-accent"
                  style={{ width: `calc(${at} + 7px)` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                  style={{ left: at }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionBox>
  );
}

export function ProfileLikes({ c }: { c: WithProfile }) {
  const likes = c.profile?.likes ?? [];
  const dislikes = c.profile?.dislikes ?? [];
  if (likes.length + dislikes.length === 0) return null;
  return (
    <SectionBox title="likes/dislikes.">
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
    </SectionBox>
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
            {/* Jahreszahl in der Display-Schrift, der Titel des Abschnitts daneben */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="font-display text-[1.5rem] leading-tight text-text-primary">{t.year}</div>
              {t.title && (
                <div className="rounded-md bg-white/[0.1] px-2 py-1 text-[0.75rem] font-bold uppercase tracking-wider text-text-primary">
                  {t.title}
                </div>
              )}
            </div>
            {t.text && (
              <RichText html={t.text} className="mt-2 text-[0.875rem] leading-relaxed text-text-secondary" />
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
// Seitenlinie: Geschwister der Großeltern, Tanten/Onkel, Cousinen/Cousins.
// Mit einem Charakter verknüpfte Einträge führen auf dessen Profil.
export const FAMILY_SLOTS: { key: string; generation: number; side: boolean; label: string }[] = [
  { key: "-2", generation: -2, side: false, label: "Großeltern" },
  { key: "-2s", generation: -2, side: true, label: "Geschwister der Großeltern" },
  { key: "-1", generation: -1, side: false, label: "Eltern" },
  { key: "-1s", generation: -1, side: true, label: "Tanten & Onkel" },
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

// Mehrere (ehemalige) Partner*innen einer Person, von der ältesten zur neuesten
// Beziehung: erst die beendeten, dann die bestehenden – jeweils in der Reihenfolge,
// in der sie eingetragen wurden. Die letzte ist die neueste: Neben ihr steht die
// Person im Stammbaum, alle früheren stehen auf der anderen Seite.
export function sortPartners(partners: FamilyMember[]): FamilyMember[] {
  return [...partners.filter((m) => m.partner_status), ...partners.filter((m) => !m.partner_status)];
}

// Räumt Altlasten auf: Angaben, die laut `familyPartners` nicht gelten (Ketten,
// Kreise, verwaiste Verweise), werden zu gewöhnlichen Einträgen.
export function normalizeFamily(family: FamilyMember[]): FamilyMember[] {
  const valid = familyPartners(family);
  const ids = new Set(family.map((m) => m.id));
  return family.map((m) => {
    const next = { ...m };
    if (m.partner_of && valid.get(m.id) !== m.partner_of) next.partner_of = null;
    if (!next.partner_of) delete next.partner_status;
    if (m.parent_ids) {
      const parents = m.parent_ids.filter((id) => (id === "self" || ids.has(id)) && id !== m.id);
      if (parents.length) next.parent_ids = parents;
      else delete next.parent_ids;
    }
    return next;
  });
}

// Linien von den Eltern zu ihren Kindern im Stammbaum („Kind von"-Angaben). Ein
// Paar bekommt eine Klammer unter den Karten und eine gemeinsame Linie nach unten.
// Gezeichnet wird per DOM (ohne State), nachdem die Karten ihren Platz haben, und
// neu, sobald sich die Größe ändert.
// `partner` = wer von den beiden Eltern als Partner*in neben dem anderen steht
type FamilyLink = { parents: string[]; child: string; couple: boolean; partner?: string };
function useFamilyLines(
  wrap: React.RefObject<HTMLDivElement | null>,
  svg: React.RefObject<SVGSVGElement | null>,
  links: FamilyLink[],
) {
  const key = JSON.stringify(links);
  useLayoutEffect(() => {
    const el = wrap.current;
    const out = svg.current;
    if (!el || !out) return;
    const draw = () => {
      const box = el.getBoundingClientRect();
      out.replaceChildren();
      const rect = (id: string) => el.querySelector<HTMLElement>(`[data-fam="${id}"]`)?.getBoundingClientRect();
      let d = "";
      const all = JSON.parse(key) as FamilyLink[];
      // Hat jemand mehrere Partner*innen, liegen die Klammern der Paare gestaffelt
      // untereinander (die engste zuoberst), damit sie sich nicht überdecken.
      const mid = (r: DOMRect) => r.left + r.width / 2;
      const spans = new Map<string, [number, number]>();
      for (const link of all) {
        if (!link.couple) continue;
        const [a, b] = link.parents.map(rect);
        if (a && b) spans.set([...link.parents].sort().join("|"), [Math.min(mid(a), mid(b)), Math.max(mid(a), mid(b))]);
      }
      const depth = (parents: string[]) => {
        const own = spans.get([...parents].sort().join("|"));
        if (!own) return 0;
        return [...spans.values()].filter(([l, r]) => (l > own[0] - 1 && r < own[1] + 1 && r - l < own[1] - own[0] - 1)).length;
      };
      for (const link of all) {
        const c = rect(link.child);
        const ps = link.parents.map(rect).filter((r): r is DOMRect => !!r);
        if (!c || ps.length === 0) continue;
        const cx = c.left + c.width / 2 - box.left;
        const cy = c.top - box.top;
        const below = Math.max(...ps.map((r) => r.bottom)) - box.top;
        if (cy <= below) continue;
        if (link.couple && ps.length === 2) {
          // Klammer unter dem Paar, von ihrer Mitte weiter nach unten
          const [a, b] = ps.map((r) => r.left + r.width / 2 - box.left);
          const yb = below + 8 + depth(link.parents) * 6;
          // Die Linie nach unten beginnt am Herz neben der Partner*in – bei mehreren
          // Beziehungen ist so klar, aus welcher das Kind stammt.
          const pr = link.partner ? rect(link.partner) : undefined;
          const other = ps.find((r) => r !== pr && pr && r.left !== pr.left);
          const heart = el.querySelector<HTMLElement>("[data-fam-heart]")?.getBoundingClientRect().width ?? 0;
          const xm =
            pr && other
              ? (other.left > pr.left ? pr.right + heart / 2 : pr.left - heart / 2) - box.left
              : (a + b) / 2;
          const ym = yb + (cy - yb) / 2;
          d += `M${a} ${below} V${yb} H${b} V${below} M${xm} ${yb} V${ym} H${cx} V${cy} `;
        } else {
          for (const r of ps) {
            const x = r.left + r.width / 2 - box.left;
            const y = r.bottom - box.top;
            const ym = y + (cy - y) / 2;
            d += `M${x} ${y} V${ym} H${cx} V${cy} `;
          }
        }
      }
      if (!d) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "var(--accent)");
      path.setAttribute("stroke-opacity", "0.6");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linejoin", "round");
      out.appendChild(path);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrap, svg, key]);
}

export function ProfileFamilyTree({ c }: { c: Character }) {
  const { character } = useStore();
  const wrap = useRef<HTMLDivElement>(null);
  const lines = useRef<SVGSVGElement>(null);
  const family = c.profile?.family ?? [];
  // Eltern → Kind (alle „Kind von"-Angaben, auch die des Charakters selbst)
  const ids = new Set(family.map((m) => m.id));
  const partnerOf = familyPartners(family);
  const known = (id: string) => id === "self" || ids.has(id);
  const links: FamilyLink[] = [
    ...family.map((m) => ({ child: m.id, parents: (m.parent_ids ?? []).filter((p) => known(p) && p !== m.id) })),
    { child: "self", parents: (c.profile?.family_parents ?? []).filter((p) => ids.has(p)) },
  ]
    .filter((l) => l.parents.length > 0)
    .map((l) => {
      // zwei Eltern, die ein Paar sind
      const [a, b] = l.parents;
      const partner = l.parents.length !== 2 ? undefined : partnerOf.get(a) === b ? a : partnerOf.get(b) === a ? b : undefined;
      return { ...l, couple: !!partner, partner };
    });
  useFamilyLines(wrap, lines, links);
  if (family.length === 0) return null;
  // Angeheiratete/Partner*innen stehen direkt neben ihrer Person (verbunden
  // durch ein Herz) statt als eigener Eintrag in der Reihe – so sind sie von
  // Geschwistern zu unterscheiden.
  // Bei mehreren Partner*innen steht die Person neben der neuesten Beziehung
  // (rechts), die früheren links von ihr – die älteste ganz außen.
  const partnersOf = (id: string) => sortPartners(family.filter((m) => partnerOf.get(m.id) === id));
  const sidesOf = (id: string) => {
    const all = partnersOf(id);
    return { former: all.slice(0, -1), latest: all[all.length - 1] as FamilyMember | undefined };
  };
  const generations = [...new Set(FAMILY_SLOTS.map((x) => x.generation))];
  // Kinder stehen in der Reihenfolge ihrer Eltern: die aus einer früheren Beziehung
  // links, die aus der neuesten rechts – so kreuzen sich die Linien nicht. `column`
  // merkt sich dafür, an welcher Stelle jede Karte der Reihe darüber steht.
  let column = new Map<string, number>();
  const parentsOf = (m: FamilyMember | null) =>
    m ? (m.parent_ids ?? []) : (c.profile?.family_parents ?? []);
  const used = generations
    .map((gen) => {
      const above = column;
      const where = (m: FamilyMember | null) => {
        const cols = parentsOf(m).map((id) => above.get(id)).filter((n): n is number => n !== undefined);
        return cols.length ? cols.reduce((a, b) => a + b, 0) / cols.length : null;
      };
      // je Generation erst die direkte Linie (in der eigenen mit dem Charakter selbst), dann die Seitenlinie
      const groups = FAMILY_SLOTS.filter((x) => x.generation === gen)
        .map((slot) => {
          const members: (FamilyMember | null)[] = family.filter((m) => !partnerOf.has(m.id) && familySlotOf(m) === slot);
          const row = gen === 0 && !slot.side ? [null, ...members] : members;
          // wer keine Eltern in der Reihe darüber hat, behält seinen Platz
          const placed = row.map(where);
          const sorted = row
            .map((m, i) => ({ m, at: placed[i] }))
            .filter((x): x is { m: FamilyMember | null; at: number } => x.at !== null)
            .sort((a, b) => a.at - b.at);
          let next = 0;
          return { slot, members: row.map((m, i) => (placed[i] === null ? m : sorted[next++].m)) };
        })
        .filter((g) => g.members.length > 0);
      if (groups.length) {
        column = new Map();
        for (const g of groups) {
          for (const m of g.members) {
            const id = m ? m.id : "self";
            const { former, latest } = sidesOf(id);
            for (const x of [...former.map((f) => f.id), id, ...(latest ? [latest.id] : [])]) column.set(x, column.size);
          }
        }
      }
      return { gen, groups };
    })
    .filter((r) => r.groups.length > 0);

  // Alle Karten sind gleich groß. Eine Generation bleibt immer in EINER Zeile: Die
  // Karten schrumpfen in der Breite, wenn der Platz knapp wird (Handy), und sind
  // am Desktop auf eine Höchstbreite begrenzt.
  const card =
    "relative flex h-36 w-[var(--cw)] flex-none flex-col items-center justify-center gap-1 rounded-lg border px-1 text-center sm:h-40 sm:w-[var(--cw-sm)] sm:gap-1.5 sm:rounded-xl sm:px-3";
  const face = "aspect-square w-3/5 max-w-16 shrink-0 rounded-full object-cover sm:w-16";
  const name = "line-clamp-3 w-full break-words text-[0.6875rem] leading-tight text-text-primary transition-colors sm:line-clamp-2 sm:text-[0.875rem]";
  const tag =
    "line-clamp-2 w-full break-all text-center text-[0.5625rem] uppercase tracking-wider text-text-tertiary sm:line-clamp-1 sm:break-normal sm:text-[0.6875rem]";

  // Verlinkte Karten (Charaktere im Verzeichnis) lassen sich anklicken: sie heben sich
  // beim Darüberfahren an, der Rahmen und der Name werden blau
  const memberCard = (m: FamilyMember) => {
    const linked = m.character_id ? character(m.character_id) : undefined;
    const body = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={linked ? characterImage(linked) : DEFAULT_AVATAR}
          alt=""
          className={`${face} ${m.deceased ? "opacity-60 grayscale" : ""}`}
        />
        {/* verstorben: kleines Kreuz oben rechts */}
        {m.deceased && (
          <span role="img" aria-label="verstorben" title="verstorben" className="absolute right-1.5 top-1 text-[0.75rem] leading-none text-text-tertiary sm:right-2 sm:top-1.5 sm:text-[0.875rem]">
            ✝
          </span>
        )}
        <span title={m.name} className={`${name} ${linked ? "group-hover:text-accent" : ""}`}>
          {m.name}
        </span>
        {m.relation && <span className={tag}>{m.relation}</span>}
      </>
    );
    return linked ? (
      <Link
        key={m.id}
        data-fam={m.id}
        href={`/charaktere/${linked.id}`}
        title={`Zum Profil von ${linked.name}`}
        className={`${card} group border-border-subtle bg-bg-surface transition duration-150 hover:-translate-y-0.5 hover:border-accent/70 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/40`}
      >
        {body}
      </Link>
    ) : (
      <div key={m.id} data-fam={m.id} className={`${card} border-border-subtle bg-bg-surface`}>
        {body}
      </div>
    );
  };
  // Verbindung zwischen Partner*innen: Herz; getrennt = gestrichelt mit leerem Herz,
  // geschieden = zusätzlich durchgestrichen
  const connector = (status?: "separated" | "divorced" | null) => {
    const ended = !!status;
    const label = status === "divorced" ? "geschieden" : status === "separated" ? "getrennt" : "verpartnert mit";
    const line = `w-1 sm:w-2.5 ${ended ? "h-0 border-t border-dashed border-current" : "h-px bg-accent/60"}`;
    return (
      <span
        className={`flex shrink-0 items-center ${ended ? "text-text-tertiary" : "text-accent"}`}
        role="img"
        aria-label={label}
        title={label}
        data-fam-heart
      >
        <span className={line} />
        <span className="relative px-0.5 text-[0.625rem] leading-none sm:px-1 sm:text-[0.75rem]">
          {ended ? "♡" : "♥"}
          {status === "divorced" && <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />}
        </span>
        <span className={line} />
      </span>
    );
  };
  // eine Person samt Partner*innen: Karte – ♥ – Karte
  const unit = (m: FamilyMember | null) => {
    const { former, latest } = sidesOf(m ? m.id : "self");
    const own =
      m === null ? (
        <div key="self" data-fam="self" className={`${card} border-accent/70 bg-accent-soft`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterImage(c)} alt="" className={face} />
          <span title={c.full_name || c.name} className={name}>
            {c.full_name || c.name}
          </span>
        </div>
      ) : (
        memberCard(m)
      );
    return {
      n: 1 + former.length + (latest ? 1 : 0),
      node: (
        <div key={m ? m.id : "self"} className="flex items-center">
          {former.map((x) => (
            <div key={x.id} className="flex items-center">
              {memberCard(x)}
              {connector(x.partner_status)}
            </div>
          ))}
          {own}
          {latest && (
            <div className="flex items-center">
              {connector(latest.partner_status)}
              {memberCard(latest)}
            </div>
          )}
        </div>
      ),
    };
  };
  // Gemeinsame Kartenbreite: höchstens 10rem, sonst so schmal, dass auch die
  // vollste Generation in eine Zeile passt (Rest = Abstände, Herzen, Rand; mobil und
  // ab sm getrennt gerechnet). 100cqw = Breite des Baums.
  const rows = used.map((row) => {
    const units = row.groups.map(({ members }) => members.map((m) => partnersOf(m ? m.id : "self").length));
    const cards = units.flat().reduce((n, p) => n + 1 + p, 0);
    const partners = units.flat().reduce((n, p) => n + p, 0);
    const inner = units.reduce((n, g) => n + g.length - 1, 0);
    return { cards, groups: units.length, partners, inner };
  });
  const width = (fixed: (r: (typeof rows)[number]) => number) =>
    `min(10rem, ${rows.map((r) => `calc((100cqw - ${fixed(r) + 4}px) / ${r.cards})`).join(", ")})`;
  const sizes = {
    containerType: "inline-size",
    ["--cw" as string]: width((r) => (r.groups - 1) * 12 + r.inner * 6 + r.partners * 22),
    ["--cw-sm" as string]: width((r) => 80 + (r.groups - 1) * 48 + r.inner * 16 + r.partners * 40),
  } as React.CSSProperties;
  return (
    <section>
      <div ref={wrap} style={sizes} className="relative flex flex-col items-center">
        {used.map((row, i) => (
          <div key={row.gen} className="flex w-full flex-col items-center">
            {i > 0 && !links.length && <span className="h-6 w-px bg-white/25 sm:h-8" />}
            <div
              className={`flex w-full flex-nowrap items-start justify-center gap-x-3 pt-4 sm:gap-x-12 sm:px-10 sm:pt-5 ${
                i > 0 ? (links.length ? "mt-6 sm:mt-8" : "border-t border-white/25") : ""
              }`}
            >
              {row.groups.map(({ slot, members }) => {
                const units = members.map(unit);
                return (
                  <div key={slot.key} className="flex flex-col items-center gap-2">
                    {/* Beschriftung nur, wenn in der Reihe auch die Seitenlinie steht */}
                    {row.groups.some((g) => g.slot.side) && (
                      // trägt nicht zur Breite der Gruppe bei: lange Namen werden gekürzt
                      <span className={`${tag} w-0 min-w-full text-center`}>{slot.label}</span>
                    )}
                    <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-4">
                      {units.map((u) => u.node)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <svg ref={lines} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" />
      </div>
    </section>
  );
}
