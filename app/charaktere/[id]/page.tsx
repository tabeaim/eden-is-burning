"use client";

import { playerImage } from "@/lib/avatar";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useSetPageMeta } from "@/lib/page-meta";
import { GONE_PLAYER_CLASS } from "@/lib/gone";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo, capFirst } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Bubble, LocationBubble } from "@/components/Bubble";
import { characterImage } from "@/lib/avatar";
import { TabRule } from "@/components/TabRule";
import { SceneFilterList } from "@/components/SceneFilterList";
import {
  RELATION_CATEGORIES,
  TIER_NAMES,
  ageAt,
  isHidden,
  ownerGone,
  playsAs,
  tierLabel,
  tierOf,
} from "@/lib/characters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ThingsBoard } from "@/components/ThingsBoard";
import { PinterestBoard } from "@/components/PinterestBoard";
import { hasPhone } from "@/lib/phone";
import { PhonePreview } from "@/components/phone/PhonePreview";
import { StatistActions } from "@/components/StatistActions";
import { ProfileEditPanel } from "@/components/ProfileEditPanel";
import { RichText } from "@/components/RichText";
import { RichEditor } from "@/components/RichEditor";
import {
  ProfileFacts,
  ProfileFamilyTree,
  ProfileLikes,
  ProfileLooks,
  ProfileSkills,
  ProfileSliders,
  ProfileTimeline,
  ProfileTraits,
  SectionBox,
  SectionHeading,
} from "@/components/ProfileSections";
import type { Character, RelationCategory, Scene } from "@/lib/types";

// oben neben dem Avatar …
type TopTab = "general" | "inplay" | "relations";
// … und unten alles Beschreibende
type Tab = "character" | "look" | "biography" | "family" | "personal" | "moodboard";

// Bausteine aus DESIGN.md: Buttons, Primär-Aktion, Formularfelder
const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";
const btnPrimary =
  "rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-3 py-1.5";
