"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CapticPost, Character } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolvePhone } from "@/lib/phone";
import {
  CAPTIC_PINK,
  capticHandle,
  cleanHandle,
  follows,
  formatCount,
  parseCount,
  sortPosts,
} from "@/lib/captic";
import { Icon } from "@/components/Icon";
import { PhoneAvatar } from "../PhoneFrame";
import { CapticPostCard } from "./CapticPost";
import { CapticCompose, capticField } from "./CapticCompose";

type View =
  | { t: "feed" }
  | { t: "search" }
  | { t: "new" }
  | { t: "profile"; id: string }
  | { t: "post"; id: string }
  | { t: "edit"; id: string };

const pill = (active: boolean) =>
  `flex-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
    active ? "bg-accent text-black" : "bg-white/[0.06] text-text-secondary hover:text-text-primary"
  }`;

// Captic aus Sicht des Charakters, dessen Handy man in der Hand hat: Feed,
// Suche, neuer Beitrag, Profile. Die Ansichten liegen als Stapel übereinander –
// der Pfeil oben links geht eine zurück, die Leiste unten beginnt neu.
export function CapticApp({ me }: { me: Character }) {
  const { capticPosts, character } = useStore();
  const [stack, setStack] = useState<View[]>([{ t: "feed" }]);
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
    <>
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
      </div>

      {view.t === "feed" && <Feed me={me} {...nav} />}
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
          <Profile key={profileOf.id} who={profileOf} me={me} onOpen={nav.onOpen} onNew={() => root({ t: "new" })} />
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
          <PhoneAvatar
            character={me}
            size={26}
            link={false}
            className={onMine ? "ring-2 ring-text-primary" : "opacity-80"}
          />
        </button>
      </nav>
    </>
  );
}

function Gone() {
  return <p className="flex-1 p-8 text-center text-[0.875rem] text-text-tertiary">Das gibt es nicht mehr.</p>;
}

// Feed: Beiträge der anderen – „Gefolgt" (nur wem man folgt) oder „Alle".
function Feed({
  me,
  onProfile,
  onOpen,
  onEdit,
}: {
  me: Character;
  onProfile: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { capticPosts } = useStore();
  const following = follows(me);
  const [tab, setTab] = useState<"following" | "all">(following.length ? "following" : "all");
  const posts = sortPosts(
    capticPosts.filter(
      (p) => p.character_id !== me.id && (tab === "all" || following.includes(p.character_id)),
    ),
  );

  return (
    <>
      <div className="flex shrink-0 gap-1.5 border-b border-border-subtle px-3 py-2">
        <button onClick={() => setTab("following")} className={pill(tab === "following")}>
          Gefolgt
        </button>
        <button onClick={() => setTab("all")} className={pill(tab === "all")}>
          Alle
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {posts.map((p) => (
          <CapticPostCard key={p.id} post={p} me={me} onProfile={onProfile} onOpen={onOpen} onEdit={onEdit} />
        ))}
        {posts.length === 0 && (
          <p className="px-8 py-10 text-center text-[0.875rem] text-text-tertiary">
            {tab === "following"
              ? following.length
                ? "Die Profile, denen du folgst, haben noch nichts gepostet."
                : `${me.name.split(" ")[0]} folgt noch niemandem. Unter „Entdecken" (Lupe) findest du die anderen Profile.`
              : "Noch hat niemand sonst etwas gepostet."}
          </p>
        )}
      </div>
    </>
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
            <PhoneAvatar character={c} size={44} link={false} />
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
  const { updateCharacter } = useStore();
  const list = follows(me);
  const on = list.includes(other.id);
  function toggle() {
    updateCharacter(me.id, {
      phone: {
        ...me.phone,
        captic: {
          ...me.phone?.captic,
          follows: on ? list.filter((id) => id !== other.id) : [...list, other.id],
        },
      },
    });
  }
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
  onNew,
}: {
  who: Character;
  me: Character;
  onOpen: (postId: string) => void;
  onNew: () => void;
}) {
  const { capticPosts, characters, npcs, updateCharacter } = useStore();
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

  function startEdit() {
    setDraft({
      handle,
      bio,
      followers: profile.followers != null ? String(profile.followers) : "",
      following: profile.following != null ? String(profile.following) : "",
    });
    setEditing(true);
  }
  function save() {
    updateCharacter(who.id, {
      phone: {
        ...who.phone,
        captic: {
          ...profile,
          enabled: true,
          handle: cleanHandle(draft.handle) || undefined,
          bio: draft.bio.trim(),
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
        <span className="rounded-full bg-[linear-gradient(135deg,#ff9d5c,#e8457a,#7b3fd6)] p-[3px]">
          <PhoneAvatar character={who} size={76} className="ring-[3px] ring-[var(--phone-screen,#0c0c0e)]" />
        </span>
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
          <p className="text-[0.75rem] leading-snug text-text-tertiary">
            Frei wählbare Zahlen. Leer gelassen zählt, wer hier in der App wirklich folgt.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className={button}>
              Abbrechen
            </button>
            <button onClick={save} className={`${button} !bg-accent/90 !text-black`}>
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
              <>
                <button onClick={startEdit} className={button}>
                  Profil bearbeiten
                </button>
                <button onClick={onNew} className={button}>
                  Neuer Beitrag
                </button>
              </>
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
