"use client";

import { BannerPosition } from "@/components/BannerPosition";
import { bannerStyle } from "@/lib/headers";
import { use, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Player, PlayerProfile } from "@/lib/types";
import { areaName } from "@/lib/world";
import { characterImage } from "@/lib/avatar";
import { formatDateTime, formatInplayDate, capFirst } from "@/lib/format";
import { playsAs, tierLabel } from "@/lib/characters";
import { useSetPageMeta } from "@/lib/page-meta";
import { uploadImage, IMAGE_SIZES } from "@/lib/images";
import { Facts, FactRow } from "@/components/Facts";
import { Icon } from "@/components/Icon";
import { RichText } from "@/components/RichText";
import { SceneFilterList } from "@/components/SceneFilterList";
import {
  ProfileLikes,
  ProfileSkills,
  ProfileSliders,
  SectionHeading,
} from "@/components/ProfileSections";

type Tab = "characters" | "scenes" | "about";

// „seit 3 Jahren", „seit 5 Monaten", „seit 12 Tagen"
function since(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days >= 365) return `${Math.floor(days / 365)} ${days >= 730 ? "Jahren" : "Jahr"}`;
  if (days >= 60) return `${Math.floor(days / 30)} Monaten`;
  return `${days} ${days === 1 ? "Tag" : "Tagen"}`;
}

