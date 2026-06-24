"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo } from "@/lib/format";
import { Icon } from "@/components/Icon";
import type { Character } from "@/lib/types";

type Tab = "general" | "character" | "inplay" | "relations";

export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useStore();
  const { character, player, players, characters, scenes, postsOf, posts } =
    store;
  const c = character(id);
  const [tab, setTab] = useState<Tab>("general");

  if (!c) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-16 text-text-tertiary">
        Charakter nicht gefunden.{" "}
        <Link href="/einwohnerinnen" className="underline">
          Zum Verzeichnis
        </Link>
      </div>
    );
  }

  const p = player(c.player_id);
  const inScenes = scenes.filter((s) => s.participant_ids.includes(c.id));
  const postCount = posts.filter((x) => x.character_id === c.id).length;

  // Mitspieler-Charaktere (für RELATIONS) aus gemeinsamen Szenen
  const coCharIds = new Set<string>();
  for (const s of inScenes)
    for (const pid of s.participant_ids) if (pid !== c.id) coCharIds.add(pid);
  const coChars = Array.from(coCharIds)
    .map((cid) => characters.find((x) => x.id === cid))
    .filter(Boolean) as Character[];

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      {/* Großer Blackletter-Name */}
      <h1 className="font-display text-4xl sm:text-5xl text-text-primary text-center leading-none mb-6">
        {c.name}
        <span className="text-accent">.</span>
      </h1>

      <div className="grid md:grid-cols-[230px_1fr] gap-8 items-start">
        {/* LINKS: Bild + looks. + Zitat */}
        <div>
          <div
            className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-surface"
            style={{ backgroundImage: "linear-gradient(180deg, rgba(163,163,128,0.12), transparent)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 right-3">
              <h2 className="font-display text-2xl text-accent leading-none">
                looks.
              </h2>
              <div className="mt-3 flex flex-col gap-1.5">
                <LooksRow label="Height" value={c.height} />
                <LooksRow label="Figure" value={c.figure} />
                <LooksRow label="Hair" value={c.hair} />
                <LooksRow label="Eyes" value={c.eyes} />
                <LooksRow label="Face" value={c.faceclaim} />
              </div>
            </div>
          </div>

          {c.quote && (
            <div className="mt-3 rounded-lg bg-black/40 border border-border-subtle px-4 py-3 text-center">
              <p className="prose-serif !text-center !text-[13px] text-text-secondary italic">
                {c.quote}
              </p>
            </div>
          )}
        </div>

        {/* RECHTS: Tabs + Inhalt */}
        <div>
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mb-6">
            {(
              [
                ["general", "General"],
                ["character", "Character"],
                ["inplay", "Inplay"],
                ["relations", "Relations"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  tab === key
                    ? "bg-olive-soft text-text-primary border border-olive/40"
                    : "bg-white/[0.03] text-text-tertiary hover:text-text-secondary border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "general" && <GeneralTab c={c} />}
          {tab === "character" && <CharacterTab c={c} />}
          {tab === "inplay" && (
            <InplayTab inScenes={inScenes} postsOf={postsOf} />
          )}
          {tab === "relations" && <RelationsTab coChars={coChars} player={player} />}

          {/* Pinterest */}
          {c.pinterest_url && (
            <div className="mt-8 flex justify-center">
              <a
                href={c.pinterest_url}
                target="_blank"
                rel="noreferrer"
                className="text-olive hover:text-accent"
                title="Pinterest"
              >
                <Icon name="pinterest" size={26} />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <div className="font-display text-2xl text-accent">
              brought to you by {p?.username ?? "—"}
              <span className="text-accent">.</span>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
              {postCount} {postCount === 1 ? "Post" : "Posts"} · registriert am{" "}
              {formatInplayDate(c.created_at.slice(0, 10))}
              {p && <> · zuletzt online {timeAgo(p.last_seen)}</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LooksRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="rounded bg-black/55 px-2 py-0.5 uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <span className="text-text-primary uppercase tracking-wide text-[11px]">
        {value}
      </span>
    </div>
  );
}

// Label/Value-Reihe wie im "facts."-Block
function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 w-28 text-right rounded bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <span className="text-[13px] text-text-primary uppercase tracking-wide">
        {value}
      </span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl text-accent leading-none mb-3 mt-1">
      {children}
    </h2>
  );
}

function GeneralTab({ c }: { c: Character }) {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <Heading>facts.</Heading>
        <div className="flex flex-col gap-2">
          <FactRow label="Name" value={c.full_name ?? c.name} />
          <FactRow label="Age" value={c.age ? `${c.age} Jahre` : null} />
          <FactRow label="Occupation" value={c.role} />
          <FactRow label="Residence" value={areaName(c.area)} />
          <FactRow label="Sexuality" value={c.sexuality} />
          <FactRow label="Status" value={c.status} />
          <FactRow label="Origin" value={c.origin} />
        </div>
      </section>

      {(c.job || c.company) && (
        <section>
          <Heading>occupation.</Heading>
          <div className="flex flex-col gap-2">
            <FactRow label="Job" value={c.job} />
            <FactRow label="Company" value={c.company} />
          </div>
        </section>
      )}
    </div>
  );
}

function CharacterTab({ c }: { c: Character }) {
  return (
    <div className="flex flex-col gap-7">
      {c.tagline && (
        <div className="inline-block self-start rounded-full bg-white/[0.05] px-3 py-1 text-[12px] text-text-secondary">
          {c.tagline}
        </div>
      )}
      {c.personality && (
        <section>
          <Heading>personality.</Heading>
          <p className="prose-serif !text-left text-text-secondary">
            {c.personality}
          </p>
        </section>
      )}
      {c.bio && (
        <section>
          <Heading>biography.</Heading>
          <p className="prose-serif !text-left text-text-secondary">{c.bio}</p>
        </section>
      )}
      {!c.personality && !c.bio && (
        <p className="text-[13px] text-text-tertiary">
          Noch keine Charakterbeschreibung hinterlegt.
        </p>
      )}
    </div>
  );
}

function InplayTab({
  inScenes,
  postsOf,
}: {
  inScenes: ReturnType<typeof useStore>["scenes"];
  postsOf: ReturnType<typeof useStore>["postsOf"];
}) {
  return (
    <section>
      <Heading>scenes.</Heading>
      {inScenes.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Noch in keiner Szene.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {inScenes.map((s) => (
            <Link
              key={s.id}
              href={`/szenen/${s.id}`}
              className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="font-serif text-[15px] text-text-primary">
                {s.title}
              </div>
              <div className="text-[12px] text-text-tertiary">
                {s.location_name} · {areaName(s.location_area)} ·{" "}
                {formatInplayDate(s.inplay_date)} · {postsOf(s.id).length} Posts
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RelationsTab({
  coChars,
  player,
}: {
  coChars: Character[];
  player: ReturnType<typeof useStore>["player"];
}) {
  return (
    <section>
      <Heading>relations.</Heading>
      {coChars.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">
          Noch keine Verbindungen — sobald gemeinsame Szenen existieren,
          erscheinen sie hier.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {coChars.map((rc) => {
            const rp = player(rc.player_id);
            return (
              <Link
                key={rc.id}
                href={`/charaktere/${rc.id}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 hover:bg-white/[0.03] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rc.faceclaim_image_url ?? ""}
                  alt={rc.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="text-[14px] text-text-primary">{rc.name}</div>
                  <div className="text-[11px] text-text-tertiary">
                    {rc.role}
                    {rp ? ` · by ${rp.username}` : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
