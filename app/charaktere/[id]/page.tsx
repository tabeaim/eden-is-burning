"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo } from "@/lib/format";
import { Icon } from "@/components/Icon";
import type { Character } from "@/lib/types";

type Tab = "general" | "character" | "inplay" | "relations";

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
    players,
    characters,
    scenes,
    postsOf,
    posts,
    currentPlayer,
  } = store;
  const c = character(id);
  const [tab, setTab] = useState<Tab>("general");

  // Charaktername als Unterseiten-Titel in den Banner-Header heben
  useSetPageMeta(c?.name ?? "Charakter", undefined, undefined, "max-w-5xl");

  if (!c) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 text-text-tertiary">
        Charakter nicht gefunden.{" "}
        <Link href="/charaktere" className="underline">
          Zum Verzeichnis
        </Link>
      </div>
    );
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
    <div className="max-w-5xl mx-auto px-8 pt-1 pb-8">
      {/* Inhalt linksbündig in gewohnter Breite — Container-Breite bleibt einheitlich */}
      <div className="max-w-4xl">
      {/* Zitat — direkt unter dem Seitentitel, über der Trennlinie */}
      <QuoteBlock c={c} />

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mt-4 mb-6" />

      <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
        {/* LINKS: Profil-Banner + Usertag */}
        <div>
          <ProfileBanner c={c} />
          {c.tagline && (
            <div className="mt-3 flex justify-center">
              <span className="rounded-full border border-border-subtle bg-white/[0.03] px-3 py-0.5 text-[0.75rem] uppercase tracking-wider text-text-secondary">
                {c.tagline}
              </span>
            </div>
          )}
        </div>

        {/* RECHTS: Tabs + Inhalt */}
        <div>
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mb-6">
            {(
              [
                ["general", "General"],
                ["character", "Character"],
                ["inplay", "Inplay"],
                ["relations", "Relations"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg py-2 text-[0.75rem] uppercase tracking-[0.14em] transition-colors ${
                  tab === key
                    ? "bg-olive-soft text-text-primary border border-olive/40"
                    : "bg-white/[0.03] text-text-tertiary hover:text-text-secondary border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "general" && <GeneralTab c={c} />}
          {tab === "character" && <CharacterTab c={c} />}
          {tab === "inplay" && (
            <InplayTab inScenes={inScenes} postsOf={postsOf} />
          )}
          {tab === "relations" && (
            <RelationsTab
              c={c}
              coChars={coChars}
              canEdit={!!currentPlayer && currentPlayer.id === c.player_id}
            />
          )}

          {/* Pinterest */}
          {c.pinterest_url && (
            <div className="mt-8 flex justify-center">
              <a
                href={c.pinterest_url}
                target="_blank"
                rel="noreferrer"
                className="text-olive hover:text-accent"
                title="Pinterest"
              >
                <Icon name="pinterest" size={26} />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <div className="font-display lowercase text-[1.625rem] text-accent">
              brought to you by {p?.username ?? "—"}
              <span className="text-accent">.</span>
            </div>
            <div className="mt-1 text-[0.875rem] uppercase tracking-[0.12em] text-text-tertiary">
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

// Profil-Banner (Seitenbild, NICHT der Avatar; Upload folgt in den Einstellungen).
// Looks erscheinen beim Hover — Hintergrund dunkelt leicht ab, Schrift tritt hervor.
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
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[0.875rem] uppercase tracking-wider text-text-tertiary">
          Profil-Banner
        </div>
      )}

      {/* Looks-Overlay bei Hover */}
      <div className="absolute inset-0 flex flex-col bg-black/80 px-4 py-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <h2 className="font-display lowercase text-[2rem] text-accent leading-none">looks.</h2>
        <div className="mt-3 flex flex-col gap-2">
          <FactRow label="Height" value={c.height} />
          <FactRow label="Figure" value={c.figure} />
          <FactRow label="Hair" value={c.hair} />
          <FactRow label="Eyes" value={c.eyes} />
          <FactRow label="Face" value={c.faceclaim} />
        </div>
      </div>
    </div>
  );
}

// Zitat anzeigen/hinzufügen — volle Breite über "facts".
function QuoteBlock({ c }: { c: Character }) {
  const { updateCharacter } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function save() {
    updateCharacter(c.id, { quote: draft.trim() || null });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="border border-border-subtle bg-black/30 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ein Zitat des Charakters…"
          autoFocus
          rows={2}
          className="w-full resize-y bg-bg-primary border border-border-subtle px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          <button
            onClick={() => setEditing(false)}
            className="text-[0.75rem] text-text-tertiary hover:text-text-primary px-2"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            className="bg-accent/90 hover:bg-accent text-black text-[0.75rem] font-medium px-3 py-1.5"
          >
            Speichern
          </button>
        </div>
      </div>
    );
  }

  if (c.quote) {
    return (
      <div className="group/q relative">
        <p className="text-left text-[1.125rem] leading-snug text-text-primary">
          <span className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
          {c.quote}
        </p>
        <button
          onClick={() => {
            setDraft(c.quote ?? "");
            setEditing(true);
          }}
          className="absolute right-0 top-0 text-[0.75rem] uppercase tracking-wider text-text-tertiary opacity-0 transition-opacity hover:text-accent group-hover/q:opacity-100"
        >
          bearbeiten
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className="w-full border border-dashed border-border-strong px-5 py-2.5 text-[0.75rem] text-text-tertiary hover:text-accent hover:border-accent/50"
    >
      + Zitat hinzufügen
    </button>
  );
}

// Label/Value-Reihe wie im "facts."-Block
function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 w-24 text-right bg-white/[0.06] px-2 py-1 text-[0.875rem] uppercase tracking-wider text-text-primary">
        {label}
      </span>
      <span className="text-[0.875rem] text-text-primary uppercase tracking-wide">
        {value}
      </span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display lowercase text-[2rem] text-accent leading-none mb-3 mt-1">
      {children}
    </h2>
  );
}

function GeneralTab({ c }: { c: Character }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 items-start">
      {/* Charaktertext — links neben den Facts */}
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

      {/* Facts + occupation — rechts */}
      <div className="flex flex-col gap-7">
        <section>
          <Heading>facts.</Heading>
          <div className="flex flex-col gap-2">
            <FactRow label="Name" value={c.full_name ?? c.name} />
            <FactRow label="Age" value={c.age ? `${c.age} Jahre` : null} />
            <FactRow label="Occupation" value={c.role} />
            <FactRow label="Residence" value={areaName(c.area)} />
            <FactRow label="Sexuality" value={c.sexuality} />
            <FactRow label="Status" value={c.status} />
            <FactRow label="Origin" value={c.origin} />
          </div>
        </section>

        {(c.job || c.company) && (
          <section>
            <Heading>occupation.</Heading>
            <div className="flex flex-col gap-2">
              <FactRow label="Job" value={c.job} />
              <FactRow label="Company" value={c.company} />
            </div>
          </section>
        )}
        </div>
      </div>
  );
}

