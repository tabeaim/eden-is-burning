"use client";

import { ScriptEditor, ScriptView, useScriptViewer, useSpeaker } from "@/components/Script";
import { isScript, parseScript, scriptPlain, serializeScript, type ScriptLine } from "@/lib/script";
import { useOpenPlace } from "@/components/LocationCategoryPicker";
import { useMyPhone } from "@/components/phone/PhoneFrame";
import { use, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { escapeHtml, formatDateTime, formatInplayDate, renderPost } from "@/lib/format";
import { postHtml } from "@/lib/html";
import { copyRich, useProseEditor } from "@/lib/editor";
import { FormatBar } from "@/components/RichEditor";
import { useSetPageMeta } from "@/lib/page-meta";
import { SignatureText, signatureAlign } from "@/components/SignatureText";
import { SceneAvatarToggle, SceneCharacterCard } from "@/components/SceneCharacterCard";
import { SceneEditPanel } from "@/components/SceneEditPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/Icon";
import { CharacterBubble, LocationBubble } from "@/components/Bubble";
import { PHONE_AREA } from "@/lib/phone";
import { scenePlace } from "@/lib/chats";
import { tierOf } from "@/lib/characters";
import { AuTag } from "@/components/SceneCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CharacterSelect } from "@/components/CharacterSelect";
import type { Character, Post, PostDraft, Scene } from "@/lib/types";
import { useCharacterIn } from "@/lib/use-versions";
import { VersionForm } from "@/components/VersionEditor";
import { characterIn } from "@/lib/versions";

function focusReplyEditor() {
  const el = document.getElementById("reply-box");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => document.getElementById("reply-editor")?.focus(), 350);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Markiert Vorkommen von `term` im gerenderten Post-HTML mit <mark class="search-hit">,
// ohne dabei in HTML-Tags hineinzuschreiben.
function highlightTerm(html: string, term: string): string {
  const t = term.trim();
  if (!t) return html;
  const re = new RegExp(`(${escapeRegExp(t)})`, "gi");
  return html
    .split(/(<[^>]+>)/g)
    .map((seg) =>
      seg.startsWith("<")
        ? seg
        : seg.replace(re, '<mark class="search-hit">$1</mark>'),
    )
    .join("");
}

// Ca.-Zeilen pro Seite (Pagination nach geschätzter Zeilenzahl, nicht nach
// Post-Anzahl). ~280 Zeilen ≈ etwa 5 durchschnittlich lange Posts pro Seite.
const LINES_PER_PAGE = 280;

function estimateLines(html: string): number {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  let lines = 0;
  for (const seg of text.split("\n")) {
    lines += Math.max(1, Math.ceil(seg.trim().length / 90));
  }
  return Math.max(1, lines);
}

function paginate(posts: Post[]): Post[][] {
  const pages: Post[][] = [];
  let cur: Post[] = [];
  let curLines = 0;
  for (const p of posts) {
    const l = estimateLines(p.content);
    if (cur.length > 0 && curLines + l > LINES_PER_PAGE) {
      pages.push(cur);
      cur = [];
      curLines = 0;
    }
    cur.push(p);
    curLines += l;
  }
  if (cur.length) pages.push(cur);
  return pages.length ? pages : [[]];
}

export default function ScenePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useStore();
  const { scenes, character, player, postsOf, currentPlayer, charactersOf } =
    store;
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const postsTop = useRef<HTMLDivElement>(null);
  // Seitenwechsel: an den Anfang der neuen Seite springen (sonst bliebe man unten)
  function goPage(i: number) {
    setPage(i);
    requestAnimationFrame(() => postsTop.current?.scrollIntoView({ block: "start" }));
  }
  // Antwortfeld erscheint erst nach Klick auf „Antworten"
  const [replyOpen, setReplyOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  // Entwurf, der gerade im Antwortfeld weitergeschrieben wird
  const [draftId, setDraftId] = useState<string | null>(null);
  // große Avatare neben den Posts und Signaturen wegklappen (nur am Desktop),
  // pro Gerät gemerkt
  const [avatarsHidden, setAvatarsHidden] = useState(false);
  useEffect(() => {
    try {
      setAvatarsHidden(localStorage.getItem("eden:scene-avatars-hidden") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  function toggleAvatars() {
    const hidden = !avatarsHidden;
    setAvatarsHidden(hidden);
    try {
      localStorage.setItem("eden:scene-avatars-hidden", hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  const avatarToggle = { hidden: avatarsHidden, toggle: toggleAvatars };

  const scene = scenes.find((s) => s.id === id);
  // Charaktere so, wie sie in dieser Szene auftreten (AU- oder Szenen-Version)
  const characterHere = useCharacterIn(scene);
  const posts = scene ? postsOf(scene.id) : [];
  // Die Texte der Posts kommen erst beim Öffnen der Szene (siehe loadScenePosts)
  const { loadScenePosts, postsEpoch } = store;
  useEffect(() => {
    if (scene?.id) void loadScenePosts(scene.id);
  }, [scene?.id, postsEpoch, loadScenePosts]);
  const postsLoading = posts.some((p) => p.partial);
  const turnId = scene ? whoseTurn(scene, posts) : null;

  // Das Handy in der Navigation gehört dem eigenen Charakter dieser Szene – sind
  // mehrere dabei, dem, der dran ist (sonst bleibt ein schon gewählter von ihnen)
  const { myChars: phoneChars, stored: phoneOwner, setOwner: setPhoneOwner } = useMyPhone();
  const myHere = phoneChars.filter((c) => scene?.participant_ids.includes(c.id)).map((c) => c.id);
  const phoneFor = myHere.includes(turnId ?? "")
    ? turnId
    : myHere.includes(phoneOwner ?? "")
      ? phoneOwner
      : myHere[0];
  useEffect(() => {
    if (phoneFor && phoneFor !== phoneOwner) setPhoneOwner(phoneFor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneFor]);

  // Sub-Seite: Titel in den Banner-Header, die Daten als Untertitel-Zeile
  // (dort, wo auf anderen Seiten die Tagline/der Untertitel steht), plus das
  // gewählte Header-Bild der Szene.
  // Ort · Gegend · Datum, Tageszeit – was fehlt (Ortsname, Tageszeit), entfällt
  // samt Trenner; ohne Ortsnamen steht nur die Gegend da.
  const factsLine = scene
    ? [
        scene.location_name.trim(),
        scene.location_area === PHONE_AREA
          ? scene.location_name.trim()
            ? ""
            : scenePlace(scene)
          : scene.location_area && areaName(scene.location_area),
        [formatInplayDate(scene.inplay_date), scene.inplay_time.trim()].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  useSetPageMeta(
    scene?.title ?? "Szene",
    factsLine,
    scene?.header_url ?? undefined,
    "max-w-6xl",
    scene?.status,
  );

  // Szene als gesehen markieren (setzt das "neu"-Tag zurück) und – falls aus der
  // Post-Suche verlinkt (#post-<id>) – zum passenden Post springen und hervorheben.
  useEffect(() => {
    if (!scene || postsLoading) return;
    store.markSceneSeen(scene.id);
    const params = new URLSearchParams(window.location.search);
    setSearchTerm(params.get("q") ?? "");
    const hash = window.location.hash;
    if (hash.startsWith("#post-")) {
      const anchorId = hash.slice(1); // "post-<id>"
      const postId = anchorId.replace(/^post-/, "");
      // Zielpost kann auf einer anderen Seite liegen -> dorthin blättern
      const pgs = paginate(postsOf(scene.id));
      const pIdx = pgs.findIndex((pg) => pg.some((p) => p.id === postId));
      if (pIdx >= 0) setPage(pIdx);
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          // Suchtreffer: mittig + kurz umrahmt. Sprung zum neuesten Post: nur
          // hinscrollen, ohne Rahmen.
          const isSearchHit = params.has("q");
          el.scrollIntoView({ behavior: "smooth", block: isSearchHit ? "center" : "start" });
          if (isSearchHit) {
            el.classList.add("ring-2", "ring-accent", "rounded-lg");
            setTimeout(
              () => el.classList.remove("ring-2", "ring-accent", "rounded-lg"),
              2200,
            );
          }
        }
      }, 320);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.id, posts.length, postsLoading]);

  if (!scene) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-text-tertiary">
        Szene nicht gefunden.{" "}
        <Link href="/szenen" className="underline">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  // Meine Charaktere: Main Characters und Nebenfiguren, die ich bespiele
  const myChars: Character[] = currentPlayer
    ? [...charactersOf(currentPlayer.id), ...store.myNpcs]
    : [];
  const myCharsInScene = myChars.filter((c) => scene.participant_ids.includes(c.id));
  const myTurn = !!turnId && myCharsInScene.some((c) => c.id === turnId);
  const isParticipant = myCharsInScene.length > 0;
  // Antworten darf jede*r mit einem eigenen Charakter – auch in fremden Szenen;
  // wer mit einem neuen Charakter schreibt, steigt damit in die Szene ein.
  // Über das Suchfeld erreichbar: alle Statist*innen (jede*r darf sie bespielen)
  const extras = store.npcs.filter((c) => tierOf(c) === "extra" && !myChars.includes(c));
  const canReply = scene.status === "active" && !!currentPlayer && myChars.length + extras.length > 0;
  const sceneId = scene.id;
  const participantIds = scene.participant_ids;

  const pages = paginate(postsLoading ? [] : posts);
  const safePage = Math.min(page, pages.length - 1);
  const pagePosts = pages[safePage] ?? [];

  // Meine Entwürfe zu dieser Szene (andere sieht man nie) – der älteste zuerst
  const myDrafts = store.drafts
    .filter((d) => d.scene_id === sceneId && character(d.character_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const openDraft = replyOpen ? myDrafts.find((d) => d.id === draftId) : undefined;
  const lastPage = safePage === Math.max(0, pages.length - 1);

  function openReply(draft?: PostDraft) {
    setPage(Math.max(0, pages.length - 1));
    setDraftId(draft?.id ?? null);
    setReplyOpen(true);
    setTimeout(focusReplyEditor, 120);
  }
  // Zug an den nächsten Charakter in der Reihenfolge weitergeben
  function passTurn() {
    if (!turnId) return;
    const next = participantIds[(participantIds.indexOf(turnId) + 1) % participantIds.length];
    if (next && next !== turnId) store.updateScene(sceneId, { next_up: next });
  }
  function startClosing() {
    setClosing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const actionBtn =
    "flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-8"
      data-avatars={avatarsHidden ? "hidden" : undefined}
    >
      <SceneAvatarToggle.Provider value={avatarToggle}>
      {/* Szenenkopf: Status + Charaktere + Aktions-Buttons, Datum/Ort/AU, Beschreibung */}
      <SceneHeader
        scene={scene}
        activeCharId={turnId}
        myTurn={myTurn}
        isParticipant={isParticipant}
        canReply={canReply}
        onReply={() => openReply()}
        onPassTurn={passTurn}
        closing={closing}
        setClosing={setClosing}
      />

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-4" />


      {/* Trefferleiste der Post-Text-Suche */}
      {searchTerm && <PostSearchBar term={searchTerm} />}

      {/* Posts (Ping-Pong), getrennt durch eine Akzentlinie */}
      <div ref={postsTop} className="flex scroll-mt-24 flex-col">
        {pagePosts.map((post, i) => {
          const c = characterHere(post.character_id);
          if (!c) return null;
          return (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className={`scroll-mt-24 ${i > 0 ? "mt-7 pt-7 border-t border-accent/40" : ""}`}
            >
              <PostRow
                post={post}
                character={c}
                player={player(c.player_id)}
                term={searchTerm}
                at={scene.inplay_date}
              />
            </div>
          );
        })}
      </div>

      {postsLoading && <p className="py-10 text-center text-[0.875rem] text-text-tertiary">Posts werden geladen …</p>}

      {/* Seitennavigation bei langen Szenen */}
      {pages.length > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
          <button
            disabled={safePage === 0}
            onClick={() => goPage(safePage - 1)}
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            ‹ Zurück
          </button>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goPage(i)}
              className={`rounded-md px-3 py-1.5 text-[0.8125rem] ${
                i === safePage
                  ? "bg-accent text-black font-medium"
                  : "border border-border-subtle bg-white/[0.04] text-text-secondary hover:text-text-primary"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={safePage === pages.length - 1}
            onClick={() => goPage(safePage + 1)}
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            Weiter ›
          </button>
        </div>
      )}

      {/* Entwürfe: hängen unter der Szene, sieht nur, wer sie geschrieben hat */}
      {lastPage &&
        myDrafts
          .filter((d) => d.id !== openDraft?.id)
          .map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              scene={scene}
              canPublish={canReply}
              onEdit={() => openReply(d)}
            />
          ))}

      {/* Antwort-Editor – erst nach Klick auf „Antworten", auf der letzten Seite */}
      {canReply && replyOpen && lastPage && (
        <ReplyBox
          key={openDraft?.id ?? "new"}
          draft={openDraft}
          scene={scene}
          // Charaktere der Szene zuerst, dann die übrigen eigenen
          myChars={[...myCharsInScene, ...myChars.filter((c) => !myCharsInScene.includes(c))]}
          extras={extras}
          suggestedCharId={
            turnId && myCharsInScene.some((c) => c.id === turnId)
              ? turnId
              : (myCharsInScene[0] ?? myChars[0] ?? extras[0])?.id ?? null
          }
          onClose={() => setReplyOpen(false)}
        />
      )}

      {/* Aktionen unten wiederholt (wie im Szenenkopf) */}
      {scene.status === "active" && (canReply || isParticipant) && (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {canReply && !replyOpen && (
            <button
              onClick={() => openReply()}
              title={myTurn ? "Du bist am Zug" : undefined}
              className={
                myTurn
                  ? "flex items-center gap-1.5 rounded-md border border-accent/70 bg-accent-soft px-3 py-1.5 text-[0.8125rem] text-text-primary"
                  : actionBtn
              }
            >
              <Icon name="message" size={14} /> Antworten
            </button>
          )}
          {myTurn && scene.participant_ids.length > 2 && (
            <button onClick={passTurn} className={actionBtn} title="Zug weitergeben">
              <Icon name="arrow-right" size={14} /> Weitergeben
            </button>
          )}
          {isParticipant && (
            <button onClick={startClosing} className={actionBtn}>
              <Icon name="check" size={14} /> Beenden
            </button>
          )}
        </div>
      )}
      </SceneAvatarToggle.Provider>
    </div>
  );
}

// Szenenkopf: Status + Charaktere (aktiver markiert) links, Aktions-Buttons
// rechts (gleiche Höhe), darunter Datum/Ort/AU und Beschreibung. Nur teilnehmende
// Spieler·innen sehen die Buttons. Editier-/Beenden-Panel ersetzt den Kopf.
function SceneHeader({
  scene,
  activeCharId,
  myTurn,
  isParticipant,
  canReply,
  onReply,
  onPassTurn,
  closing,
  setClosing,
}: {
  scene: Scene;
  activeCharId: string | null;
  myTurn: boolean;
  isParticipant: boolean;
  canReply: boolean; // auch ohne eigenen Charakter in der Szene
  onReply: () => void;
  onPassTurn: () => void;
  closing: boolean;
  setClosing: (v: boolean) => void;
}) {
  const { updateScene, locationsOf, isAdmin } = useStore();
  const character = useCharacterIn(scene);
  const [versions, setVersions] = useState(false);
  // Ortsprofil zum Szenen-Ort (falls ein Eintrag existiert) → Ort anklickbar
  const loc = scene.location_name
    ? locationsOf(scene.location_area).find((l) => l.name === scene.location_name)
    : undefined;
  const openPlace = useOpenPlace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];

  function end() {
    updateScene(scene.id, {
      status: "closed",
      summary: draft.trim() || scene.summary || null,
    });
    setClosing(false);
  }

  if (editing) {
    return <SceneEditPanel scene={scene} onClose={() => setEditing(false)} />;
  }
  if (versions) {
    return <SceneVersionsPanel scene={scene} onClose={() => setVersions(false)} />;
  }

  if (closing) {
    return (
      <div className="mb-6 rounded-xl border border-border-subtle bg-bg-surface p-4">
        <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary mb-2">
          Szene beenden – Zusammenfassung (ein Satz, optional)
        </div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && end()}
          placeholder={scene.summary ?? "Worum ging es in dieser Szene?"}
          autoFocus
          className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            onClick={() => setClosing(false)}
            className="text-[0.8125rem] text-text-tertiary hover:text-text-primary px-2"
          >
            Abbrechen
          </button>
          <button
            onClick={end}
            className="rounded-md bg-accent/90 hover:bg-accent text-black text-[0.8125rem] font-medium px-4 py-2"
          >
            Beenden
          </button>
        </div>
      </div>
    );
  }

  const btn =
    "flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";

  return (
    <div className="mb-6">
      {/* Status + Charaktere links, Aktions-Buttons rechts (gleiche Höhe). Ab `md`
          bleiben die Buttons immer rechts oben – viele Charaktere brechen links
          in sich um, statt die Buttons in die nächste Zeile zu schieben. */}
      <div className="flex flex-wrap items-start justify-between gap-3 md:flex-nowrap">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:flex-1">
        <StatusBadge status={scene.status} sceneId={scene.id} />
        {scene.draft && (
          <span
            title="Nur für dich sichtbar, bis du den ersten Post veröffentlichst"
            className="rounded bg-white/[0.06] px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-secondary"
          >
            Entwurf
          </span>
        )}
        {scene.paused && (
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[0.8125rem] uppercase tracking-wider text-text-tertiary">
            pausiert
          </span>
        )}
        {scene.trigger_warning && (
          <span className="rounded-full bg-red-500/15 text-red-300/90 text-[0.8125rem] uppercase tracking-wider px-2 py-0.5">
            Triggerwarnung
          </span>
        )}
        {participants.map((c) => {
          const isTurn = scene.status === "active" && c.id === activeCharId;
          return (
            <CharacterBubble
              key={c.id}
              character={c}
              firstNameOnly
              tone={isTurn ? "accent" : undefined}
              trailing={isTurn && <Icon name="flame" size={12} className="text-accent" />}
            />
          );
        })}
        </div>

        {(isParticipant || canReply || isAdmin) && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 md:shrink-0 md:flex-nowrap">
            {/* Antworten, Weitergeben, Beenden: auf dem Handy nur unter den Posts */}
            {canReply && (
              <button
                onClick={onReply}
                title={myTurn ? "Du bist am Zug" : undefined}
                className={`max-md:hidden ${
                  myTurn
                    ? "flex items-center gap-1.5 rounded-md border border-accent/70 bg-accent-soft px-3 py-1.5 text-[0.8125rem] text-text-primary"
                    : btn
                }`}
              >
                <Icon name="message" size={14} /> Antworten
              </button>
            )}
            {scene.status === "active" && myTurn && scene.participant_ids.length > 2 && (
              <button onClick={onPassTurn} className={`max-md:hidden ${btn}`} title="Zug weitergeben">
                <Icon name="arrow-right" size={14} /> Weitergeben
              </button>
            )}
            {scene.status === "active" && isParticipant && (
              <button onClick={() => setClosing(true)} className={`max-md:hidden ${btn}`}>
                <Icon name="check" size={14} /> Beenden
              </button>
            )}
            {scene.status === "closed" && (isParticipant || isAdmin) && (
              <button
                onClick={() => updateScene(scene.id, { status: "active" })}
                className={btn}
              >
                <Icon name="flame" size={14} /> Wieder eröffnen
              </button>
            )}
            {/* Versionen: eigene Charaktere in dieser Szene (oder im AU) anders zeigen */}
            {isParticipant && (
              <button onClick={() => setVersions(true)} className={btn} title="Bild und Grunddaten für diese Szene oder das AU">
                <Icon name="users" size={14} /> Versionen
              </button>
            )}
            {/* Bearbeiten: Beteiligte und Admins – auch bei geschlossenen Szenen */}
            {(isParticipant || isAdmin) && (
              <button onClick={() => setEditing(true)} className={btn}>
                <Icon name="edit" size={14} /> Bearbeiten
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ort als Bubble · Datum, Tageszeit (+ AU) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.875rem] text-text-tertiary">
        {scenePlace(scene) && (
          <LocationBubble
            id={loc?.id}
            name={scenePlace(scene)}
            category={loc?.category}
            icon={scene.location_area === PHONE_AREA ? "phone" : scene.location_name.trim() ? undefined : "map"}
            // Ort ohne Eintrag (Import): Ortsseite beim Anklicken anlegen
            onClick={
              scene.location_area !== PHONE_AREA && scene.location_name.trim()
                ? () => openPlace(scene.location_area, scene.location_name.trim())
                : undefined
            }
          />
        )}
        <span>
          {scenePlace(scene) && "· "}
          {formatInplayDate(scene.inplay_date)}
          {scene.inplay_time.trim() && `, ${scene.inplay_time.trim()}`}
        </span>
        {scene.au && (
          <span>
            · <AuTag scene={scene} />
          </span>
        )}
      </div>

      {/* Beschreibungssatz */}
      {scene.summary && (
        <p className="mt-3 font-serif text-[0.875rem] italic text-text-secondary leading-relaxed">
          {scene.summary}
        </p>
      )}
    </div>
  );
}

// Versionen der eigenen Charaktere in dieser Szene: nur für diese Szene oder –
// in einer AU-Szene – für das ganze AU (gilt dann in allen Szenen dieses AUs).
function SceneVersionsPanel({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const { currentPlayer, charactersOf, myNpcs } = useStore();
  const mine = (currentPlayer ? [...charactersOf(currentPlayer.id), ...myNpcs] : []).filter((c) =>
    scene.participant_ids.includes(c.id),
  );
  const auName = scene.au ? scene.au_name?.trim() || null : null;
  const [charId, setCharId] = useState(mine[0]?.id ?? null);
  const [kind, setKind] = useState<"scene" | "au">(() => {
    const c = mine[0];
    return auName && c?.profile?.versions?.au?.[auName] && !c.profile.versions.scene?.[scene.id] ? "au" : "scene";
  });
  const c = mine.find((x) => x.id === charId) ?? mine[0];
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
      active ? "bg-accent text-black font-medium" : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="mb-6 rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">Versionen</div>
        <button onClick={onClose} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
          Fertig
        </button>
      </div>
      <p className="mb-4 text-[0.8125rem] text-text-tertiary">
        Bild, Name und Grunddaten anders zeigen – nur in dieser Szene
        {auName ? <> oder in allen Szenen des AUs „{auName}“</> : null}. Leere Felder bleiben wie im Profil.
      </p>
      {!c ? (
        <p className="text-[0.875rem] text-text-tertiary">Du hast keinen Charakter in dieser Szene.</p>
      ) : (
        <>
          {mine.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {mine.map((x) => (
                <button key={x.id} onClick={() => setCharId(x.id)} className={pill(x.id === c.id)}>
                  {x.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
          {auName && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button onClick={() => setKind("scene")} className={pill(kind === "scene")}>
                Nur diese Szene
              </button>
              <button onClick={() => setKind("au")} className={pill(kind === "au")}>
                Ganzes AU · {auName}
              </button>
            </div>
          )}
          <VersionForm
            key={`${c.id}:${kind}`}
            character={c}
            kind={auName ? kind : "scene"}
            versionKey={auName && kind === "au" ? auName : scene.id}
          />
        </>
      )}
    </div>
  );
}

// Trefferleiste der Post-Text-Suche: zählt Vorkommen und springt zwischen ihnen.
function PostSearchBar({ term }: { term: string }) {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const marks = document.querySelectorAll<HTMLElement>("mark.search-hit");
    setCount(marks.length);
    setIdx(0);
    marks.forEach((m, i) => m.classList.toggle("search-hit-current", i === 0));
  }, [term]);

  function go(dir: number) {
    const marks = Array.from(
      document.querySelectorAll<HTMLElement>("mark.search-hit"),
    );
    if (marks.length === 0) return;
    const next = (idx + dir + marks.length) % marks.length;
    marks.forEach((m, i) => m.classList.toggle("search-hit-current", i === next));
    marks[next].scrollIntoView({ behavior: "smooth", block: "center" });
    setIdx(next);
  }

  if (!term.trim() || count === 0) return null;
  return (
    <div className="sticky top-2 z-10 mb-4 flex w-fit items-center gap-3 rounded-full border border-border-subtle bg-bg-surface-2 px-3 py-1.5 text-[0.8125rem] text-text-secondary shadow-lg">
      <span className="text-text-primary">{term}</span>
      <span>
        {idx + 1}/{count}
      </span>
      <button
        onClick={() => go(-1)}
        title="Vorheriger Treffer"
        className="hover:text-accent"
      >
        <span className="rotate-180 inline-flex">
          <Icon name="arrow-right" size={14} />
        </span>
      </button>
      <button
        onClick={() => go(1)}
        title="Nächster Treffer"
        className="hover:text-accent"
      >
        <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

function PostRow({
  post,
  character,
  player,
  term,
  at,
}: {
  post: Post;
  character: Character;
  player?: ReturnType<typeof useStore>["players"][number];
  term?: string;
  at?: string; // Inplay-Datum der Szene (Alter der Charaktere zu diesem Zeitpunkt)
}) {
  const { addQuote, currentPlayer, isAdmin, updatePost, deletePost, canWriteAs, charactersOf, myNpcs } = useStore();
  // Drehbuch-Format: der Post besteht aus Regie- und Dialogzeilen (siehe lib/script.ts)
  const script = useMemo(() => parseScript(post.content), [post.content]);
  const viewer = useScriptViewer(post.scene_id);
  const speaker = useSpeaker(viewer);
  const [editLines, setEditLines] = useState<ScriptLine[]>([]);
  // Eigene Posts – oder als Admin alle – dürfen bearbeitet/gelöscht werden.
  const canModify = !!currentPlayer && (canWriteAs(character.id) || isAdmin);
  const wrapRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const [quoteBtn, setQuoteBtn] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  useProseEditor(editRef, editing);
  const [copied, setCopied] = useState(false);
  // Avatare/Signaturen ein-/ausklappen (Zustand liegt auf der Szenenseite)
  const avatars = useContext(SceneAvatarToggle);

  // Ganzen Post samt Formatierung kopieren – so, wie er im Editor steht
  async function copy() {
    const plain = script ? scriptPlain(script, (l) => speaker(l).name) : "";
    const ok = script
      ? await copyRich(plain.split("\n").map((l) => `<p>${escapeHtml(l)}</p>`).join(""), plain)
      : await copyRich(renderPost(post.content), proseRef.current?.innerText ?? "");
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Bei Textauswahl im Post „Zitat hinzufügen" anbieten. Die Auswahl selbst bleibt
  // stehen und lässt sich ganz normal kopieren (Tastatur oder Rechtsklick).
  function onMouseUp(e: React.MouseEvent) {
    if (e.button !== 0) return; // Rechtsklick auf die Auswahl: Browser-Menü, nichts ändern
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (
      !text ||
      !sel ||
      !sel.anchorNode ||
      !proseRef.current?.contains(sel.anchorNode) ||
      !wrapRef.current
    ) {
      setQuoteBtn(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const wrap = wrapRef.current.getBoundingClientRect();
    setQuoteBtn({
      x: rect.left - wrap.left + rect.width / 2,
      y: rect.top - wrap.top,
      text,
    });
  }

  function saveQuote() {
    if (!quoteBtn) return;
    addQuote(post.id, quoteBtn.text);
    setQuoteBtn(null);
  }

  function startEdit() {
    setQuoteBtn(null);
    setEditing(true);
    if (script) return setEditLines(script);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = post.content;
        editRef.current.focus();
      }
    }, 0);
  }

  function saveEdit() {
    updatePost(
      post.id,
      script ? serializeScript(editLines) || post.content : (editRef.current?.innerHTML ?? post.content),
    );
    setEditing(false);
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  function remove() {
    setConfirmDelete(true);
  }

  // Gleiches Objekt über Renderings hinweg: React fasst das HTML dann nicht an und
  // die Textauswahl geht beim Einblenden des Zitat-Knopfs nicht verloren.
  const html = useMemo(
    () => ({ __html: highlightTerm(postHtml(post.content), term ?? "") }),
    [post.content, term],
  );
  const card = <SceneCharacterCard character={character} player={player} at={at} />;
  const prose = editing ? (
    <div className="flex-1 min-w-0">
      {script ? (
        <ScriptEditor
          lines={editLines}
          onChange={setEditLines}
          self={character}
          mine={currentPlayer ? [...charactersOf(currentPlayer.id), ...myNpcs] : []}
        />
      ) : (
        <>
        <FormatBar target={editRef} className="mb-2" />
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          lang="de"
          spellCheck
          className="reply-editor prose-serif w-full min-h-[120px] rounded-md border border-border-subtle bg-bg-primary px-4 py-3 text-text-primary outline-none focus:border-white/20"
        />        </>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => setEditing(false)}
          className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
        >
          Abbrechen
        </button>
        <button
          onClick={saveEdit}
          className="rounded-md bg-accent/90 hover:bg-accent px-4 py-1.5 text-[0.8125rem] font-medium text-black"
        >
          Speichern
        </button>
      </div>
    </div>
  ) : (
    <div
      ref={wrapRef}
      className="post-box relative flex-1 min-w-0 select-text"
      onMouseUp={onMouseUp}
    >
      {script ? (
        <div ref={proseRef}>
          <ScriptView lines={script} viewer={viewer} />
        </div>
      ) : (
        <div
          ref={proseRef}
          className="prose-serif text-text-primary"
          dangerouslySetInnerHTML={html}
        />
      )}
      {/* Signatur des Charakters (Einstellungen → Meine Charaktere): Text und/oder Bild */}
      {character.profile?.signature_text && (
        <SignatureText
          html={character.profile.signature_text}
          align={character.profile.signature_align}
          className="post-signature mt-6 select-none"
        />
      )}
      {character.profile?.signature_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={character.profile.signature_url}
          alt=""
          loading="lazy"
          draggable={false}
          className={`post-signature ${character.profile.signature_text ? "mt-2" : "mt-6"} ${signatureAlign(character.profile.signature_align).image} block max-w-full select-none`}
        />
      )}
      {quoteBtn && (
        <div
          style={{ left: quoteBtn.x, top: quoteBtn.y }}
          className="absolute z-20 -mt-1 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-md border border-border-subtle bg-bg-surface-2 px-1 py-1 text-[0.8125rem] text-text-secondary shadow-lg"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={saveQuote}
            className="flex items-center gap-1 px-1.5 hover:text-accent"
          >
            <Icon name="quote" size={12} /> Zitat hinzufügen
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="post-row group/post">
      {confirmDelete && (
        <ConfirmDialog
          title="Post löschen?"
          text={`Der Post von ${character.name} wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`}
          confirmLabel="Post löschen"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            deletePost(post.id);
          }}
        />
      )}
      {!editing && (
        <div className="mb-1 flex items-center justify-end gap-0.5 transition-opacity focus-within:opacity-100 group-hover/post:opacity-100 [@media(hover:hover)]:opacity-0">
          {/* wann der Post wirklich geschrieben wurde (nicht das Inplay-Datum) */}
          <span className="mr-1.5 text-[0.75rem] text-text-tertiary">gepostet {formatDateTime(post.created_at)}</span>
          {avatars && (
            <button
              onClick={avatars.toggle}
              title={avatars.hidden ? "Avatare ausklappen" : "Avatare einklappen"}
              aria-label={avatars.hidden ? "Avatare ausklappen" : "Avatare einklappen"}
              className="hidden rounded p-1 text-text-tertiary md:inline-block hover:bg-white/[0.06] hover:text-accent"
            >
              <Icon name="chevron-right" size={14} className={avatars.hidden ? "" : "rotate-180"} />
            </button>
          )}
          <button
            onClick={copy}
            title={copied ? "Kopiert" : "Post kopieren (mit Formatierung)"}
            aria-label="Post kopieren"
            className={`rounded p-1 hover:bg-white/[0.06] hover:text-accent ${copied ? "text-accent" : "text-text-tertiary"}`}
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
          </button>
          {canModify && (
            <>
              <button
                onClick={startEdit}
                title="Post bearbeiten"
                className="rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-accent"
              >
                <Icon name="edit" size={14} />
              </button>
              <button
                onClick={remove}
                title="Post löschen"
                className="rounded p-1 text-text-tertiary hover:bg-white/[0.06] hover:text-red-400"
              >
                <Icon name="trash" size={14} />
              </button>
            </>
          )}
        </div>
      )}
      <div className="post-layout flex flex-col md:flex-row gap-3 md:gap-7 items-start">
        {/* Drehbuch-Format: nur die Zeilen, ohne die große Charakter-Karte */}
        {!script && card}
        {prose}
      </div>
    </div>
  );
}

// Post veröffentlichen (aus dem Antwortfeld oder aus einem Entwurf)
function usePublish(scene: Scene) {
  const { addPost, updateScene, updateCharacter, currentPlayer } = useStore();
  return (c: Character, html: string) => {
    // Als Statist*in antworten heißt: sie (zeitweise) bespielen
    if (currentPlayer && tierOf(c) === "extra" && !(c.co_owner_ids ?? []).includes(currentPlayer.id)) {
      updateCharacter(c.id, { co_owner_ids: [...(c.co_owner_ids ?? []), currentPlayer.id] });
    }
    // Mit einem neuen Charakter antworten heißt: in die Szene einsteigen
    if (!scene.participant_ids.includes(c.id)) {
      updateScene(scene.id, { participant_ids: [...scene.participant_ids, c.id] });
    }
    addPost(scene.id, c.id, html);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  };
}

// Entwurf unter der Szene: sieht aus wie ein Post, gestrichelt umrandet und nur
// für die Person sichtbar, die ihn geschrieben hat.
function DraftRow({
  draft,
  scene,
  canPublish,
  onEdit,
}: {
  draft: PostDraft;
  scene: Scene;
  canPublish: boolean; // Szene aktiv
  onEdit: () => void;
}) {
  const { player, deleteDraft, deleteScene, drafts } = useStore();
  const character = useCharacterIn(scene);
  const router = useRouter();
  const publish = usePublish(scene);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Entwurfs-Szene: mit ihrem letzten Entwurf verschwindet auch die Szene
  const lastOfDraftScene =
    !!scene.draft && drafts.filter((d) => d.scene_id === scene.id).length <= 1;
  const c = character(draft.character_id);
  const html = useMemo(() => ({ __html: postHtml(draft.content) }), [draft.content]);
  const script = useMemo(() => parseScript(draft.content), [draft.content]);
  const viewer = useScriptViewer(scene.id);
  if (!c) return null;
  const btn =
    "flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";
  return (
    <div className="mt-7 rounded-xl border border-dashed border-border-strong p-4 sm:p-5">
      {confirmDelete && (
        <ConfirmDialog
          title="Entwurf löschen?"
          text={
            lastOfDraftScene
              ? `Der Entwurf für ${c.name} wird endgültig gelöscht – und mit ihm die Szene „${scene.title}“, die noch ein Entwurf ist. Das lässt sich nicht rückgängig machen.`
              : `Der Entwurf für ${c.name} wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`
          }
          confirmLabel={lastOfDraftScene ? "Entwurf und Szene löschen" : "Entwurf löschen"}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (!lastOfDraftScene) return deleteDraft(draft.id);
            router.push("/szenen");
            deleteScene(scene.id);
          }}
        />
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="text-[0.8125rem] text-text-tertiary">
          <span className="mr-2 rounded bg-white/[0.06] px-2 py-0.5 uppercase tracking-wider text-text-secondary">
            Entwurf
          </span>
          nur für dich sichtbar · gespeichert {formatDateTime(draft.updated_at)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPublish && (
            <button onClick={onEdit} className={btn}>
              <Icon name="edit" size={14} /> Weiterschreiben
            </button>
          )}
          {canPublish && (
            <button
              onClick={() => {
                publish(c, draft.content);
                deleteDraft(draft.id);
              }}
              className="flex items-center gap-1.5 rounded-md border border-accent/70 bg-accent-soft px-3 py-1.5 text-[0.8125rem] text-text-primary"
            >
              <Icon name="check" size={14} /> Veröffentlichen
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-400/10"
          >
            <Icon name="trash" size={14} /> Löschen
          </button>
        </div>
      </div>
      <div className="post-layout flex flex-col md:flex-row gap-3 md:gap-7 items-start">
        {!script && <SceneCharacterCard character={c} player={player(c.player_id)} at={scene.inplay_date} />}
        {script ? (
          <div className="post-box min-w-0 flex-1">
            <ScriptView lines={script} viewer={viewer} />
          </div>
        ) : (
          <div className="prose-serif min-w-0 flex-1 text-text-primary" dangerouslySetInnerHTML={html} />
        )}
      </div>
    </div>
  );
}

function ReplyBox({
  draft,
  scene,
  myChars,
  extras,
  suggestedCharId,
  onClose,
}: {
  draft?: PostDraft; // ein gespeicherter Entwurf wird weitergeschrieben
  scene: Scene;
  myChars: Character[]; // alle eigenen Charaktere – auch die (noch) nicht in der Szene
  extras: Character[]; // Statist*innen, die ich (noch) nicht bespiele – per Suche wählbar
  suggestedCharId: string | null;
  onClose: () => void;
}) {
  const { character, player, saveDraft, deleteDraft } = useStore();
  const publish = usePublish(scene);
  const [activeCharId, setActiveCharId] = useState<string | null>(draft?.character_id ?? suggestedCharId);
  const [preview, setPreview] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  useProseEditor(editorRef);
  // Drehbuch-Format: Zeilen-Editor statt Fließtext
  const script = isScript(scene);
  const viewer = useScriptViewer(scene.id);
  const [lines, setLines] = useState<ScriptLine[]>(
    () => parseScript(draft?.content) ?? [{ k: "line", who: draft?.character_id ?? suggestedCharId, text: "" }],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!draft) setActiveCharId(suggestedCharId);
  }, [suggestedCharId, draft]);
  // Entwurf ins Feld legen (einmal beim Öffnen – das Feld gehört danach dem Browser)
  useEffect(() => {
    if (draft && editorRef.current) editorRef.current.innerHTML = draft.content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePreview() {
    setPreview((p) => (p === null ? (script ? serializeScript(lines) : (editorRef.current?.innerHTML ?? "")) : null));
  }

  const baseChar = activeCharId ? character(activeCharId) : myChars[0];
  const activeChar = baseChar ? characterIn(baseChar, scene) : undefined;

  function send() {
    const html = script ? serializeScript(lines) : (editorRef.current?.innerHTML ?? "");
    const text = script ? html : (editorRef.current?.textContent?.trim() ?? "");
    if (!activeChar || !text) return;
    publish(activeChar, html);
    if (draft) deleteDraft(draft.id);
    if (editorRef.current) editorRef.current.innerHTML = "";
    onClose();
  }

  // Als Entwurf speichern: hängt unter der Szene, nur für mich sichtbar
  function keepDraft() {
    const html = script ? serializeScript(lines) : (editorRef.current?.innerHTML ?? "");
    const text = script ? html : (editorRef.current?.textContent?.trim() ?? "");
    if (!activeChar || !text) return;
    saveDraft(scene.id, activeChar.id, html, draft?.id);
    onClose();
  }

  return (
    <div id="reply-box" className="mt-10 rounded-xl border border-border-subtle bg-bg-surface p-5">
      {/* Vorschau des Posts (wie er unter dem letzten Post erscheinen würde) */}
      {preview !== null && activeChar && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-bg-primary/40 p-4">
          <div className="mb-3 text-[0.875rem] uppercase tracking-wider text-accent">
            Vorschau
          </div>
          <div className="post-layout flex flex-col md:flex-row gap-3 md:gap-7 items-start">
            {!script && (
              <SceneCharacterCard
                character={activeChar}
                player={player(activeChar.player_id)}
              />
            )}
            {script ? (
              <div className="min-w-0 flex-1">
                <ScriptView lines={parseScript(preview) ?? []} viewer={viewer} />
              </div>
            ) : (
              <div
                className="prose-serif min-w-0 flex-1 text-text-primary"
                dangerouslySetInnerHTML={{
                  __html:
                    postHtml(preview) ||
                    "<span style='opacity:.5'>(noch nichts geschrieben)</span>",
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
              Antwort als
            </div>
            <div className="mt-1">
              {myChars.length + extras.length > 1 ? (
                <CharacterSelect
                  // In der Liste nur die Main Characters; Nebenfiguren über die Suche darunter
                  characters={myChars.filter((c) => !c.is_npc)}
                  value={activeChar?.id ?? null}
                  onChange={(id) => {
                    // Dialogzeilen des bisherigen Charakters wechseln mit
                    setLines((ls) =>
                      ls.map((l) => (l.k === "line" && l.who === activeChar?.id ? { ...l, who: id } : l)),
                    );
                    setActiveCharId(id);
                  }}
                  hint={(c) => (scene.participant_ids.includes(c.id) ? null : "steigt neu ein")}
                  // Suche: Supporting Characters, denen ich zugeordnet bin, und alle Statist*innen
                  search={{ placeholder: "SC oder Statist*in …", characters: [...myChars.filter((c) => c.is_npc), ...extras] }}
                />
              ) : (
                <div className="text-[0.875rem] text-text-primary">{activeChar?.name}</div>
              )}
            </div>
            {activeChar && !scene.participant_ids.includes(activeChar.id) && (
              <div className="mt-0.5 text-[0.8125rem] text-accent">steigt neu in die Szene ein</div>
            )}
          </div>
        </div>
      </div>

      {script ? (
        // Drehbuch-Format: Regie- und Dialogzeilen statt Fließtext
        <ScriptEditor lines={lines} onChange={setLines} self={activeChar} mine={myChars} />
      ) : (
        <>
        {/* Formatierungs-Toolbar */}
        <FormatBar target={editorRef} className="mb-2" />

        <div
          id="reply-editor"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          lang="de"
          spellCheck
          data-placeholder={`Schreibe als ${activeChar?.name}…`}
          className="reply-editor prose-serif min-h-[160px] w-full rounded-md border border-border-subtle bg-bg-primary px-4 py-3 text-[0.9375rem] leading-[1.9] text-text-primary outline-none focus:border-white/20"
        />
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-[0.875rem] text-text-tertiary">
          {draft
            ? "Entwurf – nur für dich sichtbar"
            : script
              ? ""
              : "Formatierung wird beim Einfügen übernommen"}
        </span>
        <button
          onClick={onClose}
          className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
        >
          Abbrechen
        </button>
        <button
          onClick={togglePreview}
          className={`rounded-md border border-border-subtle px-4 py-2 text-[0.8125rem] transition-colors ${
            preview !== null
              ? "bg-accent-soft border-accent/50 text-text-primary"
              : "bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary"
          }`}
        >
          {preview !== null ? "Vorschau aus" : "Vorschau"}
        </button>
        <button
          onClick={keepDraft}
          title="Hängt unter der Szene, bleibt aber nur für dich sichtbar, bis du ihn veröffentlichst"
          className="rounded-md border border-border-subtle bg-white/[0.04] px-4 py-2 text-[0.8125rem] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
        >
          {draft ? "Entwurf speichern" : "Als Entwurf speichern"}
        </button>
        <button
          onClick={send}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary transition-colors"
        >
          {draft ? "Veröffentlichen" : "Senden"}
        </button>
      </div>
    </div>
  );
}
