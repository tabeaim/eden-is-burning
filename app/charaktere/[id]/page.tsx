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
import { TIER_NAMES, tierLabel, tierOf } from "@/lib/characters";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { StatistActions } from "@/components/StatistActions";
import { ProfileEditPanel } from "@/components/ProfileEditPanel";
import type { Character, Scene } from "@/lib/types";

type Tab = "general" | "character" | "inplay" | "relations" | "phone";

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
  if (c.is_npc && !c.bio && !c.personality && !c.banner_url && !c.quote) {
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
      <QuoteBlock c={c} canEdit={canEditCharacter(c)} />

      {/* Inhaltliches wird direkt hier im Profil bearbeitet */}
      {canEditCharacter(c) && !editing && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {tierOf(c) === "extra" && <StatistActions character={c} />}
          <button onClick={() => setEditing(true)} className={btn}>
            <Icon name="edit" size={14} /> Profil bearbeiten
          </button>
        </div>
      )}
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
              <Bubble>{c.tagline}</Bubble>
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
                ["inplay", "Inplay"],
                ["relations", "Relations"],
                // NPCs haben kein eigenes Handy
                ...(c.is_npc ? [] : [["phone", "Handy"]]),
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

          {tab === "general" && (
            <>
              <GeneralTab c={c} />
              {c.pinterest_url && (
                <a
                  href={c.pinterest_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${btn} mt-7`}
                >
                  <Icon name="pinterest" size={14} /> Pinterest-Board
                </a>
              )}
            </>
          )}
          {tab === "character" && <CharacterTab c={c} />}
          {tab === "inplay" && <InplayTab inScenes={inScenes} />}
          {/* Handy nur zum Ansehen: Look, Startbildschirm, Kontaktliste */}
          {tab === "phone" && !c.is_npc && <PhonePreview character={c} />}
          {tab === "relations" && (
            <RelationsTab
              c={c}
              coChars={coChars}
              canEdit={canEditCharacter(c)}
            />
          )}

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
          {tierOf(c) === "extra" && <StatistActions character={c} />}
          {canEditCharacter(c) && (
            <button onClick={() => setEditing(true)} className={btn}>
              <Icon name="edit" size={14} /> Profil bearbeiten
            </button>
          )}
        </div>
      )}
      {editing && <ProfileEditPanel character={c} onClose={() => setEditing(false)} />}

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-6" />

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7 items-start max-w-4xl">
        <section>
          <Heading>facts.</Heading>
          <Facts>
            <FactRow label="Name" value={c.full_name ?? c.name} />
            <FactRow label="Age" value={c.age ? `${c.age} Jahre` : null} />
            <FactRow label="Occupation" value={c.role} />
            <FactRow label="Residence" value={areaName(c.area)} />
          </Facts>
        </section>

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
        <Facts className="mt-3">
          <FactRow label="Height" value={c.height} />
          <FactRow label="Figure" value={c.figure} />
          <FactRow label="Hair" value={c.hair} />
          <FactRow label="Eyes" value={c.eyes} />
          <FactRow label="Face" value={c.faceclaim} />
        </Facts>
      </div>
    </div>
  );
}

// Zitat anzeigen/hinzufügen – volle Breite über "facts".
function QuoteBlock({ c, canEdit }: { c: Character; canEdit: boolean }) {
  const { updateCharacter } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function save() {
    updateCharacter(c.id, { quote: draft.trim() || null });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ein Zitat des Charakters…"
          autoFocus
          rows={2}
          className={`${field} resize-y`}
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button onClick={() => setEditing(false)} className={btnQuiet}>
            Abbrechen
          </button>
          <button onClick={save} className={btnPrimary}>
            Speichern
          </button>
        </div>
      </div>
    );
  }

  if (c.quote) {
    return (
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-left text-[1.125rem] leading-snug text-text-primary">
          <span className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
          {c.quote}
        </p>
        {canEdit && (
          <button
            onClick={() => {
              setDraft(c.quote ?? "");
              setEditing(true);
            }}
            className={`${btn} shrink-0`}
          >
            <Icon name="edit" size={14} /> Bearbeiten
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <button
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className="flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[0.8125rem] text-text-tertiary hover:text-accent hover:border-accent/50"
    >
      <Icon name="plus" size={11} /> Zitat hinzufügen
    </button>
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
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 items-start">
      {/* Charaktertext – links neben den Facts */}
      <div>
        {c.bio ? (
          <p className="text-left text-[0.875rem] leading-relaxed text-text-secondary">
            {c.bio}
          </p>
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">
            Noch keine Beschreibung.
          </p>
        )}
      </div>

      {/* Facts + occupation – rechts */}
      <div className="flex flex-col gap-7">
        <section>
          <Heading>facts.</Heading>
          <Facts>
            <FactRow label="Name" value={c.full_name ?? c.name} />
            <FactRow label="Age" value={c.age ? `${c.age} Jahre` : null} />
            <FactRow label="Occupation" value={c.role} />
            <FactRow label="Residence" value={areaName(c.area)} />
            <FactRow label="Sexuality" value={c.sexuality} />
            <FactRow label="Status" value={c.status} />
            <FactRow label="Origin" value={c.origin} />
          </Facts>
        </section>

        {(c.job || c.company) && (
          <section>
            <Heading>occupation.</Heading>
            <Facts>
              <FactRow label="Job" value={c.job} />
              <FactRow label="Company" value={c.company} />
            </Facts>
          </section>
        )}
        </div>
      </div>
  );
}

function CharacterTab({ c }: { c: Character }) {
  return (
    <div className="flex flex-col gap-7">
      {c.personality && (
        <section>
          <Heading>personality.</Heading>
          <p className="text-left text-[0.875rem] leading-relaxed text-text-secondary">
            {c.personality}
          </p>
        </section>
      )}
      {c.bio && (
        <section>
          <Heading>biography.</Heading>
          <p className="text-left text-[0.875rem] leading-relaxed text-text-secondary">{c.bio}</p>
        </section>
      )}
      {!c.personality && !c.bio && (
        <p className="text-[0.875rem] text-text-tertiary">
          Noch keine Charakterbeschreibung hinterlegt.
        </p>
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
            <SceneCard key={s.id} scene={s} />
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
          <div className="flex flex-col gap-4">
            {coChars.map((rc) => (
              <RelationRow key={rc.id} c={c} rc={rc} canEdit={canEdit} />
            ))}
          </div>
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

  function save() {
    updateCharacter(c.id, {
      relationships: {
        ...c.relationships,
        [rc.id]: { label: label.trim() || null, note: note.trim() || null },
      },
    });
    setEditing(false);
  }

  const facts = [rc.age ? `${rc.age}` : null, rc.role, rel.label].filter(Boolean).join(" · ");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-3">
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
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <Link href={`/szenen?chars=${c.id},${rc.id}`} className={btn}>
            Szenen
          </Link>
          {canEdit && !editing && (
            <button
              onClick={() => {
                setLabel(rel.label ?? "");
                setNote(rel.note ?? "");
                setEditing(true);
              }}
              className={btn}
            >
              <Icon name="edit" size={14} /> Bearbeiten
            </button>
          )}
        </div>
      </div>

      {/* Anpassbare Erläuterung zur Beziehung */}
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
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