const btnQuiet = "text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2";
// Raster des Profils (siehe DESIGN.md → Profil-Raster) – überall dieselben, damit
// die Reiter gleich aufgebaut sind:
// schmale Textspalte + breitere Inhaltsspalte (General: Beschreibung | Facts)
const SPLIT = "grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]";
// Karten-Listen in zwei Spalten (Scenes, Relations)
const CARDS = "grid items-start gap-3 lg:grid-cols-2";
// kleine Boxen nebeneinander (Facts-Gruppen)
const BOXES = "grid grid-cols-1 gap-5 sm:grid-cols-2";
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
    scenes,
    smsScenes,
    postsOf,
    posts,
    canEditCharacter,
  } = store;
  const c = character(id);
  const [topTabState, setTopTab] = useState<TopTab>("general");
  const [tabState, setTab] = useState<Tab>("character");

  const [editing, setEditing] = useState(false);
  useEditFromUrl(setEditing);

  // Charaktername als Unterseiten-Titel in den Banner-Header heben
  useSetPageMeta(
    c ? c.name : "Charakter",
    undefined,
    // eigenes Header-Bild des Charakters (sonst das der Seite); Statist*innen
    // haben keins (auch nicht als frühere Supporting Characters)
    (c && tierOf(c) !== "extra" ? c.banner_url : null) ?? undefined,
    "max-w-6xl",
    undefined,
    undefined,
    // Konto der Spieler*in gelöscht: Name im Titel durchgestrichen
    c ? ownerGone(c, player) : false,
    undefined,
    // Etikett über dem Namen
    c ? "Character File" : undefined,
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

  // Statist*innen haben nur die Grundangaben → Kompaktansicht. Was ein früherer
  // Supporting Character darüber hinaus ausgefüllt hat (Beschreibung, Skills …),
  // bleibt gespeichert, erscheint aber erst wieder, wenn er hochgestuft wird.
  if (tierOf(c) === "extra") {
    return <NpcFacts c={c} />;
  }

  // Wer den Charakter spielt: Ersteller*in plus alle Zugeordneten (Supporting
  // Characters und zeitweise bespielte Statist*innen können mehrere haben)
  const owners = [c.player_id, ...(c.co_owner_ids ?? [])]
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((id) => player(id))
    .filter((x): x is NonNullable<typeof x> => !!x);
  const presenceOf = (id: string): "online" | "idle" | null =>
    id === store.currentPlayerId || (store.onlineIds.includes(id) && !store.idleIds.includes(id))
      ? "online"
      : store.onlineIds.includes(id)
        ? "idle"
        : null;
  const inScenes = scenes.filter((s) => s.participant_ids.includes(c.id));
  const postCount = posts.filter((x) => x.character_id === c.id).length;
  // Reiter „Scenes": gespielte Szenen, Anrufe und SMS-Szenen
  const profileScenes = [...inScenes, ...smsScenes.filter((s) => s.participant_ids.includes(c.id))];

  // Mitspieler-Charaktere (für RELATIONS) aus gemeinsamen Szenen – auch Supporting
  // Characters; Statist*innen und Charaktere im Papierkorb nicht
  const coCharIds = new Set<string>();
  for (const s of inScenes)
    for (const pid of s.participant_ids) if (pid !== c.id) coCharIds.add(pid);
  // SCs posten oft, ohne fest in der Szene eingetragen zu sein
  const inSceneIds = new Set(inScenes.map((s) => s.id));
  for (const p of posts)
    if (p.character_id && p.character_id !== c.id && inSceneIds.has(p.scene_id)) coCharIds.add(p.character_id);
  const coChars = Array.from(coCharIds)
    .map((cid) => character(cid))
    .filter((x): x is Character => !!x && !x.deleted_at && tierOf(x) !== "extra");

  // Reiter ohne Inhalt werden nicht angezeigt (noch nichts eingetragen / vorhanden)
  const topTabs: [TopTab, string][] = [
    ["general", "General"],
    ...(profileScenes.length > 0 ? ([["inplay", "Scenes"]] as [TopTab, string][]) : []),
    ...(coChars.length > 0 ? ([["relations", "Relations"]] as [TopTab, string][]) : []),
  ];
  const tabs: [Tab, string][] = [
    ...(hasCharacterContent(c) ? ([["character", "Character"]] as [Tab, string][]) : []),
    ...(hasLooksContent(c) ? ([["look", "Looks"]] as [Tab, string][]) : []),
    ...(c.profile?.timeline?.length ? ([["biography", "Biography"]] as [Tab, string][]) : []),
    ...(c.profile?.family?.length ? ([["family", "Family Tree"]] as [Tab, string][]) : []),
    // „Pockets": das Handy und die Gegenstände (nicht bei Statist*innen)
    ...(tierOf(c) !== "extra" && (hasPhone(c) || (c.profile?.things ?? []).length > 0)
      ? ([["personal", "Pockets"]] as [Tab, string][])
      : []),
    // eingebundenes Pinterest-Board, falls eines hinterlegt ist
    ...(c.pinterest_url ? ([["moodboard", "Moodboard"]] as [Tab, string][]) : []),
  ];
  // Gewählter Reiter, sonst der erste vorhandene
  const topTab: TopTab = topTabs.some(([k]) => k === topTabState) ? topTabState : "general";
  const tab: Tab | null = tabs.some(([k]) => k === tabState) ? tabState : (tabs[0]?.[0] ?? null);
  const tabBtn = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
      active ? "bg-accent text-black font-medium" : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-1 pb-8">
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

      {/* Trennlinie zur Seite; die Reiter stehen mittig zwischen ihr und dem Strich darunter */}
      <div className="border-b border-border-subtle mt-4 mb-5" />

      {/* OBEN: General (Kurzbeschreibung, daneben die Facts in Gruppen) · Scenes · Relations */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
        {topTabs.map(([key, label]) => (
          <button key={key} onClick={() => setTopTab(key)} className={tabBtn(topTab === key)}>
            {label}
          </button>
        ))}
      </div>
      {/* Strich unter den Reitern */}
      <TabRule />
      {topTab === "general" && (
        <div className={SPLIT}>
          {/* Kurzbeschreibung, darüber „meet <Vorname>." */}
          <section>
            <SectionHeading>meet {c.name.split(" ")[0]}.</SectionHeading>
            {c.bio ? (
              <RichText html={c.bio} className="text-[0.875rem] leading-relaxed text-text-secondary" />
            ) : (
              <p className="text-[0.875rem] text-text-tertiary">Noch keine Kurzbeschreibung.</p>
            )}
          </section>
          {/* Facts (Looks stehen im Reiter „Looks") */}
          <div className={BOXES}>
            <ProfileFacts c={c} />
          </div>
        </div>
      )}
      {topTab === "inplay" && <InplayTab inScenes={profileScenes} />}
      {topTab === "relations" && (
        <RelationsTab c={c} coChars={coChars} canEdit={playsAs(c, store.currentPlayerId)} />
      )}

      {tabs.length > 0 && (
        <>
      <div className="mt-6 mb-5 border-b border-border-subtle" />

      {/* UNTEN: Reiter + Inhalt, linksbündig über die ganze Breite */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={tabBtn(tab === key)}>
            {label}
          </button>
        ))}
      </div>
      <TabRule />

      {/* Das Pinterest-Board wird schon beim Öffnen des Profils aufgebaut (unsichtbar),
          damit es beim Wechsel auf den Reiter sofort da ist */}
      {c.pinterest_url && (
        <section
          aria-hidden={tab !== "moodboard"}
          className={tab === "moodboard" ? "" : "invisible h-0 overflow-hidden"}
        >
          <SectionHeading>moodboard.</SectionHeading>
          <PinterestBoard url={c.pinterest_url} />
        </section>
      )}
      {/* „Pockets": was der Charakter bei sich hat – das Handy, nur zum Ansehen
          (Look, Startbildschirm, Kontaktliste), daneben die Collage der
          Gegenstände; mittig, mobil untereinander */}
      {tab === "personal" && tierOf(c) !== "extra" && (
        <>
        <SectionHeading>pockets.</SectionHeading>
        <section className="flex flex-col items-center justify-center gap-10 md:flex-row md:items-start">
          {/* ohne Handy (Einstellungen) nur die Gegenstände */}
          {hasPhone(c) && (
            <div className="max-w-full shrink-0">
              <PhonePreview character={c} />
            </div>
          )}
          <ThingsBoard items={c.profile?.things ?? []} />
          {!hasPhone(c) && !(c.profile?.things ?? []).length && (
            <p className="text-[0.875rem] text-text-tertiary">Nichts in den Taschen.</p>
          )}
        </section>
        </>
      )}
      {tab === "character" && <CharacterTab c={c} />}
      {tab === "look" && <LookTab c={c} />}
      {tab === "biography" &&
        (c.profile?.timeline?.length ? (
          <ProfileTimeline c={c} />
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">Noch keine Timeline hinterlegt.</p>
        ))}
      {tab === "family" &&
        (c.profile?.family?.length ? (
          <>
            <SectionHeading>family tree.</SectionHeading>
            <ProfileFamilyTree c={c} />
          </>
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">Noch kein Stammbaum hinterlegt.</p>
        ))}

        </>
      )}

      {/* Footer */}
      <div className="mt-6 border-t border-border-subtle pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-display lowercase text-[1.625rem] leading-none text-accent">brought to you by</span>
          {owners.length > 0 ? (
            owners.map((o) => {
              // gelöschtes Konto: nur der ausgegraute Name, kein Pilltag, kein Link
              if (o.deleted_at) {
                return (
                  <span key={o.id} title="Konto gelöscht" className={`text-[0.875rem] ${GONE_PLAYER_CLASS}`}>
                    {o.username}
                  </span>
                );
              }
              const presence = presenceOf(o.id);
              return (
                <Bubble
                  key={o.id}
                  href={`/spieler/${o.username}`}
                  leading={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={playerImage(o)} alt="" className="h-5 w-5 rounded-full object-cover" />
                  }
                >
                  {o.username}
                  {/* Online-Status wie in der Spieler*innen-Übersicht: grün = online, gelb = anderswo */}
                  {presence && (
                    <span
                      title={presence === "online" ? "online" : "online, gerade anderswo"}
                      className={`h-2 w-2 shrink-0 rounded-full ${presence === "online" ? "bg-green-500" : "bg-yellow-400"}`}
                    />
                  )}
                </Bubble>
              );
            })
          ) : (
            <span className="text-text-tertiary">–</span>
          )}
        </div>
        <div className="mt-2 text-[0.8125rem] text-text-tertiary">
          {postCount} {postCount === 1 ? "Post" : "Posts"} · Registriert am{" "}
          {formatInplayDate(c.created_at.slice(0, 10))}
          {owners.length === 1 && !owners[0].deleted_at && <> · Zuletzt online {timeAgo(owners[0].last_seen)}</>}
        </div>
      </div>
    </div>
  );
}

