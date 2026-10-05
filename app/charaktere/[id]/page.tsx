"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Bubble, LocationBubble } from "@/components/Bubble";
import { characterImage } from "@/lib/avatar";
import { SceneCard } from "@/components/SceneCard";
import { Facts, FactRow } from "@/components/Facts";
import {
  RELATION_CATEGORIES,
  TIER_NAMES,
  ageAt,
  isHidden,
  normalizeHeight,
  tierLabel,
  tierOf,
} from "@/lib/characters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ThingsBoard } from "@/components/ThingsBoard";
import { PinterestBoard } from "@/components/PinterestBoard";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { StatistActions } from "@/components/StatistActions";
import { ProfileEditPanel } from "@/components/ProfileEditPanel";
import {
  ProfileFacts,
  ProfileLikes,
  ProfileLooks,
  ProfileSkills,
  ProfileSliders,
  ProfileTimeline,
  ProfileTraits,
} from "@/components/ProfileSections";
import type { Character, RelationCategory, Scene } from "@/lib/types";

type Tab = "general" | "character" | "personal" | "moodboard" | "inplay" | "relations";

// Bausteine aus DESIGN.md: Buttons, Primär-Aktion, Formularfelder
const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";
const btnPrimary =
  "rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5";
const btnQuiet = "text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2";
const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useStore();
  const {
    character,
    player,
    characters,
    scenes,
    postsOf,
    posts,
    canEditCharacter,
  } = store;
  const c = character(id);
  const [tab, setTab] = useState<Tab>("general");

  const [editing, setEditing] = useState(false);

  // Charaktername als Unterseiten-Titel in den Banner-Header heben
  useSetPageMeta(
    c ? c.name : "Charakter",
    undefined,
    undefined,
    "max-w-6xl",
  );

  if (!c) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-text-tertiary">
        Charakter nicht gefunden.{" "}
        <Link href="/charaktere" className="underline">
          Zum Verzeichnis
        </Link>
      </div>
    );
  }

  // NPC ohne ausgefülltes Profil → nur die wichtigsten Facts
  const prof = c.profile ?? {};
  const hasMore =
    !!prof.skills?.length ||
    !!prof.sliders?.length ||
    !!prof.timeline?.length ||
    !!prof.traits_plus?.length ||
    !!prof.traits_minus?.length ||
    !!prof.likes?.length ||
    !!prof.dislikes?.length;
  if (c.is_npc && !c.bio && !c.personality && !c.banner_url && !c.quote && !hasMore) {
    return <NpcFacts c={c} />;
  }

  const p = player(c.player_id);
  const inScenes = scenes.filter((s) => s.participant_ids.includes(c.id));
  const postCount = posts.filter((x) => x.character_id === c.id).length;

  // Mitspieler-Charaktere (für RELATIONS) aus gemeinsamen Szenen
  const coCharIds = new Set<string>();
  for (const s of inScenes)
    for (const pid of s.participant_ids) if (pid !== c.id) coCharIds.add(pid);
  const coChars = Array.from(coCharIds)
    .map((cid) => characters.find((x) => x.id === cid))
    .filter(Boolean) as Character[];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-1 pb-8">
      {/* Inhalt linksbündig in gewohnter Breite – Container-Breite bleibt einheitlich */}
      <div className="max-w-4xl">
      {/* Zitat – direkt unter dem Seitentitel, über der Trennlinie */}
      {/* Der Knopf sitzt rechts oben, das Zitat fließt um ihn herum */}
      <div className="flow-root">
        {canEditCharacter(c) && !editing && (
          <div className="float-right mb-2 ml-4 flex flex-wrap items-center justify-end gap-2">
            {tierOf(c) === "extra" && <StatistActions character={c} upgrade />}
            <button onClick={() => setEditing(true)} className={btn}>
              <Icon name="edit" size={14} /> Bearbeiten
            </button>
          </div>
        )}
        <QuoteBlock c={c} />
      </div>
      {editing && (
        <div className="mt-4">
          <ProfileEditPanel character={c} onClose={() => setEditing(false)} />
        </div>
      )}

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mt-4 mb-6" />

      <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
        {/* LINKS: Profil-Banner + Usertag */}
        <div>
          <ProfileBanner c={c} />
          {c.tagline && (
            <div className="mt-3 flex justify-center">
              <Bubble className="uppercase tracking-wider">{c.tagline}</Bubble>
            </div>
          )}
        </div>

        {/* RECHTS: Tabs + Inhalt */}
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {(
              [
                ["general", "General"],
                ["character", "Character"],
                // „Personal Things": das Handy (nur Main Characters haben eins)
                ...(c.is_npc ? [] : [["personal", "Personal Things"]]),
                // eingebundenes Pinterest-Board, falls eines hinterlegt ist
                ...(c.pinterest_url ? [["moodboard", "Moodboard"]] : []),
                ["inplay", "Inplay"],
                ["relations", "Relations"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
                  tab === key
                    ? "bg-accent text-black font-medium"
                    : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lange Reiter scrollen in sich, damit der Text nicht viel länger läuft
              als der Banner daneben hoch ist (nur neben dem Banner, also ab md). Im
              ersten Reiter scrollt nur die Kurzbeschreibung, die Facts bleiben stehen. */}
          <div className={tab === "general" ? "" : "md:max-h-[436px] md:overflow-y-auto md:pr-3"}>
          {tab === "general" && <GeneralTab c={c} />}
          {tab === "moodboard" && c.pinterest_url && (
            <section>
              <Heading>moodboard.</Heading>
              <PinterestBoard url={c.pinterest_url} />
            </section>
          )}
          {tab === "character" && <CharacterTab c={c} />}
          {/* Was der Charakter bei sich hat – bisher das Handy, nur zum Ansehen
              (Look, Startbildschirm, Kontaktliste) */}
          {tab === "personal" && !c.is_npc && (
            <section>
              <Heading>personal things.</Heading>
              {/* links das Handy, daneben die Collage der Gegenstände */}
              <div className="flex flex-col items-start gap-6 sm:flex-row">
                <div className="shrink-0">
                  <PhonePreview character={c} />
                </div>
                <ThingsBoard character={c} canEdit={canEditCharacter(c)} />
              </div>
            </section>
          )}
          {tab === "inplay" && <InplayTab inScenes={inScenes} />}
          {tab === "relations" && (
            <RelationsTab
              c={c}
              coChars={coChars}
              canEdit={canEditCharacter(c)}
            />
          )}

          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-border-subtle pt-4">
            <div className="font-display lowercase text-[1.625rem] leading-none text-accent">
              brought to you by{" "}
              {p ? (
                <Link href={`/spieler/${p.username}`} className="hover:underline">
                  {p.username}
                </Link>
              ) : (
                "–"
              )}
              .
            </div>
            <div className="mt-2 text-[0.8125rem] text-text-tertiary">
              {postCount} {postCount === 1 ? "Post" : "Posts"} · registriert am{" "}
              {formatInplayDate(c.created_at.slice(0, 10))}
              {p && <> · zuletzt online {timeAgo(p.last_seen)}</>}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Kompaktansicht für NPCs ohne ausgefülltes Profil: Facts + Orte, an denen der
// NPC hinterlegt ist. Wer ihn angelegt hat (oder Admin ist), kann das Profil in
// den Einstellungen ausfüllen – dann erscheint die volle Profilansicht.
function NpcFacts({ c }: { c: Character }) {
  const { locations, scenes, player, canEditCharacter } = useStore();
  const [editing, setEditing] = useState(false);
  const p = player(c.player_id);
  const foundAt = locations.filter((l) => l.people?.some((x) => x.id === c.id));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-8">
      {(canEditCharacter(c) || tierOf(c) === "extra") && !editing && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {/* Statist*in: bespielen (zeitweise oder als Supporting Character) / lösen */}
          {tierOf(c) === "extra" && <StatistActions character={c} upgrade />}
          {canEditCharacter(c) && (
            <button onClick={() => setEditing(true)} className={btn}>
              <Icon name="edit" size={14} /> Bearbeiten
            </button>
          )}
        </div>
      )}
      {editing && <ProfileEditPanel character={c} onClose={() => setEditing(false)} />}

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-6" />

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7 items-start max-w-4xl">
        <ProfileFacts c={c} />
        <ProfileLooks c={c} />
        <Vibes c={c} />

        {foundAt.length > 0 && (
          <section>
            <Heading>spotted here.</Heading>
            <div className="flex flex-wrap gap-1.5">
              {foundAt.map((l) => (
                <LocationBubble
                  key={l.id}
                  id={l.id}
                  name={l.name}
                  played={scenes.some(
                    (s) => s.location_area === l.area && s.location_name === l.name,
                  )}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {p && (
        <div className="mt-10 text-[0.8125rem] text-text-tertiary">
          {TIER_NAMES[tierOf(c)]} · angelegt von {p.username}
        </div>
      )}
    </div>
  );
}

// Profil-Banner (Seitenbild, NICHT der Avatar; Upload folgt in den Einstellungen).
// Looks erscheinen beim Hover – Hintergrund dunkelt leicht ab, Schrift tritt hervor.
function ProfileBanner({ c }: { c: Character }) {
  return (
    <div
      className="group relative h-[492px] w-full overflow-hidden rounded-xl bg-bg-surface"
      style={{
        backgroundImage: c.banner_url
          ? undefined
          : "linear-gradient(180deg, rgba(163,163,128,0.16), rgba(10,10,11,0.7))",
      }}
    >
      {c.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.banner_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!c.banner_url && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[0.875rem] text-text-tertiary">
          Profil-Banner
        </div>
      )}

      {/* Looks-Overlay bei Hover */}
      <div className="absolute inset-0 flex flex-col bg-black/80 px-4 py-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <h2 className="font-display lowercase text-[2rem] text-accent leading-none">looks.</h2>
        {c.profile?.looks_note && (
          <p className="mt-3 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-text-secondary">
            {c.profile.looks_note}
          </p>
        )}
        <Facts className="mt-3">
          <FactRow label="Height" value={isHidden(c, "height") ? null : normalizeHeight(c.height)} />
          <FactRow label="Figure" value={isHidden(c, "figure") ? null : c.figure} />
          <FactRow label="Hair" value={isHidden(c, "hair") ? null : c.hair} />
          <FactRow label="Eyes" value={isHidden(c, "eyes") ? null : c.eyes} />
        </Facts>
      </div>
    </div>
  );
}

// Zitat anzeigen/hinzufügen – volle Breite über "facts".
// Zitat des Charakters (bearbeitet wird es über „Bearbeiten" im Profil)
function QuoteBlock({ c }: { c: Character }) {
  if (!c.quote) return null;
  return (
    <p className="text-left text-[1.125rem] leading-snug text-text-primary">
      <span className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
      {c.quote}
    </p>
  );
}

// Vibes: Inspo-Bilder (Supporting Characters und Statist*innen)
function Vibes({ c }: { c: Character }) {
  const vibes = c.vibes ?? [];
  if (vibes.length === 0) return null;
  return (
    <section className="sm:col-span-2">
      <Heading>vibes.</Heading>
      <div className="columns-2 gap-3 sm:columns-3">
        {vibes.map((src, i) => (
          <a
            key={i}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="mb-3 block w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-surface transition-colors hover:border-accent/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="block h-auto w-full" />
          </a>
        ))}
      </div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display lowercase text-[2rem] text-accent leading-none mb-3">
      {children}
    </h2>
  );
}

function GeneralTab({ c }: { c: Character }) {
  return (
    <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,1.1fr)]">
      {/* Kurzbeschreibung – links neben den Facts (die brauchen den Platz für lange Namen) */}
      <div>
        {c.bio ? (
          <p className="whitespace-pre-wrap text-left text-[0.875rem] leading-relaxed text-text-secondary lg:max-h-[420px] lg:overflow-y-auto lg:pr-3">
            {c.bio}
          </p>
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">Noch keine Kurzbeschreibung.</p>
        )}
      </div>

      {/* Facts, Studium/Arbeit, Looks – rechts */}
      <div className="flex flex-col gap-7">
        {/* Looks stehen nur im Hover über dem Profil-Banner */}
        <ProfileFacts c={c} />
      </div>

      {(c.vibes ?? []).length > 0 && <Vibes c={c} />}
    </div>
  );
}

// Ausführliche Beschreibung und alles, was den Charakter ausmacht
function CharacterTab({ c }: { c: Character }) {
  const p = c.profile ?? {};
  const empty =
    !c.personality &&
    !(p.traits_plus?.length || p.traits_minus?.length || p.skills?.length || p.sliders?.length) &&
    !(p.likes?.length || p.dislikes?.length || p.timeline?.length);
  return (
    <div className="flex flex-col gap-9">
      {c.personality && (
        <section>
          <Heading>about.</Heading>
          <p className="whitespace-pre-wrap text-left text-[0.875rem] leading-relaxed text-text-secondary">
            {c.personality}
          </p>
        </section>
      )}
      <ProfileTraits c={c} />
      <ProfileSkills c={c} />
      <ProfileSliders c={c} />
      <ProfileLikes c={c} />
      <ProfileTimeline c={c} />
      {empty && (
        <p className="text-[0.875rem] text-text-tertiary">Noch keine Charakterbeschreibung hinterlegt.</p>
      )}
    </div>
  );
}

function InplayTab({ inScenes }: { inScenes: Scene[] }) {
  return (
    <section>
      <Heading>scenes.</Heading>
      {inScenes.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">Noch in keiner Szene.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {inScenes.map((s) => (
            <SceneCard key={s.id} scene={s} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function RelationsTab({
  c,
  coChars,
  canEdit,
}: {
  c: Character;
  coChars: Character[];
  canEdit: boolean;
}) {
  return (
    <section>
      <Heading>relations.</Heading>
      {coChars.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">
          Noch keine Verbindungen – sobald zwei Charaktere eine gemeinsame Szene
          hatten, erscheint die Verbindung hier automatisch.
        </p>
      ) : (
        <>
          <p className="mb-4 text-[0.8125rem] text-text-tertiary">
            Verbindungen werden automatisch aus gemeinsamen Szenen erkannt.
            {canEdit
              ? " Trag ein, um was für eine Beziehung es sich handelt."
              : ` Nur wer ${c.name} spielt, kann die Art der Beziehung eintragen.`}
          </p>
          {/* nach Kategorie gruppiert; ohne Kategorie stehen sie zuletzt */}
          {[...RELATION_CATEGORIES, [null, "others."] as const].map(([key, title]) => {
            const rows = coChars.filter((rc) => (c.relationships?.[rc.id]?.category ?? null) === key);
            if (rows.length === 0) return null;
            return (
              <div key={title} className="mb-6">
                <h3 className="mb-2 font-display lowercase text-[1.5rem] leading-none text-text-primary">
                  {title}
                </h3>
                <div className="flex flex-col gap-4">
                  {rows.map((rc) => (
                    <RelationRow key={rc.id} c={c} rc={rc} canEdit={canEdit} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

// Eine Beziehung: links der eckige Avatar, daneben Name + Alter · Beruf ·
// Beziehung als Faktenzeile, rechts oben die Buttons („Szenen" = gefilterte
// Suche mit beiden), darunter die anpassbare Erläuterung.
function RelationRow({
  c,
  rc,
  canEdit,
}: {
  c: Character;
  rc: Character;
  canEdit: boolean;
}) {
  const { updateCharacter } = useStore();
  const rel = c.relationships?.[rc.id] ?? {};
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(rel.label ?? "");
  const [note, setNote] = useState(rel.note ?? "");
  const [category, setCategory] = useState<RelationCategory | "">(rel.category ?? "");
  const [confirmClear, setConfirmClear] = useState(false);

  function save() {
    updateCharacter(c.id, {
      relationships: {
        ...c.relationships,
        [rc.id]: { label: label.trim() || null, note: note.trim() || null, category: category || null },
      },
    });
    setEditing(false);
  }

  const rcAge = ageAt(rc);
  const facts = [rcAge != null ? `${rcAge}` : null, rc.role, rel.label].filter(Boolean).join(" · ");

  return (
    <div className="group/rel relative flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-3">
      {/* Mini-Menü beim Hover (wie bei den Posts): bearbeiten / Eintrag leeren */}
      {canEdit && !editing && (
        <div className="absolute right-1.5 top-1.5 flex gap-0.5 rounded-md bg-bg-surface opacity-0 transition-opacity group-hover/rel:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => {
              setLabel(rel.label ?? "");
              setNote(rel.note ?? "");
              setCategory(rel.category ?? "");
              setEditing(true);
            }}
            title="Beziehung bearbeiten"
            aria-label="Beziehung bearbeiten"
            className="rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-accent"
          >
            <Icon name="edit" size={14} />
          </button>
          {(rel.label || rel.note || rel.category) && (
            <button
              onClick={() => setConfirmClear(true)}
              title="Angaben zur Beziehung löschen"
              aria-label="Angaben zur Beziehung löschen"
              className="rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-red-400"
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      )}
      {confirmClear && (
        <ConfirmDialog
          title={`Angaben zu ${rc.name} löschen?`}
          text="Kategorie, Beziehung und Erläuterung werden geleert. Die Verbindung selbst bleibt stehen – sie ergibt sich aus den gemeinsamen Szenen."
          confirmLabel="Angaben löschen"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            const next = { ...c.relationships };
            delete next[rc.id];
            updateCharacter(c.id, { relationships: next });
            setConfirmClear(false);
          }}
        />
      )}
      <Link href={`/charaktere/${rc.id}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={characterImage(rc)}
          alt={`Avatar von ${rc.name}`}
          className="h-20 w-20 rounded-md object-cover bg-bg-primary"
        />
      </Link>

      <div className="min-w-0 flex-1">
      {/* Name + Faktenzeile (bricht bei Bedarf um), rechts die Buttons */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/charaktere/${rc.id}`}
            className="text-[0.875rem] font-medium text-text-primary hover:text-accent"
          >
            {rc.name}
            {rc.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                {tierLabel(rc)}
              </span>
            )}
          </Link>
          {facts && <div className="text-[0.8125rem] text-text-tertiary">{facts}</div>}
        </div>
        <div className={`flex shrink-0 flex-wrap justify-end gap-1.5 ${canEdit ? "mr-12" : ""}`}>
          <Link href={`/szenen?chars=${c.id},${rc.id}`} className={btn}>
            Szenen
          </Link>
        </div>
      </div>

      {/* Anpassbare Erläuterung zur Beziehung */}
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RelationCategory | "")}
            aria-label="Kategorie"
            className={field}
          >
            <option value="" className="bg-bg-surface">
              Kategorie wählen …
            </option>
            <option value="love" className="bg-bg-surface">
              Love Life
            </option>
            <option value="family" className="bg-bg-surface">
              Family
            </option>
            <option value="acquainted" className="bg-bg-surface">
              Acquainted
            </option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Beziehung (z. B. Freunde, Ex, Rivalen)"
            className={field}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kurze Erläuterung zur Beziehung…"
            rows={2}
            className={`${field} resize-y`}
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setEditing(false)} className={btnQuiet}>
              Abbrechen
            </button>
            <button onClick={save} className={btnPrimary}>
              Speichern
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[0.875rem] text-text-secondary leading-relaxed">
          {rel.note || <span className="text-text-tertiary">Noch keine Beschreibung.</span>}
        </p>
      )}
      </div>
    </div>
  );
}
