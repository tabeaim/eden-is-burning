"use client";

import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo, withinHours } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { QuoteRotator } from "@/components/QuoteRotator";
import type { Character, Player, Scene } from "@/lib/types";

export default function DashboardPage() {
  const store = useStore();
  const { currentPlayer, scenes, players, charactersOf, postsOf, character } =
    store;
  if (!currentPlayer) return null;

  const myChars = charactersOf(currentPlayer.id);

  // Pro Charakter: in welchen aktiven Szenen ist er dran / wartet er auf andere?
  const grouped = myChars
    .map((c) => {
      const charScenes = scenes.filter(
        (s) => s.status === "active" && s.participant_ids.includes(c.id),
      );
      const dran: Scene[] = [];
      const warten: Scene[] = [];
      for (const s of charScenes) {
        const turn = whoseTurn(s, postsOf(s.id));
        if (turn === c.id) dran.push(s);
        else warten.push(s);
      }
      return { char: c, dran, warten };
    })
    .filter((g) => g.dran.length > 0 || g.warten.length > 0);

  const hasDran = grouped.some((g) => g.dran.length > 0);
  const hasWarten = grouped.some((g) => g.warten.length > 0);

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

  // Anwesenheit: "jetzt" (letzte 15 Min) vs. "letzte 24h" (ohne die jetzt-Online)
  const byLastSeen = (a: (typeof players)[number], b: (typeof players)[number]) =>
    new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();

  const onlineNow = players
    .filter((p) => withinHours(p.last_seen, 0.25))
    .sort(byLastSeen);

  const onlineRecent = players
    .filter((p) => withinHours(p.last_seen, 24) && !withinHours(p.last_seen, 0.25))
    .sort(byLastSeen);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <PageHeader
        title={`Hallo, ${currentPlayer.username}`}
        subtitle="Dein Inplaytracker — offene Szenen, in denen du mitspielst." width="max-w-5xl" />

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
        {/* LINKS: Szenenübersicht, nach Charakteren gruppiert */}
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="section-bar text-[0.875rem] text-text-primary mb-4">
              Du bist dran
            </h2>
            {!hasDran ? (
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
                      store={store}
                    />
                  ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-tertiary mb-4">
              Wartet auf andere
            </h2>
            {!hasWarten ? (
              <Empty>Keine wartenden Szenen.</Empty>
            ) : (
              <div className="flex flex-col gap-6">
                {grouped
                  .filter((g) => g.warten.length > 0)
                  .map((g) => (
                    <CharacterGroup
                      key={g.char.id}
                      char={g.char}
                      scenes={g.warten}
                      store={store}
                      muted
                    />
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* RECHTS: Zitate, 24h-Aktivität, Online */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-6">
          <QuoteRotator />

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Aktive Szenen · letzte 24h
            </h2>
            {recentScenes.length === 0 ? (
              <Empty>In den letzten 24 Stunden wurde nichts geschrieben.</Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {recentScenes.map(({ scene, last }) => {
                  const lastChar = last
                    ? character(last.character_id)
                    : undefined;
                  return (
                    <Link
                      key={scene.id}
                      href={`/szenen/${scene.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="text-accent shrink-0">
                        <Icon name="flame" size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-[0.875rem] text-text-primary truncate">
                          {scene.title}
                        </div>
                        <div className="text-[0.875rem] text-text-tertiary truncate">
                          {scene.location_name} ·{" "}
                          {areaName(scene.location_area)}
                        </div>
                      </div>
                      {last && lastChar && (
                        <div className="text-right shrink-0">
                          <div className="text-[0.875rem] text-text-secondary">
                            {lastChar.name.split(" ")[0]}
                          </div>
                          <div className="text-[0.875rem] text-text-tertiary">
                            {timeAgo(last.created_at)}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Spieler online · jetzt
            </h2>
            {onlineNow.length === 0 ? (
              <Empty>Gerade ist niemand online.</Empty>
            ) : (
              <PlayerPresenceList players={onlineNow} now />
            )}
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
}: {
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
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-bg-surface" />
            )}
          </span>
          <div className="leading-tight">
            <div className="text-[0.875rem] text-text-primary">{p.username}</div>
            <div className="text-[0.875rem] text-text-tertiary">
              {now ? "online" : timeAgo(p.last_seen)}
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
  store,
  muted = false,
}: {
  char: Character;
  scenes: Scene[];
  store: ReturnType<typeof useStore>;
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
          <SceneFacts key={s.id} scene={s} store={store} muted={muted} />
        ))}
      </div>
    </div>
  );
}

// Szenenkarte mit reinen Key-Facts (keine Textvorschau, kein "Weiterschreiben")
function SceneFacts({
  scene,
  store,
  muted,
}: {
  scene: Scene;
  store: ReturnType<typeof useStore>;
  muted?: boolean;
}) {
  const participants = scene.participant_ids
    .map((id) => store.character(id))
    .filter(Boolean) as Character[];

  return (
    <Link
      href={`/szenen/${scene.id}`}
      className={`block rounded-xl border border-border-subtle px-5 py-3.5 transition-colors hover:bg-white/[0.03] ${
        muted ? "bg-bg-surface/60" : "bg-bg-surface"
      }`}
    >
      <h3 className="font-serif text-[1rem] text-text-primary leading-tight">
        {scene.title}
      </h3>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex -space-x-1.5">
          {participants.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c.id}
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              title={c.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-bg-surface"
            />
          ))}
        </div>
        <span className="text-[0.875rem] text-text-secondary">
          {participants.map((c) => c.name.split(" ")[0]).join(" & ")}
        </span>
      </div>

      <div className="mt-1.5 text-[0.875rem] text-text-tertiary">
        {scene.location_name} · {areaName(scene.location_area)} ·{" "}
        {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
      </div>
    </Link>
  );
}