// Spieler*innen-Profil: Name (mit Avatar) im Seitentitel, eigener Header,
// Beschreibung und Facts, darunter die Reiter Characters, Scenes und About
// (Skills, Slider und Likes wie bei den Charakteren). Alles außer Avatar und
// Username wird hier im Profil bearbeitet.
export default function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { playerByUsername, charactersOf, npcs, scenes, smsScenes, chatMessages, posts, currentPlayer } = useStore();
  const p = playerByUsername(decodeURIComponent(username));
  // Reiter: ohne eigene Wahl „About" (falls gefüllt), sonst „Characters"
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const [editing, setEditing] = useState(false);

  useSetPageMeta(
    p?.username ?? "Spieler*in",
    undefined,
    p?.profile?.header_url ?? undefined,
    "max-w-6xl",
    undefined,
    p?.avatar_url ?? undefined,
  );

  if (!p) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-text-tertiary">
        Spieler*in nicht gefunden.
      </div>
    );
  }

  const chars = charactersOf(p.id);
  const side = npcs.filter((c) => playsAs(c, p.id));
  const all = [...chars, ...side];
  const ids = new Set(all.map((c) => c.id));
  const postCount = posts.filter((x) => ids.has(x.character_id)).length;
  const lastPostAt = (sceneId: string) =>
    posts.reduce(
      (max, x) => (x.scene_id === sceneId && x.created_at > max ? x.created_at : max),
      // SMS-Szenen: ihre zuletzt geschriebene Nachricht
      chatMessages.reduce((max, m) => (m.scene_id === sceneId && m.created_at > max ? m.created_at : max), ""),
    );
  const myScenes = [...scenes, ...smsScenes]
    .filter((s) => s.participant_ids.some((id) => ids.has(id)))
    .sort((a, b) => (lastPostAt(b.id) || b.created_at).localeCompare(lastPostAt(a.id) || a.created_at));
  // Bearbeiten kann man nur das eigene Profil – auch Admins nicht das anderer
  const canEdit = !!currentPlayer && currentPlayer.id === p.id;
  const prof = p.profile ?? {};
  const hasAbout =
    !!prof.skills?.length || !!prof.sliders?.length || !!prof.likes?.length || !!prof.dislikes?.length;

  // Reiter ohne Inhalt werden nicht angezeigt
  const tabs: [Tab, string][] = [
    // „About" nur, wenn Skills, Slider oder Likes hinterlegt sind – dann vorn
    ...(hasAbout ? ([["about", "About"]] as [Tab, string][]) : []),
    ...(all.length > 0 ? ([["characters", "Characters"]] as [Tab, string][]) : []),
    ...(myScenes.length > 0 ? ([["scenes", "Scenes"]] as [Tab, string][]) : []),
  ];
  const tab: Tab | null = tabs.some(([k]) => k === chosenTab) ? chosenTab : (tabs[0]?.[0] ?? null);
  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-1 pb-8">
      {/* Zitat und Bearbeiten-Knopf stehen über der Trennlinie (die zeichnet die
          Seite selbst, siehe ownsDivider in AppShell); der Text fließt um den Knopf */}
      <div className="flow-root">
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className={`${btn} float-right mb-2 ml-4`}>
            <Icon name="edit" size={14} /> Bearbeiten
          </button>
        )}
        {prof.quote && (
          <p className="text-left text-[1.125rem] leading-snug text-text-primary">
            <span className="mr-1.5 text-[2.125rem] leading-none text-accent">„</span>
            <RichText inline html={prof.quote} />
          </p>
        )}
      </div>
      <div className="mt-4 mb-6 border-b border-border-subtle" />
      {editing && <PlayerEditPanel player={p} onClose={() => setEditing(false)} />}

      <div className="grid items-start gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(22rem,1fr)]">
        {p.bio ? (
          <RichText html={p.bio} className="max-w-2xl text-[0.875rem] leading-relaxed text-text-secondary" />
        ) : (
          <p className="text-[0.875rem] text-text-tertiary">Noch keine Beschreibung.</p>
        )}
        <section>
          <SectionHeading>facts.</SectionHeading>
          <div className="rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-3">
          <Facts>
            <FactRow label="Member since" value={`${formatInplayDate(p.created_at.slice(0, 10))} · seit ${since(p.created_at)}`} />
            <FactRow label="Characters" value={`${chars.length}`} />
            <FactRow label="Supporting" value={side.length ? `${side.length}` : null} />
            <FactRow label="Scenes" value={`${myScenes.length}`} />
            <FactRow label="Posts" value={`${postCount}`} />
            <FactRow label="Last seen" value={formatDateTime(p.last_seen)} />
          </Facts>
          </div>
        </section>
      </div>

      {tabs.length > 0 && (
        <>
      <div className="mt-6 mb-6 border-b border-border-subtle" />

      {/* Reiter wie im Charakterprofil */}
      <div className="mb-6 flex flex-wrap gap-x-1.5 gap-y-2.5">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
              tab === key
                ? "bg-accent text-black font-medium"
                : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "characters" && (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((c) => (
              <Link
                key={c.id}
                href={`/charaktere/${c.id}`}
                className="flex gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3 transition-colors hover:bg-white/[0.03]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={characterImage(c)} alt={c.name} className="h-24 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <div className="font-serif text-[0.875rem] text-text-primary">
                    {c.name}
                    {c.is_npc && (
                      <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                        {tierLabel(c)}
                      </span>
                    )}
                  </div>
                  <div className="text-[0.875rem] text-text-tertiary">{capFirst(c.role)}</div>
                  {c.area && <div className="mt-0.5 text-[0.875rem] text-text-tertiary">{areaName(c.area)}</div>}
                  {c.tagline && (
                    <div className="mt-1.5 inline-block rounded-full bg-white/[0.05] px-2 py-0.5 text-[0.6875rem] uppercase tracking-wider text-text-secondary">
                      {c.tagline}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Skills, Slider, Likes – wie bei den Charakteren */}
      {tab === "about" && hasAbout && (
        <div className="flex max-w-4xl flex-col gap-9">
          <ProfileSkills c={p} />
          <ProfileSliders c={p} />
          <ProfileLikes c={p} />
        </div>
      )}

      {tab === "scenes" && (
        <section>
          <SceneFilterList scenes={myScenes} className="grid grid-cols-1 gap-3 sm:grid-cols-2" />
        </section>
      )}
        </>
      )}
    </div>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";
const toList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

// Eigenes Profil bearbeiten: Zitat, Beschreibung, Header-Bild, Skills, Slider,
// Likes/Dislikes. Nur Avatar und Username stehen unter Einstellungen → Mein Profil.
function PlayerEditPanel({ player, onClose }: { player: Player; onClose: () => void }) {
  const { updatePlayer } = useStore();
  const prof = player.profile ?? {};
  const [bio, setBio] = useState(player.bio ?? "");
  const [quote, setQuote] = useState(prof.quote ?? "");
  const [header, setHeader] = useState(prof.header_url ?? "");
  const [skills, setSkills] = useState(prof.skills ?? []);
  const [sliders, setSliders] = useState(prof.sliders ?? []);
  const [likes, setLikes] = useState((prof.likes ?? []).join(", "));
  const [dislikes, setDislikes] = useState((prof.dislikes ?? []).join(", "));
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function onHeader(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      setHeader(await uploadImage(f, "players", IMAGE_SIZES.banner));
    } finally {
      setUploading(false);
    }
  }

  function save() {
    const profile: PlayerProfile = {
      ...prof,
      header_url: header || null,
      quote: quote.trim() || null,
      skills: skills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), value: s.value })),
      sliders: sliders.filter((s) => s.left.trim() || s.right.trim()),
      likes: toList(likes),
      dislikes: toList(dislikes),
    };
    updatePlayer(player.id, { bio: bio.trim() || null, profile });
    onClose();
  }

  const label = "block text-[0.875rem] text-text-secondary";
  const group = "mt-2 text-[0.8125rem] uppercase tracking-wider font-semibold text-text-tertiary";
  const uploadBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50";
  const addBtn =
    "flex items-center gap-1 self-start rounded-full border border-dashed border-border-strong px-3 py-1.5 text-[0.8125rem] text-text-tertiary hover:border-accent/50 hover:text-accent";
  const removeBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.06] hover:text-red-300";

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
      <div className="text-[0.875rem] uppercase tracking-wider text-text-tertiary">Profil bearbeiten</div>
      <p className="-mt-2 text-[0.8125rem] text-text-tertiary">
        Avatar und Username änderst du unter{" "}
        <Link href="/einstellungen" className="text-accent hover:underline">
          Einstellungen → Mein Profil
        </Link>
        .
      </p>

      <label className={label}>
        Zitat
        <input value={quote} maxLength={300} onChange={(e) => setQuote(e.target.value)} className={`mt-1 ${field}`} />
      </label>
      <label className={label}>
        Beschreibung ({bio.length}/500)
        <textarea
          value={bio}
          maxLength={500}
          rows={4}
          onChange={(e) => setBio(e.target.value)}
          className={`mt-1 resize-y ${field}`}
        />
      </label>

      <div className={group}>Header</div>
      <div className="flex flex-wrap items-center gap-3">
        {header && (
          <span
            style={bannerStyle(header)}
            className="h-12 w-40 rounded-md border border-border-subtle bg-cover"
          />
        )}
        <button disabled={uploading} onClick={() => file.current?.click()} className={uploadBtn}>
          <Icon name="upload" size={13} /> {uploading ? "Lädt…" : header ? "Header ersetzen" : "Header hochladen"}
        </button>
        {header && (
          <button onClick={() => setHeader("")} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
            Standard-Header verwenden
          </button>
        )}
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void onHeader(e.target.files?.[0])} />
      </div>
      {header && <BannerPosition url={header} onChange={setHeader} />}

      <div className={group}>Skills</div>
      {skills.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={s.name}
            onChange={(e) => setSkills(skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="Skill, z. B. Posts pünktlich beantworten"
            className={`${field} min-w-40 flex-1`}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={s.value}
            onChange={(e) => setSkills(skills.map((x, j) => (j === i ? { ...x, value: parseInt(e.target.value, 10) } : x)))}
            aria-label={`${s.name || "Skill"} in Prozent`}
            className="w-32 accent-[var(--accent)]"
          />
          <span className="w-10 text-right text-[0.8125rem] tabular-nums text-text-secondary">{s.value}%</span>
          <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} aria-label="Skill entfernen" className={removeBtn}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setSkills([...skills, { name: "", value: 50 }])} className={addBtn}>
        <Icon name="plus" size={12} /> Skill
      </button>

      <div className={group}>Slider</div>
      {sliders.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={s.left}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))}
            placeholder="links"
            className={`${field} min-w-36 flex-1`}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={s.value}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, value: parseInt(e.target.value, 10) } : x)))}
            aria-label="Position zwischen den Polen"
            className="w-28 accent-[var(--accent)]"
          />
          <input
            value={s.right}
            onChange={(e) => setSliders(sliders.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))}
            placeholder="rechts"
            className={`${field} min-w-36 flex-1`}
          />
          <button onClick={() => setSliders(sliders.filter((_, j) => j !== i))} aria-label="Slider entfernen" className={removeBtn}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => setSliders([...sliders, { left: "", right: "", value: 50 }])} className={addBtn}>
        <Icon name="plus" size={12} /> Slider
      </button>

      <div className={group}>Likes / Dislikes</div>
      <p className="-mt-2 text-[0.8125rem] text-text-tertiary">Mit Komma getrennt.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          Likes
          <textarea value={likes} onChange={(e) => setLikes(e.target.value)} rows={3} className={`mt-1 resize-y ${field}`} />
        </label>
        <label className={label}>
          Dislikes
          <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} rows={3} className={`mt-1 resize-y ${field}`} />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={uploading}
          className="rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
