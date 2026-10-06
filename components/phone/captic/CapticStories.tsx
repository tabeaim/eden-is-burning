"use client";

import { useEffect, useState } from "react";
import type { Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { capticHandle, follows } from "@/lib/captic";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PhoneAvatar } from "../PhoneFrame";

const RING = "bg-[linear-gradient(135deg,#ff9d5c,#e8457a,#7b3fd6)]";
const STORY_SECONDS = 6;

// Profilbild mit Story-Ring: bunt umrandet, sobald es eine Story gibt – dann
// öffnet ein Klick die Story (`onOpen`).
export function StoryAvatar({
  character,
  size,
  active,
  onOpen,
}: {
  character: Character;
  size: number;
  active: boolean;
  onOpen?: () => void;
}) {
  const avatar = (
    <PhoneAvatar
      character={character}
      size={size}
      link={!active}
      className="ring-[3px] ring-[var(--phone-screen,#0c0c0e)]"
    />
  );
  if (!active) return <span className="rounded-full p-[3px]">{avatar}</span>;
  return (
    <button
      onClick={onOpen}
      aria-label={`Story von ${capticHandle(character)} ansehen`}
      className={`rounded-full p-[3px] ${RING}`}
    >
      {avatar}
    </button>
  );
}

// Story-Zeile über dem Feed: zuerst die eigene (mit Plus zum Hinzufügen), dann
// alle, denen man folgt und die eine Story haben.
export function StoryRow({
  me,
  onOpen,
  onAdd,
}: {
  me: Character;
  onOpen: (characterIds: string[], start: string) => void;
  onAdd: () => void;
}) {
  const { capticStories, character } = useStore();
  const has = new Set(capticStories.map((s) => s.character_id));
  const others = follows(me)
    .filter((id) => has.has(id))
    .flatMap((id) => character(id) ?? []);
  const mine = has.has(me.id);
  const order = [...(mine ? [me.id] : []), ...others.map((c) => c.id)];
  const name = "w-[4.25rem] truncate text-center text-[0.6875rem] text-text-secondary";

  return (
    <div className="flex shrink-0 gap-2.5 overflow-x-auto border-b border-border-subtle px-3 py-2.5">
      <div className="relative flex shrink-0 flex-col items-center gap-1">
        {mine ? (
          <StoryAvatar character={me} size={58} active onOpen={() => onOpen(order, me.id)} />
        ) : (
          <button onClick={onAdd} aria-label="Story hinzufügen" className="rounded-full p-[3px]">
            <PhoneAvatar character={me} size={58} link={false} />
          </button>
        )}
        <button
          onClick={onAdd}
          aria-label="Story hinzufügen"
          title="Story hinzufügen"
          className="absolute right-0 top-[42px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-black ring-2 ring-[var(--phone-screen,#0c0c0e)]"
        >
          <Icon name="plus" size={14} strokeWidth={2.4} />
        </button>
        <span className={name}>Deine Story</span>
      </div>
      {others.map((c) => (
        <div key={c.id} className="flex shrink-0 flex-col items-center gap-1">
          <StoryAvatar character={c} size={58} active onOpen={() => onOpen(order, c.id)} />
          <span className={name}>{capticHandle(c)}</span>
        </div>
      ))}
    </div>
  );
}

// Story bildschirmfüllend im Display: Balken oben, links antippen = zurück,
// sonst weiter. Nach der letzten Story eines Profils kommt das nächste aus
// `characterIds`, danach schließt sich die Ansicht.
export function StoryViewer({
  characterIds,
  start,
  me,
  onProfile,
  onClose,
}: {
  characterIds: string[];
  start: string;
  me: Character;
  onProfile: (characterId: string) => void;
  onClose: () => void;
}) {
  const { capticStories, character, canWriteAs, isAdmin, deleteCapticStory } = useStore();
  const [who, setWho] = useState(start);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const stories = capticStories
    .filter((s) => s.character_id === who)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const story = stories[Math.min(index, stories.length - 1)];
  const author = character(who);

  function next() {
    if (index < stories.length - 1) return setIndex(index + 1);
    const following = characterIds[characterIds.indexOf(who) + 1];
    if (!following) return onClose();
    setWho(following);
    setIndex(0);
  }
  function prev() {
    if (index > 0) return setIndex(index - 1);
    const before = characterIds[characterIds.indexOf(who) - 1];
    if (!before) return setIndex(0);
    setWho(before);
    setIndex(0);
  }

  // läuft von selbst weiter (nicht, während die Lösch-Nachfrage offen ist)
  const storyId = story?.id;
  useEffect(() => {
    if (!storyId || confirm) return;
    const t = setTimeout(next, STORY_SECONDS * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, confirm]);

  // letzte Story gelöscht (auch von jemand anderem): weiter bzw. schließen
  const gone = !story;
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(next, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone]);

  if (!story || !author) return null;
  const canDelete = canWriteAs(who) || isAdmin;
  const shadow = "[text-shadow:0_1px_4px_rgba(0,0,0,0.8)]";

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      {story.kind === "video" ? (
        <video src={story.url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.url} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}

      {/* Tippflächen: linkes Drittel zurück, der Rest weiter */}
      <button onClick={prev} aria-label="Vorherige Story" className="absolute inset-y-0 left-0 w-1/3" />
      <button onClick={next} aria-label="Nächste Story" className="absolute inset-y-0 right-0 w-2/3" />

      <div className="relative bg-gradient-to-b from-black/60 to-transparent px-2.5 pb-6 pt-2.5">
        <div className="flex gap-1">
          {stories.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
              <span
                key={i === index ? `${s.id}-run` : s.id}
                style={
                  i === index
                    ? {
                        animation: `captic-story ${STORY_SECONDS}s linear forwards`,
                        animationPlayState: confirm ? "paused" : "running",
                      }
                    : undefined
                }
                className={`block h-full origin-left bg-white ${i < index ? "" : i === index ? "" : "scale-x-0"}`}
              />
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-white">
          <PhoneAvatar character={author} size={32} link={false} />
          <button
            onClick={() => {
              onClose();
              onProfile(author.id);
            }}
            className={`min-w-0 flex-1 truncate text-left text-[0.8125rem] font-semibold ${shadow}`}
          >
            {capticHandle(author)}
          </button>
          {canDelete && (
            <button
              onClick={() => setConfirm(true)}
              aria-label="Story löschen"
              title="Story löschen"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
            >
              <Icon name="trash" size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            title="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[1.5rem] leading-none hover:bg-white/15"
          >
            ×
          </button>
        </div>
      </div>

      {story.caption && (
        <p
          className={`pointer-events-none relative mt-auto whitespace-pre-wrap break-words bg-gradient-to-t from-black/70 to-transparent px-5 pb-8 pt-10 text-center text-[0.9375rem] font-medium text-white ${shadow}`}
        >
          {story.caption}
        </p>
      )}

      {confirm && (
        <ConfirmDialog
          title="Story löschen?"
          text={who === me.id ? "Dieses Bild verschwindet aus deiner Story." : "Dieses Bild verschwindet aus der Story."}
          confirmLabel="Story löschen"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            if (index >= stories.length - 1 && index > 0) setIndex(index - 1);
            deleteCapticStory(story.id);
          }}
        />
      )}
    </div>
  );
}