// Kompaktansicht für Statist*innen: Facts, Looks, Moodboard und die Orte, an denen
// sie hinterlegt sind. Bearbeitet wird direkt hier (nur die Grundangaben).
function NpcFacts({ c }: { c: Character }) {
  const { locations, scenes, player, canEditCharacter } = useStore();
  const [editing, setEditing] = useState(false);
  useEditFromUrl(setEditing);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl">
        <ProfileFacts c={c} />
        <ProfileLooks c={c} />
        <Vibes c={c} />

        {foundAt.length > 0 && (
          <SectionBox title="spotted here.">
            <div className="flex flex-wrap gap-1.5">
              {foundAt.map((l) => (
                <LocationBubble
                  key={l.id}
                  id={l.id}
                  name={l.name}
                  category={l.category}
                  played={scenes.some(
                    (s) => s.location_area === l.area && s.location_name === l.name,
                  )}
                />
              ))}
            </div>
          </SectionBox>
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

// Frisch angelegter Charakter (…?bearbeiten): Profil gleich mit offener
// Bearbeitung zeigen, danach den Zusatz aus der Adresse nehmen
function useEditFromUrl(setEditing: (on: boolean) => void) {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("bearbeiten")) return;
    setEditing(true);
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [setEditing]);
}

// Zitat anzeigen/hinzufügen – volle Breite über "facts".
// Zitat des Charakters (bearbeitet wird es über „Bearbeiten" im Profil)
function QuoteBlock({ c }: { c: Character }) {
  if (!c.quote) return null;
  return (
    <p className="text-left text-[1.125rem] leading-snug text-text-primary">
      <span className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
      <RichText inline html={c.quote} />
    </p>
  );
}

// Moodboard aus Inspo-Bildern (Feld `vibes`) – vor allem bei Statist*innen, die
// alternativ ein Pinterest-Board einbinden können. „Vibes" heißen nur die Fotos
// der Orte.
function Vibes({ c }: { c: Character }) {
  const vibes = c.vibes ?? [];
  if (tierOf(c) === "extra" && c.pinterest_url) {
    return (
      <SectionBox title="moodboard." className="sm:col-span-2 lg:col-span-2">
        <PinterestBoard url={c.pinterest_url} />
      </SectionBox>
    );
  }
  if (vibes.length === 0) return null;
  return (
    <SectionBox title="moodboard." className="sm:col-span-2 lg:col-span-2">
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
    </SectionBox>
  );
}

// Ausführliche Beschreibung und alles, was den Charakter ausmacht
// Hat der Reiter „Character" etwas zu zeigen?
function hasCharacterContent(c: Character): boolean {
  const p = c.profile ?? {};
  return !!(
    c.personality ||
    p.traits_plus?.length ||
    p.traits_minus?.length ||
    p.skills?.length ||
    p.sliders?.length ||
    p.likes?.length ||
    p.dislikes?.length ||
    c.vibes?.length
  );
}

// … und der Reiter „Looks"?
function hasLooksContent(c: Character): boolean {
  return (
    !!c.profile?.looks_note ||
    !!c.faceclaim ||
    (c.profile?.outfit ?? []).length > 0 ||
    (["height", "figure", "hair", "eyes"] as const).some((k) => c[k] && !isHidden(c, k))
  );
}

function CharacterTab({ c }: { c: Character }) {
  const empty = !hasCharacterContent(c);
  const p = c.profile ?? {};
  // die ausgefüllten Boxen, in fester Reihenfolge
  const boxes = [
    (p.traits_plus?.length || p.traits_minus?.length) && <ProfileTraits key="traits" c={c} />,
    p.skills?.length && <ProfileSkills key="skills" c={c} />,
    p.sliders?.length && <ProfileSliders key="sliders" c={c} />,
    (p.likes?.length || p.dislikes?.length) && <ProfileLikes key="likes" c={c} />,
  ].filter((x): x is React.ReactElement => !!x);
  // Bei ungerader Anzahl (eine oder drei) bliebe neben einer Box eine Lücke –
  // dann rückt die erste Box neben den About-Text, der sonst die Zeile füllt.
  const beside = c.personality && boxes.length % 2 === 1 ? boxes.shift() : null;
  const about = c.personality && (
    <SectionBox title="about.">
      <RichText html={c.personality} className="text-[0.875rem] leading-relaxed text-text-secondary" />
    </SectionBox>
  );
  return (
    <div className="flex flex-col gap-5">
      {beside ? (
        // items-start: jede Box so hoch wie ihr Inhalt
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {about}
          {beside}
        </div>
      ) : (
        about
      )}
      {boxes.length > 0 && <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">{boxes}</div>}
      <Vibes c={c} />
      {empty && (
        <p className="text-[0.875rem] text-text-tertiary">Noch keine Charakterbeschreibung hinterlegt.</p>
      )}
    </div>
  );
}

// Aussehen: links das Style-Whiteboard (Collage wie bei den Pockets, gepflegt
// über „Bearbeiten"), rechts der Fließtext über die ganze Breite und darunter
// die Angaben – die Box ist nur so hoch wie ihr Inhalt. Ohne Whiteboard füllen
// Text und Angaben die Zeile.
function LookTab({ c }: { c: Character }) {
  const outfit = c.profile?.outfit ?? [];
  if (!hasLooksContent(c)) {
    return <p className="text-[0.875rem] text-text-tertiary">Noch nichts zum Aussehen hinterlegt.</p>;
  }
  return (
    <div className={`grid grid-cols-1 items-start gap-5 ${outfit.length > 0 ? "lg:grid-cols-2" : ""}`}>
      {outfit.length > 0 && (
        // ohne Box – die Collage steht frei unter ihrer Überschrift und füllt die Spalte
        <section>
          <SectionHeading>style.</SectionHeading>
          <ThingsBoard items={outfit} fill />
        </section>
      )}
      <ProfileLooks c={c} wide />
    </div>
  );
}

function InplayTab({ inScenes }: { inScenes: Scene[] }) {
  return (
    <section>
      <SectionHeading>scenes.</SectionHeading>
      {inScenes.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">Noch in keiner Szene.</p>
      ) : (
        <SceneFilterList scenes={inScenes} className={CARDS} />
      )}
    </section>
  );
}

const RELATION_HINT_USES = 3;

function RelationsTab({
  c,
  coChars,
  canEdit,
}: {
  c: Character;
  coChars: Character[];
  canEdit: boolean;
}) {
  const { currentPlayer } = useStore();
  // Der Hinweis erklärt die Funktion nur, bis sie sitzt: Nach ein paar
  // Eintragungen (gezählt im eigenen Profil, siehe RelationRow) verschwindet er.
  const showHint = canEdit && (currentPlayer?.profile?.relation_uses ?? 0) < RELATION_HINT_USES;
  return (
    <section>
      <SectionHeading>relations.</SectionHeading>
      {coChars.length === 0 ? (
        <p className="text-[0.875rem] text-text-tertiary">
          Noch keine Verbindungen – sobald zwei Charaktere eine gemeinsame Szene
          hatten, erscheint die Verbindung hier automatisch.
        </p>
      ) : (
        <>
          {showHint && (
            <p className="mb-4 text-[0.8125rem] text-text-tertiary">
              Verbindungen werden automatisch aus gemeinsamen Szenen erkannt. Trag ein, um was für
              eine Beziehung es sich handelt.
            </p>
          )}
          {/* nach Kategorie gruppiert; ohne Kategorie stehen sie zuletzt */}
          {[...RELATION_CATEGORIES, [null, "others."] as const].map(([key, title]) => {
            const rows = coChars.filter((rc) => (c.relationships?.[rc.id]?.category ?? null) === key);
            if (rows.length === 0) return null;
            return (
              <div key={title} className="mb-6">
                <h3 className="mb-2 font-display lowercase text-[1.25rem] leading-none text-text-primary">
                  {title}
                </h3>
                <div className={CARDS}>
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
  const { updateCharacter, updatePlayer, currentPlayer } = useStore();
  // Jede Eintragung/Leerung zählt als Nutzung der Funktion (für den Hinweis oben)
  const countUse = () => {
    const uses = currentPlayer?.profile?.relation_uses ?? 0;
    if (currentPlayer && uses < RELATION_HINT_USES) {
      updatePlayer(currentPlayer.id, { profile: { ...(currentPlayer.profile ?? {}), relation_uses: uses + 1 } });
    }
  };
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
    countUse();
    setEditing(false);
  }

  const rcAge = ageAt(rc);
  const facts = [rcAge != null ? `${rcAge}` : null, capFirst(rc.role), rel.label].filter(Boolean).join(" · ");

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
            countUse();
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
          {/* gemeinsame Szenen der beiden in der Szenen-Übersicht */}
          <Link
            href={`/szenen?chars=${c.id},${rc.id}`}
            className="mt-0.5 inline-flex items-center gap-1 text-[0.8125rem] text-text-tertiary hover:text-accent"
          >
            <Icon name="book" size={12} /> Gemeinsame Szenen
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
            <option value="friends" className="bg-bg-surface">
              Friends
            </option>
            <option value="acquainted" className="bg-bg-surface">
              Acquainted
            </option>
            <option value="foes" className="bg-bg-surface">
              Foes
            </option>
            <option value="past" className="bg-bg-surface">
              Past
            </option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Beziehung (z. B. Freunde, Ex, Rivalen)"
            className={field}
          />
          <RichEditor
            value={note}
            onChange={setNote}
            placeholder="Kurze Erläuterung zur Beziehung…"
            minHeight="min-h-[4rem]"
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
        rel.note ? (
          <RichText html={rel.note} className="mt-2 text-[0.875rem] text-text-secondary leading-relaxed" />
        ) : (
          <p className="mt-2 text-[0.875rem] leading-relaxed text-text-tertiary">Noch keine Beschreibung.</p>
        )
      )}
      </div>
    </div>
  );
}
