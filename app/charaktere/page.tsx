"use client";

import { playerImage } from "@/lib/avatar";
import { GONE_CLASS, GONE_PLAYER_CLASS, PAUSED_CARD_CLASS, useCharacterGone } from "@/lib/gone";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NewCharacterButton } from "@/components/NewCharacterButton";
import { TIER_NAMES, isPaused, tierOf } from "@/lib/characters";
import { StatistActions } from "@/components/StatistActions";
import { useStore } from "@/lib/store";
import { TabRule } from "@/components/TabRule";
import { useSessionState } from "@/lib/session-state";
import { formatInplayDateShort, capFirst } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Bubble } from "@/components/Bubble";
import { characterImage } from "@/lib/avatar";
import { Icon } from "@/components/Icon";
import { RichText } from "@/components/RichText";
import type { Character, Player } from "@/lib/types";

// Main Characters · Supporting Characters · Statist*innen (für alle: bearbeiten,
// zeitweise bespielen oder zum Supporting Character machen) · Alle
type Tab = "played" | "scs" | "extras" | "all";
const TABS: [Tab, string][] = [
  ["played", "Main Characters"],
  ["scs", "Supporting Characters"],
  ["extras", "Statist*innen"],
  ["all", "Alle"],
];

type SortKey = "name" | "created" | "posts" | "active";
const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  created: "Anmeldedatum",
  posts: "Post-Anzahl",
  active: "Letzte Aktivität",
};

export default function CharaktereePage() {
  const { characters, npcs, posts, player } = useStore();
  const [query, setQuery] = useSessionState("charaktere:query", "");
  const [tabState, setTab] = useSessionState<Tab>("charaktere:tab", "played");
  const [sortKey, setSortKey] = useSessionState<SortKey>("charaktere:sortkey", "name");
  const [sortDir, setSortDir] = useSessionState<"asc" | "desc">("charaktere:sortdir", "asc");

  // Anzahl Posts und Zeitpunkt des letzten Posts pro Charakter
  const { postCounts, lastActive } = useMemo(() => {
    const postCounts = new Map<string, number>();
    const lastActive = new Map<string, string>();
    for (const p of posts) {
      postCounts.set(p.character_id, (postCounts.get(p.character_id) ?? 0) + 1);
      if (p.created_at > (lastActive.get(p.character_id) ?? "")) {
        lastActive.set(p.character_id, p.created_at);
      }
    }
    return { postCounts, lastActive };
  }, [posts]);

  // Reiter ohne Einträge werden nicht angezeigt; „Alle" nur, wenn sie mehr zeigt als ein einzelner Reiter
  const counts: Record<Tab, number> = {
    played: characters.length,
    scs: npcs.filter((c) => tierOf(c) === "supporting").length,
    extras: npcs.filter((c) => tierOf(c) === "extra").length,
    all: characters.length + npcs.length,
  };
  const filled = TABS.filter(([k]) => k !== "all" && counts[k] > 0);
  const visibleTabs = TABS.filter(([k]) => (k === "all" ? filled.length > 1 : counts[k] > 0));
  const shown = visibleTabs.length > 0 ? visibleTabs : TABS.slice(0, 1);
  const tab: Tab = shown.some(([k]) => k === tabState) ? tabState : shown[0][0];
  // „Neu anlegen" gibt es für den aktiven Reiter – und für jede Art, deren Reiter (noch) fehlt,
  // sonst ließe sich die erste nie anlegen
  const canCreate = (kind: Tab) => tab === kind || tab === "all" || !shown.some(([k]) => k === kind);

  const q = query.trim().toLowerCase();
  const pool =
    tab === "played"
      ? characters
      : tab === "scs"
        ? npcs.filter((c) => tierOf(c) === "supporting")
        : tab === "extras"
          ? npcs.filter((c) => tierOf(c) === "extra")
          : [...characters, ...npcs];
  const list = pool
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.faceclaim ?? "").toLowerCase().includes(q),
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created") cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
      else if (sortKey === "posts") cmp = (postCounts.get(a.id) ?? 0) - (postCounts.get(b.id) ?? 0);
      else if (sortKey === "active") {
        // letzter Post; Charaktere ohne Post gelten als am längsten inaktiv
        const la = lastActive.get(a.id) ?? "";
        const lb = lastActive.get(b.id) ?? "";
        cmp = la < lb ? -1 : la > lb ? 1 : 0;
      }
      // Name als Hauptkriterium bzw. als Reihenfolge bei Gleichstand
      if (cmp === 0) return a.name.localeCompare(b.name, "de") * (sortKey === "name" && sortDir === "desc" ? -1 : 1);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-5 pb-8">
      <PageHeader
        title="Charaktere"
        subtitle="Das Charakterverzeichnis von Eden."
        width="max-w-6xl"
      />

      {/* Reiter wie in der Szenen-Übersicht; rechts „Neu anlegen" passend zum Reiter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.length > 1 && shown.map(([key, label]) => (
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
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {canCreate("played") && <NewCharacterButton kind="character" />}
          {canCreate("scs") && <NewCharacterButton kind="sc" />}
          {canCreate("extras") && <NewCharacterButton kind="extra" />}
        </div>
      </div>
      <TabRule />

      {/* Textsuche links, Sortierung rechts */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Icon name="search" size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Charakter suchen…"
            aria-label="Charakter suchen"
            className="w-full bg-bg-primary border border-border-subtle rounded-md pl-8 pr-3 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={sortKey}
            onChange={(e) => {
              const k = e.target.value as SortKey;
              setSortKey(k);
              // sinnvolle Startrichtung: Name A–Z, sonst neueste/meiste zuerst
              setSortDir(k === "name" ? "asc" : "desc");
            }}
            aria-label="Sortieren nach"
            className="bg-bg-primary border border-border-subtle rounded-md px-2.5 py-1.5 text-[0.875rem] text-text-primary outline-none focus:border-white/20"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k} className="bg-bg-surface">
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Aufsteigend" : "Absteigend"}
            className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((c) => (
          <CharacterCard
            key={c.id}
            c={c}
            players={(tierOf(c) === "supporting" ? [c.player_id, ...(c.co_owner_ids ?? [])] : [c.player_id])
              .map((pid) => player(pid))
              .filter((x): x is Player => !!x)}
            postCount={postCounts.get(c.id) ?? 0}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-[0.875rem] text-text-tertiary">
          {q
            ? `Kein Charakter passt zu „${query.trim()}“.`
            : tab === "extras"
              ? "Noch keine Statist*innen – leg oben die erste an."
              : tab === "scs"
                ? "Noch keine Supporting Characters."
                : "Noch keine Charaktere."}
        </p>
      )}

    </div>
  );
}

