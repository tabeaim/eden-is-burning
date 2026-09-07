"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, renderPost } from "@/lib/format";
import { useSetPageMeta } from "@/lib/page-meta";
import { SceneCharacterCard } from "@/components/SceneCharacterCard";
import { Icon } from "@/components/Icon";
import type { Character, Post, Scene } from "@/lib/types";

function focusReplyEditor() {
  const el = document.getElementById("reply-box");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => document.getElementById("reply-editor")?.focus(), 350);
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

  const scene = scenes.find((s) => s.id === id);
  const posts = scene ? postsOf(scene.id) : [];
  const turnId = scene ? whoseTurn(scene, posts) : null;

  // Sub-Seite: Titel in den Banner-Header, die Daten als Untertitel-Zeile
  // (dort, wo auf anderen Seiten die Tagline/der Untertitel steht), plus das
  // gewählte Header-Bild der Szene.
  const factsLine = scene
    ? `${scene.location_name} · ${areaName(scene.location_area)} · ${formatInplayDate(
        scene.inplay_date,
      )}, ${scene.inplay_time}`
    : undefined;
  useSetPageMeta(
    scene?.title ?? "Szene",
    factsLine,
    scene?.header_url ?? undefined,
    "max-w-5xl",
    scene?.status,
  );

  if (!scene) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 text-text-tertiary">
        Szene nicht gefunden.{" "}
        <Link href="/szenen" className="underline">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  const sideOf = (charId: string): "left" | "right" => {
    const idx = scene.participant_ids.indexOf(charId);
    return idx % 2 === 0 ? "left" : "right";
  };

  const myCharsInScene: Character[] = currentPlayer
    ? charactersOf(currentPlayer.id).filter((c) =>
        scene.participant_ids.includes(c.id),
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto px-8 pt-4 pb-8">
      {/* Charaktere + Beschreibungssatz — direkt unter den Banner-Details,
          noch über der Trennlinie zur Seite */}
      <SceneFacts scene={scene} activeCharId={turnId} />

      {/* Trennlinie zur Seite */}
      <div className="border-b border-border-subtle mb-4" />

      {/* "Alle Szenen" über dem Details-bearbeiten-Button */}
      <Link
        href="/szenen"
        className="inline-flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary mb-3"
      >
        <span className="rotate-180 inline-flex">
          <Icon name="arrow-right" size={13} />
        </span>
        Alle Szenen
      </Link>

      {/* Aktionsleiste */}
      <SceneAdminBar scene={scene} />

      {/* Posts (Ping-Pong), getrennt durch eine Akzentlinie */}
      <div className="flex flex-col">
        {posts.map((post, i) => {
          const c = character(post.character_id);
          if (!c) return null;
          return (
            <div
              key={post.id}
              className={i > 0 ? "mt-7 pt-7 border-t border-accent/40" : ""}
            >
              <PostRow
                post={post}
                character={c}
                player={player(c.player_id)}
                side={sideOf(post.character_id)}
              />
            </div>
          );
        })}
      </div>

      {/* Antwort-Editor */}
      {scene.status === "active" && (
        <ReplyBox
          sceneId={scene.id}
          myChars={myCharsInScene}
          suggestedCharId={
            turnId && myCharsInScene.some((c) => c.id === turnId)
              ? turnId
              : myCharsInScene[0]?.id ?? null
          }
        />
      )}
    </div>
  );
}

