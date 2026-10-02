"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { timeAgo, withinHours } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { QuoteRotator } from "@/components/QuoteRotator";
import { SceneCard, SceneRow } from "@/components/SceneCard";
import type { Character, Player, Scene } from "@/lib/types";

export default function DashboardPage() {
  const store = useStore();
  const { currentPlayer, scenes, players, charactersOf, postsOf, onlineIds, idleIds } =
    store;
  const [showWarten, setShowWarten] = useState(false);
  // "Du bist dran": null = noch nicht selbst umgeschaltet → Standard (s.u.)
  const [showDran, setShowDran] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (!currentPlayer) return null;

  const myChars = charactersOf(currentPlayer.id);

  // Zeitpunkt des letzten Posts einer Szene (postsOf ist nach post_number sortiert)
  const lastPostAt = (sceneId: string): string | null => {
    const posts = postsOf(sceneId);
    return posts.length ? posts[posts.length - 1].created_at : null;
  };
  // Szene mit dem jüngsten Post zuerst
  const byLastPostDesc = (a: Scene, b: Scene) =>
    new Date(lastPostAt(b.id) ?? b.created_at).getTime() -
    new Date(lastPostAt(a.id) ?? a.created_at).getTime();

  // Pro Charakter: in welchen aktiven Szenen ist er dran / wartet er auf andere?
  const grouped = myChars
    .map((c) => {
      const charScenes = scenes.filter(
        (s) =>
          s.status === "active" &&
          !s.paused &&
          s.participant_ids.includes(c.id),
      );
      const dran: Scene[] = [];
      const warten: Scene[] = [];
      for (const s of charScenes) {
        const turn = whoseTurn(s, postsOf(s.id));
        if (turn === c.id) dran.push(s);
        else warten.push(s);
      }
      dran.sort(byLastPostDesc);
      warten.sort(byLastPostDesc);
      return { char: c, dran, warten };
    })
    .filter((g) => g.dran.length > 0 || g.warten.length > 0);

  const hasDran = grouped.some((g) => g.dran.length > 0);
  const hasWarten = grouped.some((g) => g.warten.length > 0);

  // Numerische Übersicht über distinkte offene Szenen des Spielers
  const myCharIds = new Set(myChars.map((c) => c.id));
  const myOpenScenes = scenes.filter(
    (s) =>
      s.status === "active" &&
      !s.paused &&
      s.participant_ids.some((id) => myCharIds.has(id)),
  );
  const totalOpen = myOpenScenes.length;
  const dranCount = myOpenScenes.filter((s) => {
    const t = whoseTurn(s, postsOf(s.id));
    return t != null && myCharIds.has(t);
  }).length;
  const wartenCount = totalOpen - dranCount;
  // Standard: aufgeklappt, nur auf dem Handy eingeklappt
  const dranOpen = showDran ?? !isMobile;

  // Allgemein aktive Szenen der letzten 24h (über alle Spieler)
  const recentScenes = scenes
    .map((s) => {
      const posts = postsOf(s.id);
      return { scene: s, last: posts[posts.length - 1] };
    })
    .filter((x) => x.last && withinHours(x.last.created_at, 24))
    .sort(
      (a, b) =>
        new Date(b.last!.created_at).getTime() -
        new Date(a.last!.created_at).getTime(),
    );

  // Anwesenheit: "jetzt" (live) vs. "letzte 24h" (ohne die jetzt-Online)
  const byLastSeen = (a: (typeof players)[number], b: (typeof players)[number]) =>
    new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();

  // "Jetzt online" ist live: wer die App gerade offen hat (Presence-Kanal).
  // Man selbst zählt immer dazu.
  const isOnline = (id: string) => id === currentPlayer.id || onlineIds.includes(id);
  const onlineNow = players.filter((p) => isOnline(p.id)).sort(byLastSeen);

  const onlineRecent = players
    .filter(
      (p) =>
        !isOnline(p.id) && withinHours(p.last_seen, 24),
    )
    .sort(byLastSeen);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader
        title={`Hallo, ${currentPlayer.username}`}
        subtitle="Dein Inplaytracker — offene Szenen, in denen du mitspielst."
        width="max-w-6xl"
        bannerImage={currentPlayer.dashboard_header_url ?? undefined}
      />

      {/* Zitat über die volle Breite, über allem anderen */}
      <div className="mb-8">
        <QuoteRotator />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-16 items-start">
        {/* LINKS: Szenenübersicht, nach Charakteren gruppiert */}
        <div className="flex flex-col gap-6 lg:gap-10">
          <section>
            <button
              onClick={() => setShowDran(!dranOpen)}
              aria-expanded={dranOpen}
              className={`flex w-full items-center gap-2 text-left ${dranOpen ? "mb-4" : ""}`}
            >
              <h2 className="section-bar text-[0.875rem] text-text-primary">
                Du bist dran{" "}
                <span className="text-accent">
                  {dranCount}/{totalOpen}
                </span>
              </h2>
              <span
                className={`text-text-tertiary transition-transform ${
                  dranOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {!dranOpen ? null : !hasDran ? (
              <Empty>Gerade bist du in keiner Szene am Zug.</Empty>
            ) : (
              <div className="flex flex-col gap-6">
                {grouped
                  .filter((g) => g.dran.length > 0)
                  .map((g) => (
                    <CharacterGroup
                      key={g.char.id}
                      char={g.char}
                      scenes={g.dran}
                    />
                  ))}
              </div>
            )}
          </section>

          <section>
            <button
              onClick={() => setShowWarten((v) => !v)}
              className={`flex w-full items-center gap-2 text-left ${showWarten ? "mb-4" : ""}`}
            >
              <h2 className="section-bar text-[0.875rem] text-text-tertiary">
                Wartet auf andere{" "}
                <span className="text-text-secondary">
                  {wartenCount}/{totalOpen}
                </span>
              </h2>
              <span
                className={`text-text-tertiary transition-transform ${
                  showWarten ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {showWarten &&
              (!hasWarten ? (
                <Empty>Keine.</Empty>
              ) : (
                <div className="flex flex-col gap-6">
                  {grouped
                    .filter((g) => g.warten.length > 0)
                    .map((g) => (
                      <CharacterGroup
                        key={g.char.id}
                        char={g.char}
                        scenes={g.warten}
                        muted
                      />
                    ))}
                </div>
              ))}
          </section>
        </div>

        {/* RECHTS: Zitate, 24h-Aktivität, Online */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-6">

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Aktive Szenen · letzte 24h
            </h2>
            {recentScenes.length === 0 ? (
              <Empty>Keine.</Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {recentScenes.map(({ scene }) => (
                  <SceneRow key={scene.id} scene={scene} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Spieler online · jetzt
            </h2>
            <PlayerPresenceList
              players={onlineNow}
              now
              idleIds={idleIds.filter((id) => id !== currentPlayer.id)}
            />
          </section>

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Spieler online · letzte 24h
            </h2>
            {onlineRecent.length === 0 ? (
              <Empty>Niemand sonst war in den letzten 24h online.</Empty>
            ) : (
              <PlayerPresenceList players={onlineRecent} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function PlayerPresenceList({
  players,
  now = false,
  idleIds = [],
}: {
  idleIds?: string[]; // online, aber Tab gerade nicht im Vordergrund → gelber Punkt
  players: Player[];
  now?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => (
        <Link
          key={p.id}
          href={`/spieler/${p.username}`}
          className="flex items-center gap-2.5 rounded-full border border-border-subtle bg-bg-surface pl-1.5 pr-3.5 py-1.5 hover:bg-white/[0.03] transition-colors"
        >
          <span className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.avatar_url ?? ""}
              alt={p.username}
              className="w-7 h-7 rounded-full object-cover bg-bg-primary"
            />
            {now && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-bg-surface ${
                  idleIds.includes(p.id) ? "bg-yellow-400" : "bg-green-500"
                }`}
              />
            )}
          </span>
          <div className="leading-tight">
            <div className="text-[0.8125rem] text-text-primary">{p.username}</div>
            <div className="text-[0.8125rem] text-text-tertiary">
              {now ? (idleIds.includes(p.id) ? "anderswo" : "online") : timeAgo(p.last_seen)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.875rem] text-text-tertiary bg-bg-surface border border-border-subtle rounded-lg px-4 py-5">
      {children}
    </div>
  );
}

// Gruppe von Szenen unter einem Charakter des Spielers
function CharacterGroup({
  char,
  scenes,
  muted = false,
}: {
  char: Character;
  scenes: Scene[];
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={char.faceclaim_image_url ?? ""}
          alt={char.name}
          className="w-7 h-7 rounded-full object-cover bg-bg-surface ring-1 ring-border-subtle"
        />
        <Link
          href={`/charaktere/${char.id}`}
          className="font-serif text-[0.875rem] text-text-primary hover:text-accent"
        >
          {char.name}
        </Link>
        <span className="text-[0.875rem] text-text-tertiary">
          {scenes.length} {scenes.length === 1 ? "Szene" : "Szenen"}
        </span>
      </div>
      <div className="flex flex-col gap-2 pl-1">
        {scenes.map((s) => (
          <SceneCard key={s.id} scene={s} muted={muted} />
        ))}
      </div>
    </div>
  );
}
