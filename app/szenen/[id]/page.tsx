"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, renderPost } from "@/lib/format";
import { useSetPageMeta } from "@/lib/page-meta";
import { SceneCharacterCard } from "@/components/SceneCharacterCard";
import { SceneEditPanel } from "@/components/SceneEditPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/Icon";
import { CharacterBubble, LocationBubble } from "@/components/Bubble";
import { PHONE_AREA } from "@/lib/phone";
import { AuTag } from "@/components/SceneCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Character, Post, Scene } from "@/lib/types";

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
  // Antwortfeld erscheint erst nach Klick auf „Antworten"
  const [replyOpen, setReplyOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const scene = scenes.find((s) => s.id === id);
  const posts = scene ? postsOf(scene.id) : [];
  const turnId = scene ? whoseTurn(scene, posts) : null;

  // Sub-Seite: Titel in den Banner-Header, die Daten als Untertitel-Zeile
  // (dort, wo auf anderen Seiten die Tagline/der Untertitel steht), plus das
  // gewählte Header-Bild der Szene.
  const factsLine = scene
    ? `${scene.location_name}${
        scene.location_area === PHONE_AREA ? "" : ` · ${areaName(scene.location_area)}`
      } · ${formatInplayDate(
        scene.inplay_date,
      )}, ${scene.inplay_time}`
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
    if (!scene) return;
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
  }, [scene?.id, posts.length]);

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

  const myChars: Character[] = currentPlayer ? charactersOf(currentPlayer.id) : [];
  const myCharsInScene = myChars.filter((c) => scene.participant_ids.includes(c.id));
  const myTurn = !!turnId && myCharsInScene.some((c) => c.id === turnId);
  const isParticipant = myCharsInScene.length > 0;
  // Antworten darf jede*r mit einem eigenen Charakter – auch in fremden Szenen;
  // wer mit einem neuen Charakter schreibt, steigt damit in die Szene ein.
  const canReply = scene.status === "active" && myChars.length > 0;
  const sceneId = scene.id;
  const participantIds = scene.participant_ids;

  const pages = paginate(posts);
  const safePage = Math.min(page, pages.length - 1);
  const pagePosts = pages[safePage] ?? [];

  function openReply() {
    setPage(Math.max(0, pages.length - 1));
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
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-8">
      {/* Szenenkopf: Status + Charaktere + Aktions-Buttons, Datum/Ort/AU, Beschreibung */}
      <SceneHeader
        scene={scene}
        activeCharId={turnId}
        myTurn={myTurn}
        isParticipant={isParticipant}
        canReply={canReply}
        onReply={openReply}
        onPassTurn={passTurn}
        closing={closing}
        setClosing={setClosing}
      />

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-4" />

      {/* Trefferleiste der Post-Text-Suche */}
      {searchTerm && <PostSearchBar term={searchTerm} />}

      {/* Posts (Ping-Pong), getrennt durch eine Akzentlinie */}
      <div className="flex flex-col">
        {pagePosts.map((post, i) => {
          const c = character(post.character_id);
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
              />
            </div>
          );
        })}
      </div>

      {/* Seitennavigation bei langen Szenen */}
      {pages.length > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
          <button
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            ‹ Zurück
          </button>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
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
            onClick={() => setPage(safePage + 1)}
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            Weiter ›
          </button>
        </div>
      )}

      {/* Antwort-Editor – erst nach Klick auf „Antworten", auf der letzten Seite */}
      {canReply && replyOpen && safePage === Math.max(0, pages.length - 1) && (
        <ReplyBox
          scene={scene}
          // Charaktere der Szene zuerst, dann die übrigen eigenen
          myChars={[...myCharsInScene, ...myChars.filter((c) => !myCharsInScene.includes(c))]}
          suggestedCharId={
            turnId && myCharsInScene.some((c) => c.id === turnId)
              ? turnId
              : (myCharsInScene[0] ?? myChars[0])?.id ?? null
          }
          onClose={() => setReplyOpen(false)}
        />
      )}

      {/* Aktionen unten wiederholt (wie im Szenenkopf) */}
      {scene.status === "active" && (canReply || isParticipant) && (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {canReply && !replyOpen && (
            <button
              onClick={openReply}
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
          {myTurn && (
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
  const { character, updateScene, locationsOf } = useStore();
  // Ortsprofil zum Szenen-Ort (falls ein Eintrag existiert) → Ort anklickbar
  const loc = locationsOf(scene.location_area).find(
    (l) => l.name === scene.location_name,
  );
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
      {/* Status + Charaktere links, Aktions-Buttons rechts (gleiche Höhe) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={scene.status} sceneId={scene.id} />
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

        {(isParticipant || canReply) && (
          <div className="flex flex-wrap items-center gap-2">
            {canReply && (
              <button
                onClick={onReply}
                title={myTurn ? "Du bist am Zug" : undefined}
                className={
                  myTurn
                    ? "flex items-center gap-1.5 rounded-md border border-accent/70 bg-accent-soft px-3 py-1.5 text-[0.8125rem] text-text-primary"
                    : btn
                }
              >
                <Icon name="message" size={14} /> Antworten
              </button>
            )}
            {scene.status === "active" && myTurn && (
              <button onClick={onPassTurn} className={btn} title="Zug weitergeben">
                <Icon name="arrow-right" size={14} /> Weitergeben
              </button>
            )}
            {scene.status === "active" && isParticipant && (
              <button onClick={() => setClosing(true)} className={btn}>
                <Icon name="check" size={14} /> Beenden
              </button>
            )}
            {scene.status === "closed" && isParticipant && (
              <button
                onClick={() => updateScene(scene.id, { status: "active" })}
                className={btn}
              >
                <Icon name="flame" size={14} /> Wieder eröffnen
              </button>
            )}
            {isParticipant && (
              <button onClick={() => setEditing(true)} className={btn}>
                <Icon name="edit" size={14} /> Bearbeiten
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ort als Bubble · Datum, Tageszeit (+ AU) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.875rem] text-text-tertiary">
        <LocationBubble
          id={loc?.id}
          name={scene.location_name}
          icon={scene.location_area === PHONE_AREA ? "phone" : "map"}
        />
        <span>
          · {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
        </span>
        {scene.au && (
          <span>
            · <AuTag scene={scene} />
          </span>
        )}
      </div>

      {/* Beschreibungssatz */}
      {scene.summary ? (
        <p className="mt-3 font-serif text-[0.875rem] italic text-text-secondary leading-relaxed">
          {scene.summary}
        </p>
      ) : (
        <p className="mt-3 text-[0.875rem] text-text-tertiary">
          Noch keine Zusammenfassung hinterlegt – beim Beenden der Szene ergänzbar.
        </p>
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
}: {
  post: Post;
  character: Character;
  player?: ReturnType<typeof useStore>["players"][number];
  term?: string;
}) {
  const { addQuote, currentPlayer, isAdmin, updatePost, deletePost } = useStore();
  // Eigene Posts – oder als Admin alle – dürfen bearbeitet/gelöscht werden.
  const canModify =
    !!currentPlayer && (character.player_id === currentPlayer.id || isAdmin);
  const wrapRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const [quoteBtn, setQuoteBtn] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);

  // Bei Textauswahl im Post: Buttons zum Zitieren oder Kopieren anbieten.
  function onMouseUp() {
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

  function copySelection() {
    if (!quoteBtn) return;
    navigator.clipboard?.writeText(quoteBtn.text).catch(() => {});
    setQuoteBtn(null);
  }

  function startEdit() {
    setQuoteBtn(null);
    setEditing(true);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.innerHTML = post.content;
        editRef.current.focus();
      }
    }, 0);
  }

  function saveEdit() {
    updatePost(post.id, editRef.current?.innerHTML ?? post.content);
    setEditing(false);
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  function remove() {
    setConfirmDelete(true);
  }

  const card = <SceneCharacterCard character={character} player={player} />;
  const prose = editing ? (
    <div className="flex-1 min-w-0">
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        className="reply-editor prose-serif w-full min-h-[120px] rounded-md border border-border-subtle bg-bg-primary px-4 py-3 text-text-primary outline-none focus:border-white/20"
      />
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
      className="relative flex-1 min-w-0 select-text"
      onMouseUp={onMouseUp}
    >
      <div
        ref={proseRef}
        className="prose-serif text-text-primary"
        dangerouslySetInnerHTML={{
          __html: highlightTerm(renderPost(post.content), term ?? ""),
        }}
      />
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
            <Icon name="quote" size={12} /> Zitat
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={copySelection}
            className="flex items-center gap-1 px-1.5 hover:text-accent"
          >
            <Icon name="copy" size={12} /> Kopieren
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="group/post">
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
      {canModify && !editing && (
        <div className="mb-1 flex justify-end gap-0.5 opacity-0 transition-opacity group-hover/post:opacity-100 focus-within:opacity-100">
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
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {card}
        {prose}
      </div>
    </div>
  );
}

function ReplyBox({
  scene,
  myChars,
  suggestedCharId,
  onClose,
}: {
  scene: Scene;
  myChars: Character[]; // alle eigenen Charaktere – auch die (noch) nicht in der Szene
  suggestedCharId: string | null;
  onClose: () => void;
}) {
  const { addPost, updateScene, character, player } = useStore();
  const [activeCharId, setActiveCharId] = useState<string | null>(suggestedCharId);
  const [preview, setPreview] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCharId(suggestedCharId);
  }, [suggestedCharId]);

  function togglePreview() {
    setPreview((p) => (p === null ? editorRef.current?.innerHTML ?? "" : null));
  }

  const activeChar = activeCharId ? character(activeCharId) : myChars[0];

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function send() {
    const html = editorRef.current?.innerHTML ?? "";
    const text = editorRef.current?.textContent?.trim() ?? "";
    if (!activeChar || !text) return;
    // Mit einem neuen Charakter antworten heißt: in die Szene einsteigen
    if (!scene.participant_ids.includes(activeChar.id)) {
      updateScene(scene.id, { participant_ids: [...scene.participant_ids, activeChar.id] });
    }
    addPost(scene.id, activeChar.id, html);
    if (editorRef.current) editorRef.current.innerHTML = "";
    onClose();
    setTimeout(
      () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      50,
    );
  }

  const toolBtn =
    "rounded px-2 py-1 text-[0.875rem] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]";

  return (
    <div id="reply-box" className="mt-10 rounded-xl border border-border-subtle bg-bg-surface p-5">
      {/* Vorschau des Posts (wie er unter dem letzten Post erscheinen würde) */}
      {preview !== null && activeChar && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-bg-primary/40 p-4">
          <div className="mb-3 text-[0.875rem] uppercase tracking-wider text-accent">
            Vorschau
          </div>
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <SceneCharacterCard
              character={activeChar}
              player={player(activeChar.player_id)}
            />
            <div
              className="prose-serif min-w-0 flex-1 text-text-primary"
              dangerouslySetInnerHTML={{
                __html:
                  renderPost(preview) ||
                  "<span style='opacity:.5'>(noch nichts geschrieben)</span>",
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeChar?.faceclaim_image_url ?? ""}
            alt={activeChar?.name}
            className="w-8 h-8 rounded-full object-cover bg-bg-primary"
          />
          <div>
            <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">
              Antwort als
            </div>
            {myChars.length > 1 ? (
              <select
                value={activeChar?.id ?? ""}
                onChange={(e) => setActiveCharId(e.target.value)}
                aria-label="Charakter wählen"
                className="mt-0.5 max-w-full rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
              >
                {myChars.map((c) => (
                  <option key={c.id} value={c.id} className="bg-bg-surface">
                    {c.name}
                    {scene.participant_ids.includes(c.id) ? "" : " (steigt neu ein)"}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[0.875rem] text-text-primary">{activeChar?.name}</div>
            )}
            {activeChar && !scene.participant_ids.includes(activeChar.id) && (
              <div className="mt-0.5 text-[0.8125rem] text-accent">steigt neu in die Szene ein</div>
            )}
          </div>
        </div>
      </div>

      {/* Formatierungs-Toolbar */}
      <div className="mb-2 flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-primary px-1.5 py-1">
        <button onClick={() => exec("bold")} className={`${toolBtn} font-bold`} title="Fett">
          B
        </button>
        <button onClick={() => exec("italic")} className={`${toolBtn} italic`} title="Kursiv">
          I
        </button>
        <button onClick={() => exec("underline")} className={`${toolBtn} underline`} title="Unterstrichen">
          U
        </button>
        <span className="mx-1 h-4 w-px bg-border-subtle" />
        <button onClick={() => exec("fontSize", "5")} className={toolBtn} title="Größer">
          A+
        </button>
        <button onClick={() => exec("fontSize", "2")} className={toolBtn} title="Kleiner">
          A−
        </button>
      </div>

      <div
        id="reply-editor"
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={`Schreibe als ${activeChar?.name}…`}
        className="reply-editor prose-serif min-h-[160px] w-full rounded-md border border-border-subtle bg-bg-primary px-4 py-3 text-[0.875rem] leading-[1.8] text-text-primary outline-none focus:border-white/20"
      />

      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="mr-auto text-[0.875rem] text-text-tertiary">
          HTML wird übernommen
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
          onClick={send}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary transition-colors"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