// Charaktere (aktiver markiert) + Beschreibungssatz. (Ort/Datum/Tageszeit/Status
// stehen als Untertitel-Zeile im Banner-Header. Header-Bild → Details bearbeiten.)
function SceneFacts({
  scene,
  activeCharId,
}: {
  scene: Scene;
  activeCharId: string | null;
}) {
  const { character } = useStore();

  const participants = scene.participant_ids
    .map((id) => character(id))
    .filter(Boolean) as Character[];

  return (
    <div className="mb-6">
      {/* Charaktere — der Charakter, der am Zug ist, wird markiert */}
      <div className="flex flex-wrap items-center gap-1.5">
        {scene.trigger_warning && (
          <span className="rounded-full bg-red-500/15 text-red-300/90 text-[12px] uppercase tracking-wider px-2 py-0.5">
            Triggerwarnung
          </span>
        )}
        {participants.map((c) => {
          const isTurn = scene.status === "active" && c.id === activeCharId;
          return (
            <Link
              key={c.id}
              href={`/charaktere/${c.id}`}
              title={isTurn ? "am Zug" : undefined}
              className={`flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-0.5 text-[12px] transition-colors ${
                isTurn
                  ? "border-accent/70 bg-accent-soft text-text-primary"
                  : "border-border-subtle bg-bg-primary text-text-secondary hover:text-text-primary"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.faceclaim_image_url ?? ""}
                alt={c.name}
                className={`w-5 h-5 rounded-full object-cover ${isTurn ? "ring-2 ring-accent" : ""}`}
              />
              {c.name}
              {isTurn && <Icon name="flame" size={12} className="text-accent" />}
            </Link>
          );
        })}
      </div>

      {/* Beschreibungssatz */}
      {scene.summary ? (
        <p className="mt-3 font-serif text-[14px] italic text-text-secondary leading-relaxed">
          {scene.summary}
        </p>
      ) : (
        <p className="mt-3 text-[12px] text-text-tertiary">
          Noch keine Zusammenfassung hinterlegt — beim Beenden der Szene ergänzbar.
        </p>
      )}
    </div>
  );
}

// Aktionsleiste: links "bearbeiten" (Platzhalter), rechts "antworten" + "beenden".
function SceneAdminBar({ scene }: { scene: Scene }) {
  const { updateScene } = useStore();
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState("");

  function end() {
    updateScene(scene.id, { status: "closed", summary: draft.trim() || scene.summary || null });
    setClosing(false);
  }

  if (closing) {
    return (
      <div className="mb-8 rounded-xl border border-border-subtle bg-bg-surface p-4">
        <div className="text-[12px] uppercase tracking-wider text-text-tertiary mb-2">
          Szene beenden — Zusammenfassung (ein Satz, optional)
        </div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && end()}
          placeholder={scene.summary ?? "Worum ging es in dieser Szene?"}
          autoFocus
          className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-white/20"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            onClick={() => setClosing(false)}
            className="text-[12px] text-text-tertiary hover:text-text-primary px-2"
          >
            Abbrechen
          </button>
          <button
            onClick={end}
            className="rounded-md bg-accent/90 hover:bg-accent text-black text-[12px] font-medium px-4 py-2"
          >
            Beenden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {}}
          className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary"
        >
          <Icon name="edit" size={13} /> Details bearbeiten
        </button>
        <DownloadMenu />
      </div>
      {scene.status === "active" && (
        <div className="flex items-center gap-2">
          <button
            onClick={focusReplyEditor}
            className="rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary"
          >
            Antworten
          </button>
          <button
            onClick={() => setClosing(true)}
            className="rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary"
          >
            Beenden
          </button>
        </div>
      )}
    </div>
  );
}

// Download-Menü (Platzhalter — Export ist noch nicht implementiert)
function DownloadMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const formats: { label: string; key: string }[] = [
    { label: "Als PDF", key: "pdf" },
    { label: "Als Word (DOCX)", key: "docx" },
    { label: "Als Text (TXT)", key: "txt" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary"
      >
        <Icon name="download" size={13} /> Herunterladen
        <span className={`inline-flex transition-transform ${open ? "rotate-90" : ""}`}>
          <Icon name="arrow-right" size={11} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-border-subtle bg-bg-surface-2 p-1 shadow-xl">
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => setOpen(false)}
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[12px] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            >
              {f.label}
            </button>
          ))}
          <p className="px-2.5 pt-1 pb-0.5 text-[12px] text-text-tertiary">
            (noch ohne Funktion)
          </p>
        </div>
      )}
    </div>
  );
}

function PostRow({
  post,
  character,
  player,
  side,
}: {
  post: Post;
  character: Character;
  player?: ReturnType<typeof useStore>["players"][number];
  side: "left" | "right";
}) {
  const { addQuote } = useStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const [quoteBtn, setQuoteBtn] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );

  // Bei Textauswahl im Post: Button zum Speichern als Zitat anbieten.
  // Der Text wird NICHT im Post hinterlegt/markiert.
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
    window.getSelection()?.removeAllRanges();
    setQuoteBtn(null);
  }

  const card = <SceneCharacterCard character={character} player={player} />;
  const prose = (
    <div ref={wrapRef} className="relative flex-1 min-w-0" onMouseUp={onMouseUp}>
      <div
        ref={proseRef}
        className="prose-serif text-text-primary"
        dangerouslySetInnerHTML={{ __html: renderPost(post.content) }}
      />
      {quoteBtn && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={saveQuote}
          style={{ left: quoteBtn.x, top: quoteBtn.y }}
          className="absolute z-20 -mt-1 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-md border border-border-subtle bg-bg-surface-2 px-2 py-1 text-[12px] text-text-secondary shadow-lg hover:text-accent"
        >
          <Icon name="quote" size={12} /> Als Zitat speichern
        </button>
      )}
    </div>
  );

  return (
    <div className="flex gap-5 items-start">
      {side === "left" ? (
        <>
          {card}
          {prose}
        </>
      ) : (
        <>
          {prose}
          {card}
        </>
      )}
    </div>
  );
}

function ReplyBox({
  sceneId,
  myChars,
  suggestedCharId,
}: {
  sceneId: string;
  myChars: Character[];
  suggestedCharId: string | null;
}) {
  const { addPost, character, player } = useStore();
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

  if (myChars.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-border-subtle bg-bg-surface px-5 py-4 text-[12px] text-text-tertiary">
        Du spielst in dieser Szene keinen Charakter mit — daher kannst du hier
        nicht antworten.
      </div>
    );
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
    addPost(sceneId, activeChar.id, html);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setTimeout(
      () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      50,
    );
  }

  const toolBtn =
    "rounded px-2 py-1 text-[12px] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]";

  return (
    <div id="reply-box" className="mt-10 rounded-xl border border-border-subtle bg-bg-surface p-5">
      {/* Vorschau des Posts (wie er unter dem letzten Post erscheinen würde) */}
      {preview !== null && activeChar && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-bg-primary/40 p-4">
          <div className="mb-3 text-[12px] uppercase tracking-wider text-accent">
            Vorschau
          </div>
          <div className="flex gap-5 items-start">
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

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeChar?.faceclaim_image_url ?? ""}
            alt={activeChar?.name}
            className="w-8 h-8 rounded-full object-cover bg-bg-primary"
          />
          <div>
            <div className="text-[12px] uppercase tracking-wider text-text-tertiary">
              Antwort als
            </div>
            <div className="text-[14px] text-text-primary">{activeChar?.name}</div>
          </div>
        </div>

        {myChars.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-text-tertiary">Charakter wechseln:</span>
            {myChars.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCharId(c.id)}
                className={`rounded-full px-2.5 py-1 text-[12px] transition-colors ${
                  c.id === activeChar?.id
                    ? "bg-white/[0.1] text-text-primary"
                    : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
                }`}
              >
                {c.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
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
        className="reply-editor prose-serif min-h-[160px] w-full rounded-md border border-border-subtle bg-bg-primary px-4 py-3 text-[14px] leading-[1.8] text-text-primary outline-none focus:border-white/20"
      />

      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="mr-auto text-[12px] text-text-tertiary">
          HTML wird übernommen
        </span>
        <button
          onClick={togglePreview}
          className={`rounded-md border border-border-subtle px-4 py-2 text-[12px] transition-colors ${
            preview !== null
              ? "bg-accent-soft border-accent/50 text-text-primary"
              : "bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary"
          }`}
        >
          {preview !== null ? "Vorschau aus" : "Vorschau"}
        </button>
        <button
          onClick={send}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] border border-border-subtle px-5 py-2 text-[12px] text-text-primary transition-colors"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