function CharacterTab({ c }: { c: Character }) {
  return (
    <div className="flex flex-col gap-7">
      {c.tagline && (
        <div className="inline-block self-start rounded-full bg-white/[0.05] px-3 py-1 text-[0.875rem] text-text-secondary">
          {c.tagline}
        </div>
      )}
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

function InplayTab({
  inScenes,
  postsOf,
}: {
  inScenes: ReturnType<typeof useStore>["scenes"];
  postsOf: ReturnType<typeof useStore>["postsOf"];
}) {
  return (
    <section>
      <Heading>scenes.</Heading>
      {inScenes.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">Noch in keiner Szene.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {inScenes.map((s) => (
            <Link
              key={s.id}
              href={`/szenen/${s.id}`}
              className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="font-serif text-[1rem] text-text-primary">
                {s.title}
              </div>
              <div className="text-[0.875rem] text-text-tertiary">
                {s.location_name} · {areaName(s.location_area)} ·{" "}
                {formatInplayDate(s.inplay_date)} · {postsOf(s.id).length} Posts
              </div>
            </Link>
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
          Noch keine Verbindungen — sobald zwei Charaktere eine gemeinsame Szene
          hatten, erscheint die Verbindung hier automatisch.
        </p>
      ) : (
        <>
          <p className="mb-4 text-[0.75rem] text-text-tertiary">
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

// Eine Beziehung: Charakter-Bubble + Alter | Beruf | (Label) in Caps-Montserrat,
// anpassbare Erläuterung, und ein "Szenen"-Button (gefilterte Suche mit beiden).
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

  const facts = [rc.age ? `${rc.age}` : null, rc.role, rel.label ? `(${rel.label})` : null]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Charakter-Bubble (wie global) */}
        <Link
          href={`/charaktere/${rc.id}`}
          className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-primary pl-1 pr-2.5 py-0.5 text-[0.75rem] text-text-secondary hover:text-text-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rc.faceclaim_image_url ?? ""}
            alt={rc.name}
            className="w-5 h-5 rounded-full object-cover"
          />
          {rc.name}
        </Link>

        {/* Alter | Beruf | (Beziehung) — Caps-Montserrat */}
        {facts && (
          <span className="text-[0.875rem] uppercase tracking-wider text-text-secondary">
            {facts}
          </span>
        )}

        {/* Szenen-Button → gefilterte Suche mit beiden Charakteren */}
        <Link
          href={`/szenen?chars=${c.id},${rc.id}`}
          className="ml-auto rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[0.875rem] uppercase tracking-wider text-text-secondary hover:text-text-primary"
        >
          Szenen
        </Link>
      </div>

      {/* Anpassbare Erläuterung zur Beziehung */}
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Beziehung (z. B. Freunde, Ex, Rivalen)"
            className="w-full bg-bg-primary border border-border-subtle px-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kurze Erläuterung zur Beziehung…"
            rows={2}
            className="w-full resize-y bg-bg-primary border border-border-subtle px-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setEditing(false)}
              className="text-[0.75rem] text-text-tertiary hover:text-text-primary px-2"
            >
              Abbrechen
            </button>
            <button
              onClick={save}
              className="bg-accent/90 hover:bg-accent text-black text-[0.75rem] font-medium px-3 py-1.5"
            >
              Speichern
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-start gap-2">
          <p className="flex-1 text-[0.875rem] text-text-secondary leading-relaxed">
            {rel.note || (
              <span className="text-text-tertiary">
                {canEdit
                  ? "Noch keine Beschreibung."
                  : "Noch keine Beschreibung hinterlegt."}
              </span>
            )}
          </p>
          {canEdit && (
            <button
              onClick={() => {
                setLabel(rel.label ?? "");
                setNote(rel.note ?? "");
                setEditing(true);
              }}
              className="shrink-0 text-[0.75rem] uppercase tracking-wider text-text-tertiary hover:text-accent"
            >
              bearbeiten
            </button>
          )}
        </div>
      )}
    </div>
  );
}