// Charakter-Karte: Name und Tagline im Stil der Charakterkarten in Szenen, Avatar
// im Originalformat (600×502), darunter Posts · played by (Spieler-Bubble) und
// „Lebendig seit" (Anmeldedatum). Bei Hover erscheint die Kurzbeschreibung über
// dem Bild. Die ganze Karte führt zum Profil (Namens-Link, über die Karte gestreckt).
function CharacterCard({
  c,
  players,
  postCount,
}: {
  c: Character;
  players: Player[]; // Main: Besitzer*in · SC: alle Zugeordneten · Statist*in: wer sie angelegt hat
  postCount: number;
}) {
  const tier = tierOf(c);
  const gone = useCharacterGone(c);
  const paused = isPaused(c);
  return (
    <div
      title={paused ? "Charakter pausiert" : undefined}
      className={`group relative flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-4 text-center transition-colors hover:bg-white/[0.03] ${
        paused ? PAUSED_CARD_CLASS : ""
      }`}
    >
      <div className="card-title font-display lowercase text-[1.625rem] leading-none text-text-primary transition-colors group-hover:text-accent">
        <Link
          href={`/charaktere/${c.id}`}
          title={gone ? "Charakter gelöscht" : undefined}
          className={`after:absolute after:inset-0 after:content-[''] ${gone ? GONE_CLASS : ""}`}
        >
          {c.name}
        </Link>
      </div>

      {/* Avatar im Originalformat, nie größer als das Bild selbst; mt-auto hält die
          Bilder einer Reihe auf gleicher Höhe, auch bei umbrechenden Namen */}
      <div className="mt-auto w-full pt-3">
        <div className="relative mx-auto w-full max-w-[600px]">
        <Link
          href={`/charaktere/${c.id}`}
          aria-label={c.name}
          tabIndex={-1}
          className="relative block aspect-[600/502] w-full overflow-hidden rounded-lg bg-bg-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterImage(c)}
            alt={c.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {c.bio && (
            <div className="on-dark absolute inset-0 flex flex-col overflow-y-auto bg-black/90 px-5 py-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {/* langer Text lässt sich im Overlay scrollen */}
              <div className="my-auto">
                <div className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wider text-text-primary">
                  {[capFirst(c.role), c.age ? `${c.age}` : null].filter(Boolean).join(" · ")}
                </div>
                <RichText html={c.bio} className="text-[0.8125rem] leading-relaxed text-text-primary/90" />
              </div>
            </div>
          )}
        </Link>
        {/* Tagline als Pilltag auf der Unterkante des Avatars – halb auf dem Bild */}
        {c.tagline && (
          <span className="pointer-events-none absolute bottom-0 left-1/2 max-w-[90%] -translate-x-1/2 translate-y-1/2 truncate rounded-full border border-border-subtle bg-bg-surface px-3 py-0.5 text-[0.6875rem] uppercase tracking-wider text-text-secondary">
            {c.tagline}
          </span>
        )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[0.8125rem] uppercase tracking-wider text-text-secondary">
        <span>
          <span className="font-bold text-text-primary">{postCount}</span>{" "}
          {postCount === 1 ? "Post" : "Posts"}
        </span>
        {players.length > 0 && (
          <>
            <span>· {tier === "extra" ? "angelegt von" : "played by"}</span>
            {players.map((pl) => (
              <span key={pl.id} className="relative z-10 normal-case tracking-normal">
                {pl.deleted_at ? (
                  <span className={GONE_PLAYER_CLASS} title="Konto gelöscht">
                    {pl.username}
                  </span>
                ) : (
                <Bubble
                  href={`/spieler/${pl.username}`}
                  leading={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={playerImage(pl)} alt="" className="h-5 w-5 rounded-full object-cover" />
                  }
                >
                  {pl.username}
                </Bubble>
                )}
              </span>
            ))}
          </>
        )}
      </div>
      <div className="mt-1 text-[0.8125rem] text-text-tertiary">
        {tier !== "main" && <span className="uppercase tracking-wider">{TIER_NAMES[tier]} · </span>}
        Lebendig seit {formatInplayDateShort(c.created_at.slice(0, 10))}
        {paused && <span className="uppercase tracking-wider"> · pausiert</span>}
      </div>
      {tier === "extra" && <StatistActions character={c} className="mt-3" />}
    </div>
  );
}
