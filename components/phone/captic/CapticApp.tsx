"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CapticEvent, CapticPost, Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import {
  CAPTIC_PINK,
  capticHandle,
  cleanHandle,
  defaultHandle,
  follows,
  formatCount,
  parseCount,
  sortPosts,
} from "@/lib/captic";
import { Icon } from "@/components/Icon";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { CropDialog } from "@/components/CropDialog";
import { CapticAvatar, CapticStoryContext } from "./CapticAvatar";
import { CapticPostCard } from "./CapticPost";
import { CapticCompose, capticField } from "./CapticCompose";
import { OwnStoryAvatar, StoryAvatar, StoryRow, StoryViewer } from "./CapticStories";

// Übergabe vom Dashboard („Neue Aktivität auf Captic"): gleich die Aktivitäten öffnen
export const CAPTIC_OPEN_KEY = "eden:captic-open";

type View =
  | { t: "feed" }
  | { t: "search" }
  | { t: "new" }
  | { t: "story" }
  | { t: "activity" }
  | { t: "profile"; id: string }
  | { t: "post"; id: string }
  | { t: "edit"; id: string };

// Captic aus Sicht des Charakters, dessen Handy man in der Hand hat: Feed mit
// Story-Zeile, Suche, neuer Beitrag, Profile, Aktivitäten (Glocke). Die Ansichten liegen als Stapel übereinander –
// der Pfeil oben links geht eine zurück, die Leiste unten beginnt neu.
export function CapticApp({ me }: { me: Character }) {
  const { capticPosts, character, capticNews } = useStore();
  const [stack, setStack] = useState<View[]>(() => {
    try {
      if (sessionStorage.getItem(CAPTIC_OPEN_KEY) === "activity") {
        return [{ t: "feed" }, { t: "activity" }];
      }
    } catch {
      /* ignore */
    }
    return [{ t: "feed" }];
  });
  // erst nach dem Aufbau löschen – der Startwert oben wird beim Entwickeln doppelt berechnet
  useEffect(() => {
    try {
      sessionStorage.removeItem(CAPTIC_OPEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const [story, setStory] = useState<{ ids: string[]; start: string } | null>(null);
  const openStory = useCallback((id: string) => setStory({ ids: [id], start: id }), []);
  const news = capticNews(me.id).length;
  const view = stack[stack.length - 1];
  const push = (v: View) => setStack((s) => [...s, v]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const root = (v: View) => setStack([v]);

  const nav = {
    onProfile: (id: string) => push({ t: "profile", id }),
    onOpen: (id: string) => push({ t: "post", id }),
    onEdit: (id: string) => push({ t: "edit", id }),
  };

  const post = view.t === "post" || view.t === "edit" ? capticPosts.find((p) => p.id === view.id) : undefined;
  const profileOf = view.t === "profile" ? character(view.id) : undefined;

  const title =
    view.t === "new"
      ? "Neuer Beitrag"
      : view.t === "story"
        ? "Neue Story"
        : view.t === "activity"
          ? "Aktivitäten"
      : view.t === "edit"
        ? "Beitrag bearbeiten"
        : view.t === "post"
          ? "Beitrag"
          : view.t === "search"
            ? "Entdecken"
            : view.t === "profile" && profileOf
              ? capticHandle(profileOf)
              : null;

  const arrow = "flex h-9 w-7 shrink-0 items-center justify-center text-text-primary";
  const tab = (active: boolean) =>
    `flex h-10 w-12 items-center justify-center ${active ? "text-text-primary" : "text-text-tertiary"}`;
  const onMine = view.t === "profile" && view.id === me.id;

  return (
    <CapticStoryContext.Provider value={openStory}>
      <div className="flex min-h-[52px] shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-surface px-2">
        {stack.length > 1 ? (
          <button onClick={back} aria-label="Zurück" className={arrow}>
            <Icon name="chevron-right" size={22} className="rotate-180" />
          </button>
        ) : (
          <Link href="/handy" aria-label="Zurück zum Startbildschirm" className={arrow}>
            <Icon name="chevron-right" size={22} className="rotate-180" />
          </Link>
        )}
        {title ? (
          <div className="min-w-0 flex-1 truncate text-[1.0625rem] font-semibold text-text-primary">{title}</div>
        ) : (
          <div className="flex-1 font-display text-[1.625rem] lowercase leading-none text-text-primary">
            captic<span style={{ color: CAPTIC_PINK }}>.</span>
          </div>
        )}
        {view.t !== "activity" && (
          <button
            onClick={() => push({ t: "activity" })}
            aria-label={news ? `Aktivitäten (${news} neu)` : "Aktivitäten"}
            title="Aktivitäten"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-primary hover:bg-white/[0.06]"
          >
            <Icon name="bell" size={21} />
            {news > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold text-black">
                {news}
              </span>
            )}
          </button>
        )}
      </div>

      {view.t === "feed" && (
        <Feed
          me={me}
          {...nav}
          onStory={(ids, start) => setStory({ ids, start })}
          onAddStory={() => push({ t: "story" })}
        />
      )}
      {view.t === "activity" && <Activity me={me} onProfile={nav.onProfile} onOpen={nav.onOpen} />}
      {view.t === "story" && (
        <CapticCompose me={me} story onCancel={back} onDone={() => root({ t: "feed" })} />
      )}
      {view.t === "search" && <Search me={me} onProfile={nav.onProfile} />}
      {view.t === "new" && (
        <CapticCompose me={me} onCancel={() => root({ t: "feed" })} onDone={() => root({ t: "profile", id: me.id })} />
      )}
      {view.t === "edit" &&
        (post ? <CapticCompose me={me} post={post} onCancel={back} onDone={back} /> : <Gone />)}
      {view.t === "post" &&
        (post ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CapticPostCard post={post} me={me} full {...nav} onDeleted={back} />
          </div>
        ) : (
          <Gone />
        ))}
      {view.t === "profile" &&
        (profileOf ? (
          <Profile
            key={profileOf.id}
            who={profileOf}
            me={me}
            onOpen={nav.onOpen}
            onAddStory={() => push({ t: "story" })}
            onStory={() => setStory({ ids: [profileOf.id], start: profileOf.id })}
          />
        ) : (
          <Gone />
        ))}

      <nav className="flex shrink-0 items-center justify-around border-t border-border-subtle bg-bg-surface py-1">
        <button onClick={() => root({ t: "feed" })} aria-label="Feed" title="Feed" className={tab(view.t === "feed")}>
          <Icon name="home" size={23} />
        </button>
        <button
          onClick={() => root({ t: "search" })}
          aria-label="Entdecken"
          title="Entdecken"
          className={tab(view.t === "search")}
        >
          <Icon name="search" size={23} />
        </button>
        <button
          onClick={() => root({ t: "new" })}
          aria-label="Neuer Beitrag"
          title="Neuer Beitrag"
          className={tab(view.t === "new")}
        >
          <Icon name="plus" size={25} />
        </button>
        <button
          onClick={() => root({ t: "profile", id: me.id })}
          aria-label="Mein Profil"
          title="Mein Profil"
          className="flex h-10 w-12 items-center justify-center"
        >
          <CapticAvatar character={me} size={26} ring={false} className={onMine ? "ring-2 ring-text-primary" : "opacity-80"} />
        </button>
      </nav>

      {story && (
        <StoryViewer
          characterIds={story.ids}
          start={story.start}
          me={me}
          onProfile={nav.onProfile}
          onClose={() => setStory(null)}
        />
      )}
    </CapticStoryContext.Provider>
  );
}

function Gone() {
  return <p className="flex-1 p-8 text-center text-[0.875rem] text-text-tertiary">Das gibt es nicht mehr.</p>;
}

// Feed: oben die Stories, darunter die eigenen Beiträge und die der Profile,
// denen man folgt.
function Feed({
  me,
  onProfile,
  onOpen,
  onEdit,
  onStory,
  onAddStory,
}: {
  me: Character;
  onProfile: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onStory: (characterIds: string[], start: string) => void;
  onAddStory: () => void;
}) {
  const { capticPosts } = useStore();
  const following = follows(me);
  const posts = sortPosts(
    capticPosts.filter((p) => p.character_id === me.id || following.includes(p.character_id)),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <StoryRow me={me} onOpen={onStory} onAdd={onAddStory} />
      {posts.map((p) => (
        <CapticPostCard key={p.id} post={p} me={me} onProfile={onProfile} onOpen={onOpen} onEdit={onEdit} />
      ))}
      {posts.length === 0 && (
        <p className="px-8 py-10 text-center text-[0.875rem] text-text-tertiary">
          {following.length
            ? "Die Profile, denen du folgst, haben noch nichts gepostet."
            : `${me.name.split(" ")[0]} folgt noch niemandem. Unter „Entdecken" (Lupe) findest du die anderen Profile.`}
        </p>
      )}
    </div>
  );
}

// Aktivitäten (Glocke): wer geliket, kommentiert hat oder neu folgt. Das Öffnen
// nimmt nur den Dashboard-Hinweis weg; ungelesen (oranger Punkt, Zähler) bleibt
// ein Eintrag, bis er angeklickt wurde – oder „Alle gelesen".
function Activity({
  me,
  onProfile,
  onOpen,
}: {
  me: Character;
  onProfile: (id: string) => void;
  onOpen: (postId: string) => void;
}) {
  const {
    capticEvents,
    capticPosts,
    capticComments,
    character,
    capticNews,
    markCapticEventRead,
    markCapticAllRead,
    markCapticNoticed,
  } = useStore();
  const unread = new Set(capticNews(me.id).map((e) => e.id));
  const events = capticEvents
    .filter((e) => e.target_id === me.id && e.actor_id !== me.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 60);
  const newest = events[0]?.created_at;
  useEffect(() => {
    markCapticNoticed(me.id);
    // bei jeder neu eintreffenden Aktivität wieder – man sieht sie ja gerade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, newest]);

  const isNew = (e: CapticEvent) => unread.has(e.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {unread.size > 0 && (
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2 text-[0.8125rem]">
          <span className="text-text-tertiary">{unread.size} ungelesen</span>
          <button onClick={() => markCapticAllRead(me.id)} className="font-medium text-accent hover:underline">
            Alle gelesen
          </button>
        </div>
      )}
      {events.map((e) => {
        const actor = character(e.actor_id);
        const post = e.post_id ? capticPosts.find((p) => p.id === e.post_id) : undefined;
        const comment = e.comment_id ? capticComments.find((c) => c.id === e.comment_id) : undefined;
        if (!actor) return null;
        const thumb = post && (post.poster_url || (post.kind === "video" ? null : post.url));
        return (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isNew(e) ? "bg-accent" : ""}`} />
            <CapticAvatar character={actor} size={40} />
            <button
              onClick={() => {
                markCapticEventRead(e);
                if (post) onOpen(post.id);
                else onProfile(actor.id);
              }}
              className="min-w-0 flex-1 text-left text-[0.8125rem] leading-snug text-text-secondary"
            >
              <span className="font-semibold text-text-primary">{capticHandle(actor)}</span>{" "}
              {e.kind === "like" && "gefällt dein Beitrag."}
              {e.kind === "follow" && "folgt dir jetzt."}
              {e.kind === "comment" && (
                <>
                  hat kommentiert{comment ? ": " : "."}
                  {comment && <span className="text-text-primary">{comment.content}</span>}
                </>
              )}
            </button>
            {thumb ? (
              <button
                onClick={() => {
                  markCapticEventRead(e);
                  onOpen(post!.id);
                }}
                aria-label="Beitrag öffnen"
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" loading="lazy" className="h-11 w-11 rounded object-cover" />
              </button>
            ) : (
              e.kind === "follow" && <FollowButton me={me} other={actor} />
            )}
          </div>
        );
      })}
      {events.length === 0 && (
        <p className="px-8 py-10 text-center text-[0.875rem] text-text-tertiary">
          Noch keine Aktivität. Hier steht, wer {me.name.split(" ")[0]} folgt, Beiträge liket oder
          kommentiert.
        </p>
      )}
    </div>
  );
}

// Entdecken: alle Profile (Charaktere mit Captic) mit Suchfeld und Folgen-Knopf.
function Search({ me, onProfile }: { me: Character; onProfile: (id: string) => void }) {
  const { characters, npcs, capticPosts } = useStore();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of capticPosts) m.set(p.character_id, (m.get(p.character_id) ?? 0) + 1);
    return m;
  }, [capticPosts]);
  const list = [...characters, ...npcs]
    .filter((c) => c.id !== me.id && !c.deleted_at && (resolvePhone(c).captic || counts.has(c.id)))
    .filter((c) => !term || c.name.toLowerCase().includes(term) || capticHandle(c).includes(term))
    .sort((a, b) => capticHandle(a).localeCompare(capticHandle(b)));

  return (
    <>
      <div className="shrink-0 border-b border-border-subtle px-3 py-2">
        <label className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-text-tertiary">
          <Icon name="search" size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none sm:text-[0.875rem]"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2">
            <CapticAvatar character={c} size={44} />
            <button onClick={() => onProfile(c.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[0.875rem] font-semibold text-text-primary">{capticHandle(c)}</div>
              <div className="truncate text-[0.8125rem] text-text-tertiary">
                {c.name} · {counts.get(c.id) ?? 0} Beiträge
              </div>
            </button>
            <FollowButton me={me} other={c} />
          </div>
        ))}
        {list.length === 0 && (
          <p className="px-8 py-10 text-center text-[0.875rem] text-text-tertiary">
            {term ? "Niemanden gefunden." : "Noch hat sonst niemand Captic."}
          </p>
        )}
      </div>
    </>
  );
}

function FollowButton({ me, other, wide = false }: { me: Character; other: Character; wide?: boolean }) {
  const { toggleCapticFollow } = useStore();
  const on = follows(me).includes(other.id);
  const toggle = () => toggleCapticFollow(me.id, other.id);
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      style={on ? undefined : { backgroundColor: CAPTIC_PINK }}
      className={`shrink-0 rounded-lg px-4 py-1.5 text-[0.8125rem] font-semibold ${wide ? "flex-1" : ""} ${
        on ? "bg-white/[0.08] text-text-primary hover:bg-white/[0.14]" : "text-white"
      }`}
    >
      {on ? "Gefolgt" : "Folgen"}
    </button>
  );
}

// Profil: das eigene (bearbeitbar) oder das eines anderen Charakters (folgen).
function Profile({
  who,
  me,
  onOpen,
  onAddStory,
  onStory,
}: {
  who: Character;
  me: Character;
  onOpen: (postId: string) => void;
  onAddStory: () => void;
  onStory: () => void;
}) {
  const { capticPosts, capticStories, characters, npcs, updateCharacter, renameCapticHandle } = useStore();
  const hasStory = capticStories.some((s) => s.character_id === who.id);
  const own = who.id === me.id;
  const profile = who.phone?.captic ?? {};
  const handle = capticHandle(who);
  const bio = profile.bio ?? who.tagline?.toUpperCase() ?? "";
  const posts = useMemo(
    () => sortPosts(capticPosts.filter((p) => p.character_id === who.id)),
    [capticPosts, who.id],
  );
  // Ohne eigene Angabe zählt, was in der App wirklich passiert ist
  const realFollowers = [...characters, ...npcs].filter((c) => follows(c).includes(who.id)).length;
  const followers = profile.followers ?? realFollowers;
  const following = profile.following ?? follows(who).length;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ handle: "", bio: "", followers: "", following: "" });
  // Captic-Profilbild im Bearbeiten-Formular: null = entfernen (zurück zum Handy-/Charakterbild)
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cropping, setCropping] = useState<{ file: File; src: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function cropped(crop: { x: number; y: number; w: number; h: number } | null) {
    const c = cropping;
    if (!c) return;
    setCropping(null);
    setUploading(true);
    setUploadError(null);
    try {
      setAvatar(await uploadImage(c.file, "captic", IMAGE_SIZES.avatar, crop));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Das hat nicht geklappt.");
    } finally {
      URL.revokeObjectURL(c.src);
      setUploading(false);
    }
  }

  function startEdit() {
    setDraft({
      handle,
      bio,
      followers: profile.followers != null ? String(profile.followers) : "",
      following: profile.following != null ? String(profile.following) : "",
    });
    setAvatar(profile.avatar ?? null);
    setEditing(true);
  }
  function save() {
    const next = cleanHandle(draft.handle);
    // neuer Name: Verlinkungen in Beiträgen und Kommentaren ziehen mit
    renameCapticHandle(handle, next || defaultHandle(who.name));
    updateCharacter(who.id, {
      phone: {
        ...who.phone,
        captic: {
          ...profile,
          enabled: true,
          handle: next || undefined,
          bio: draft.bio.trim(),
          avatar,
          followers: parseCount(draft.followers),
          following: parseCount(draft.following),
        },
      },
    });
    setEditing(false);
  }

  const label = "text-[0.75rem] text-text-tertiary";
  const button =
    "flex-1 rounded-lg bg-white/[0.08] px-3 py-1.5 text-center text-[0.8125rem] font-semibold text-text-primary hover:bg-white/[0.14]";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center gap-5 px-4 pt-4">
        {own ? (
          <OwnStoryAvatar me={who} size={76} onOpen={onStory} onAdd={onAddStory} />
        ) : (
          <StoryAvatar character={who} size={76} active={hasStory} onOpen={onStory} />
        )}
        <div className="flex flex-1 justify-around text-center">
          {[
            [formatCount(posts.length), "Beiträge"],
            [formatCount(followers), "Follower"],
            [formatCount(following), "Gefolgt"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-[1.0625rem] font-bold text-text-primary">{n}</div>
              <div className="text-[0.75rem] text-text-tertiary">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 px-4 pt-3">
          <div className="flex items-center gap-3">
            <CapticAvatar
              character={{ ...who, phone: { ...who.phone, captic: { ...profile, avatar } } }}
              size={52}
              ring={false}
            />
            <div className="flex min-w-0 flex-col items-start gap-0.5 text-[0.8125rem]">
              <label className="font-medium text-accent hover:underline">
                {uploading ? "Lädt hoch …" : "Profilbild ändern"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) setCropping({ file: f, src: URL.createObjectURL(f) });
                  }}
                />
              </label>
              {avatar && (
                <button onClick={() => setAvatar(null)} className="text-text-tertiary hover:text-text-primary">
                  Eigenes Bild entfernen
                </button>
              )}
              {uploadError && <span className="text-red-300">{uploadError}</span>}
            </div>
          </div>
          <label className={label}>
            Nutzername
            <input
              value={draft.handle}
              maxLength={30}
              onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
              className={`mt-1 ${capticField}`}
            />
          </label>
          <label className={label}>
            Bio ({draft.bio.length}/150)
            <textarea
              value={draft.bio}
              maxLength={150}
              rows={3}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              className={`mt-1 resize-none ${capticField}`}
            />
          </label>
          <div className="flex gap-2">
            <label className={`flex-1 ${label}`}>
              Follower
              <input
                value={draft.followers}
                inputMode="numeric"
                placeholder={String(realFollowers)}
                onChange={(e) => setDraft({ ...draft, followers: e.target.value })}
                className={`mt-1 ${capticField}`}
              />
            </label>
            <label className={`flex-1 ${label}`}>
              Gefolgt
              <input
                value={draft.following}
                inputMode="numeric"
                placeholder={String(follows(who).length)}
                onChange={(e) => setDraft({ ...draft, following: e.target.value })}
                className={`mt-1 ${capticField}`}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className={button}>
              Abbrechen
            </button>
            <button onClick={save} disabled={uploading} className={`${button} !bg-accent/90 !text-black disabled:opacity-50`}>
              Speichern
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="text-[0.875rem] font-semibold text-text-primary">{who.name}</div>
          <div className="text-[0.8125rem] text-text-tertiary">@{handle}</div>
          {bio && (
            <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] text-text-secondary">{bio}</p>
          )}
          <div className="mt-3 flex gap-2">
            {own ? (
              <button onClick={startEdit} className={button}>
                Profil bearbeiten
              </button>
            ) : (
              <>
                <FollowButton me={me} other={who} wide />
                <Link href={`/charaktere/${who.id}`} className={button}>
                  Charakterprofil
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-0.5 border-t border-border-subtle pt-0.5">
        {posts.map((p) => (
          <GridTile key={p.id} post={p} onOpen={onOpen} />
        ))}
      </div>
      {posts.length === 0 && (
        <div className="px-8 py-8 text-center">
          <div className="text-[0.9375rem] font-semibold text-text-primary">Noch keine Beiträge</div>
          {own && (
            <p className="mt-1 text-[0.8125rem] text-text-tertiary">
              Über das Plus unten postet {who.name.split(" ")[0]} das erste Foto.
            </p>
          )}
        </div>
      )}
      {cropping && (
        <CropDialog
          src={cropping.src}
          ratios={[{ label: "Quadrat", value: 1 }]}
          hint="Hochgeladen wird nur der Ausschnitt; angezeigt wird er rund."
          onDone={cropped}
          onCancel={() => {
            URL.revokeObjectURL(cropping.src);
            setCropping(null);
          }}
        />
      )}
    </div>
  );
}

// Kachel im Profil-Raster: immer quadratisch; Videos und hochgeladene GIFs als
// Standbild (damit das Raster nicht dutzende Filme lädt), mit kleinem Zeichen.
function GridTile({ post, onOpen }: { post: CapticPost; onOpen: (id: string) => void }) {
  const still = post.poster_url || (post.kind === "video" ? null : post.url);
  return (
    <button
      onClick={() => onOpen(post.id)}
      aria-label="Beitrag öffnen"
      className="relative aspect-square overflow-hidden bg-white/[0.04]"
    >
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <video src={post.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      )}
      {post.kind !== "image" && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1 py-0.5 text-[0.625rem] font-bold leading-none text-white">
          {post.kind === "video" ? <Icon name="play" size={11} fill="currentColor" /> : "GIF"}
        </span>
      )}
    </button>
  );
}
