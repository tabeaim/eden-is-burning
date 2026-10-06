"use client";

import { useEffect, useRef, useState } from "react";
import type { CapticPost, Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CAPTIC_PINK, capticHandle, feedRatio, formatCount, likeCount } from "@/lib/captic";
import { formatInplayDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PhoneAvatar } from "../PhoneFrame";
import { EmojiPicker } from "../EmojiPicker";
import { Sheet, SheetButton, SheetList } from "../Sheet";

// Bild, GIF oder Video eines Beitrags. Videos laufen stumm los, sobald sie im
// Bild sind, und halten an, wenn man weiterscrollt; Antippen schaltet den Ton.
export function CapticMedia({ post }: { post: CapticPost }) {
  const ratio = feedRatio(post.ar);
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  if (post.kind !== "video") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.url}
        alt=""
        loading="lazy"
        style={{ aspectRatio: ratio }}
        className="block w-full bg-black object-cover"
      />
    );
  }
  return (
    <div className="relative">
      <video
        ref={ref}
        src={post.url}
        poster={post.poster_url ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={() => setMuted((m) => !m)}
        style={{ aspectRatio: ratio }}
        className="block w-full cursor-pointer bg-black object-cover"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <Icon name={muted ? "mute" : "volume"} size={15} />
      </span>
    </div>
  );
}

// Ein Beitrag: Kopf (wer), Medium, Herz + Like-Zahl, Bildunterschrift, Kommentare.
// Im Feed kompakt (letzte zwei Kommentare), in der Einzelansicht (`full`) mit
// allen Kommentaren und dem Kommentarfeld.
export function CapticPostCard({
  post,
  me,
  full = false,
  onProfile,
  onOpen,
  onEdit,
  onDeleted,
}: {
  post: CapticPost;
  me: Character;
  full?: boolean;
  onProfile: (characterId: string) => void;
  onOpen: (postId: string) => void;
  onEdit: (postId: string) => void;
  onDeleted?: () => void;
}) {
  const {
    character,
    capticComments,
    canWriteAs,
    isAdmin,
    toggleCapticLike,
    addCapticComment,
    deleteCapticComment,
    deleteCapticPost,
  } = useStore();
  const author = character(post.character_id);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const comments = capticComments
    .filter((c) => c.post_id === post.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const shown = full ? comments : comments.slice(-2);
  const liked = (post.liked_by ?? []).includes(me.id);
  const likes = likeCount(post);
  const mine = canWriteAs(post.character_id);
  const canManage = mine || isAdmin;

  function send() {
    if (!text.trim()) return;
    addCapticComment(post.id, me.id, text);
    setText("");
    setEmoji(false);
  }

  const name = "font-semibold text-text-primary";

  return (
    <article className="border-b border-border-subtle pb-3">
      <div className="flex items-center gap-2.5 px-3 py-2">
        {author && <PhoneAvatar character={author} size={32} link={false} />}
        <button
          onClick={() => author && onProfile(author.id)}
          className="min-w-0 flex-1 truncate text-left text-[0.8125rem] font-semibold text-text-primary"
        >
          {author ? capticHandle(author) : "unbekannt"}
        </button>
        {canManage && (
          <button
            onClick={() => setMenu(true)}
            aria-label="Beitrag-Optionen"
            title="Beitrag-Optionen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-white/[0.06]"
          >
            <Icon name="more" size={20} />
          </button>
        )}
      </div>

      <CapticMedia post={post} />

      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button
          onClick={() => toggleCapticLike(post.id, me.id)}
          aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
          aria-pressed={liked}
          style={liked ? { color: CAPTIC_PINK } : undefined}
          className="text-text-primary"
        >
          <Icon name="heart" size={24} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => (full ? input.current?.focus() : onOpen(post.id))}
          aria-label="Kommentieren"
          className="text-text-primary"
        >
          <Icon name="message" size={23} />
        </button>
      </div>

      <div className="px-3 pt-1.5 text-[0.8125rem] leading-snug text-text-secondary">
        <div className={name}>Gefällt {formatCount(likes)} Mal</div>
        {post.caption && (
          <p className="mt-1 whitespace-pre-wrap break-words">
            <button onClick={() => author && onProfile(author.id)} className={name}>
              {author ? capticHandle(author) : "unbekannt"}
            </button>{" "}
            {post.caption}
          </p>
        )}

        {!full && comments.length > shown.length && (
          <button onClick={() => onOpen(post.id)} className="mt-1 text-text-tertiary">
            Alle {comments.length} Kommentare ansehen
          </button>
        )}
        {shown.length > 0 && (
          <ul className={full ? "mt-2.5 flex flex-col gap-2.5" : "mt-1 flex flex-col gap-0.5"}>
            {shown.map((c) => {
              const by = character(c.character_id);
              const canDelete = canManage || canWriteAs(c.character_id);
              return (
                <li key={c.id} className="flex items-start gap-2">
                  {full && by && <PhoneAvatar character={by} size={26} link={false} className="mt-0.5" />}
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                    <button onClick={() => by && onProfile(by.id)} className={name}>
                      {by ? capticHandle(by) : "unbekannt"}
                    </button>{" "}
                    {c.content}
                  </p>
                  {full && canDelete && (
                    <button
                      onClick={() => deleteCapticComment(c.id)}
                      aria-label="Kommentar löschen"
                      title="Kommentar löschen"
                      className="shrink-0 p-0.5 text-text-tertiary hover:text-red-300"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {full && comments.length === 0 && (
          <p className="mt-2 text-text-tertiary">Noch keine Kommentare.</p>
        )}
        {post.inplay_date && (
          <div className="mt-1.5 text-[0.6875rem] uppercase tracking-wide text-text-tertiary">
            {formatInplayDate(post.inplay_date)}
          </div>
        )}
      </div>

      {full && (
        <div className="mt-3 border-t border-border-subtle px-3 pt-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <PhoneAvatar character={me} size={30} link={false} />
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={`Kommentieren als ${capticHandle(me)} …`}
              className="min-w-0 flex-1 rounded-full border border-border-subtle bg-bg-primary px-3 py-1.5 text-[16px] text-text-primary outline-none focus:border-white/25 sm:text-[0.8125rem]"
            />
            <button
              type="button"
              onClick={() => setEmoji((v) => !v)}
              aria-label="Emojis"
              aria-pressed={emoji}
              className="shrink-0 text-[1.25rem] leading-none"
            >
              🙂
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              style={{ color: CAPTIC_PINK }}
              className="shrink-0 text-[0.8125rem] font-semibold disabled:opacity-40"
            >
              Posten
            </button>
          </form>
          {emoji && <EmojiPicker onPick={(e) => setText((t) => t + e)} />}
        </div>
      )}

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <SheetList>
            <SheetButton
              onClick={() => {
                setMenu(false);
                onEdit(post.id);
              }}
            >
              Bearbeiten
            </SheetButton>
            <SheetButton
              danger
              onClick={() => {
                setMenu(false);
                setConfirm(true);
              }}
            >
              Beitrag löschen
            </SheetButton>
          </SheetList>
        </Sheet>
      )}
      {confirm && (
        <ConfirmDialog
          title="Beitrag löschen?"
          text="Der Beitrag verschwindet samt Likes und Kommentaren – für alle."
          confirmLabel="Beitrag löschen"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            deleteCapticPost(post.id);
            onDeleted?.();
          }}
        />
      )}
    </article>
  );
}
