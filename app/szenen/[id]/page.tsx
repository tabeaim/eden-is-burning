"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, renderProse } from "@/lib/format";
import { SceneCharacterCard } from "@/components/SceneCharacterCard";
import { Icon } from "@/components/Icon";
import type { Character, Post } from "@/lib/types";

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

  if (!scene) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16 text-text-tertiary">
        Szene nicht gefunden.{" "}
        <Link href="/szenen" className="underline">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  const posts = postsOf(scene.id);

  // Seitenzuordnung: erster Teilnehmer = Karte links, zweiter = Karte rechts.
  const sideOf = (charId: string): "left" | "right" => {
    const idx = scene.participant_ids.indexOf(charId);
    return idx % 2 === 0 ? "left" : "right";
  };

  const turnId = whoseTurn(scene, posts);
  const turnChar = turnId ? character(turnId) : undefined;

  // Welche meiner Charaktere sind in dieser Szene?
  const myCharsInScene: Character[] = currentPlayer
    ? charactersOf(currentPlayer.id).filter((c) =>
        scene.participant_ids.includes(c.id),
      )
    : [];

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <Link
        href="/szenen"
        className="inline-flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary mb-4"
      >
        <span className="rotate-180 inline-flex">
          <Icon name="arrow-right" size={13} />
        </span>
        Alle Szenen
      </Link>

      {/* Scene Header */}
      <header className="rounded-xl bg-bg-surface border border-border-subtle px-6 py-5 mb-8">
        {scene.trigger_warning && (
          <span className="inline-block mb-2 rounded-full bg-red-500/15 text-red-300/90 text-[10px] uppercase tracking-wider px-2 py-0.5">
            Triggerwarnung
          </span>
        )}
        <h1 className="font-serif text-2xl text-text-primary">{scene.title}</h1>
        <div className="text-[12px] text-text-tertiary mt-1">
          {scene.location_name} · {areaName(scene.location_area)} ·{" "}
          {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
              scene.status === "active"
                ? "bg-white/[0.06] text-text-secondary"
                : "bg-white/[0.03] text-text-tertiary"
            }`}
          >
            {scene.status === "active" ? "aktiv" : "geschlossen"}
          </span>
          {scene.status === "active" && turnChar && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-text-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={turnChar.faceclaim_image_url ?? ""}
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
              {turnChar.name} ist dran
            </span>
          )}
        </div>
      </header>

      {/* Posts (Ping-Pong) */}
      <div className="flex flex-col gap-7">
        {posts.map((post) => {
          const c = character(post.character_id);
          if (!c) return null;
          const side = sideOf(post.character_id);
          return (
            <PostRow
              key={post.id}
              post={post}
              character={c}
              player={player(c.player_id)}
              side={side}
            />
          );
        })}
      </div>

      {/* Antwort-Box */}
      {scene.status === "active" && (
        <ReplyBox
          sceneId={scene.id}
          myChars={myCharsInScene}
          suggestedCharId={
            turnId && myCharsInScene.some((c) => c.id === turnId)
              ? turnId
              : myCharsInScene[0]?.id ?? null
          }
          lastPost={posts[posts.length - 1]}
        />
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
  const [hover, setHover] = useState(false);

  const card = (
    <SceneCharacterCard character={character} player={player} />
  );
  const prose = (
    <div
      className="flex-1 min-w-0 group relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="prose-serif text-text-primary"
        dangerouslySetInnerHTML={{ __html: renderProse(post.content) }}
      />
      {/* Action-Buttons bei Hover */}
      <div
        className={`absolute -top-2 right-0 flex items-center gap-1 transition-opacity ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        {(["star", "quote", "heart"] as const).map((n) => (
          <button
            key={n}
            className="rounded-md bg-bg-surface border border-border-subtle p-1.5 text-text-tertiary hover:text-text-primary"
            title={n}
          >
            <Icon name={n} size={13} />
          </button>
        ))}
      </div>
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
  lastPost,
}: {
  sceneId: string;
  myChars: Character[];
  suggestedCharId: string | null;
  lastPost?: Post;
}) {
  const { addPost, character } = useStore();
  const [activeCharId, setActiveCharId] = useState<string | null>(
    suggestedCharId,
  );
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveCharId(suggestedCharId);
  }, [suggestedCharId]);

  if (myChars.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-border-subtle bg-bg-surface px-5 py-4 text-[13px] text-text-tertiary">
        Du spielst in dieser Szene keinen Charakter mit — daher kannst du hier
        nicht antworten.
      </div>
    );
  }

  const activeChar = activeCharId ? character(activeCharId) : myChars[0];
  const lastChar = lastPost ? character(lastPost.character_id) : undefined;

  function send() {
    if (!activeChar || !text.trim()) return;
    addPost(sceneId, activeChar.id, text);
    setText("");
    setTimeout(
      () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      50,
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeChar?.faceclaim_image_url ?? ""}
            alt={activeChar?.name}
            className="w-8 h-8 rounded-full object-cover bg-bg-primary"
          />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Antwort als
            </div>
            <div className="text-[14px] text-text-primary">
              {activeChar?.name}
            </div>
          </div>
        </div>

        {myChars.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary">
              Charakter wechseln:
            </span>
            {myChars.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCharId(c.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
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

      {/* Kontext-Strip */}
      {lastPost && lastChar && (
        <div className="mb-3 rounded-md border-l-2 border-white/10 bg-black/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-0.5">
            {lastChar.name} schrieb zuletzt
          </div>
          <p className="prose-serif !text-[12px] !leading-relaxed text-text-tertiary italic line-clamp-2 !text-left">
            {lastPost.content.replace(/\*/g, "")}
          </p>
        </div>
      )}

      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={`Schreibe als ${activeChar?.name}…`}
        className="w-full resize-y rounded-md border border-border-subtle bg-bg-primary px-4 py-3 font-serif text-[15px] leading-[1.8] text-text-primary outline-none focus:border-white/20"
        style={{ fontFamily: "Georgia, serif" }}
      />

      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-[11px] text-text-tertiary">
          {text.trim().length} Zeichen
        </span>
        <button
          onClick={send}
          disabled={!text.trim()}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-border-subtle px-5 py-2 text-[13px] text-text-primary transition-colors"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
