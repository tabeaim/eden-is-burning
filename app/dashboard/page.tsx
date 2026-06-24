"use client";

import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate, timeAgo, withinHours } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { QuoteRotator } from "@/components/QuoteRotator";
import type { Scene } from "@/lib/types";

export default function DashboardPage() {
  const store = useStore();
  const { currentPlayer, scenes, players, charactersOf, postsOf, character } =
    store;
  if (!currentPlayer) return null;

  const myCharIds = new Set(charactersOf(currentPlayer.id).map((c) => c.id));

  const active = scenes.filter(
    (s) =>
      s.status === "active" &&
      s.participant_ids.some((id) => myCharIds.has(id)),
  );

  const myTurn: Scene[] = [];
  const waiting: Scene[] = [];
  for (const s of active) {
    const turn = whoseTurn(s, postsOf(s.id));
    if (turn && myCharIds.has(turn)) myTurn.push(s);
    else waiting.push(s);
  }

  // Allgemein aktive Szenen der letzten 24h (über alle Spieler)
  const recentScenes = scenes
    .map((s) => {
      const posts = postsOf(s.id);
      const last = posts[posts.length - 1];
      return { scene: s, last };
    })
    .filter((x) => x.last && withinHours(x.last.created_at, 24))
    .sort(
      (a, b) =>
        new Date(b.last!.created_at).getTime() -
        new Date(a.last!.created_at).getTime(),
    );

  // Wer war in den letzten 24h online
  const onlinePlayers = players
    .filter((p) => withinHours(p.last_seen, 24))
    .sort(
      (a, b) =>
        new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
    );

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <PageHeader
        title={`Hallo, ${currentPlayer.username}`}
        subtitle="Dein Inplaytracker — offene Szenen, in denen du mitspielst."
      />

      {/* Wechselnde Szenenzitate */}
      <div className="mb-10">
        <QuoteRotator />
      </div>

      <section className="mb-10">
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mb-3">
          Du bist dran
        </h2>
        {myTurn.length === 0 ? (
          <Empty>Gerade bist du in keiner Szene am Zug.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {myTurn.map((s) => (
              <SceneRow key={s.id} scene={s} store={store} prominent />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-tertiary mb-3">
          Wartet auf andere
        </h2>
        {waiting.length === 0 ? (
          <Empty>Keine wartenden Szenen.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {waiting.map((s) => (
              <SceneRow key={s.id} scene={s} store={store} />
            ))}
          </div>
        )}
      </section>

      {/* Aktive Szenen der letzten 24h (allgemein) */}
      <section className="mt-12">
        <h2 className="section-bar text-[13px] text-text-primary mb-3">
          Aktive Szenen · letzte 24h
        </h2>
        {recentScenes.length === 0 ? (
          <Empty>In den letzten 24 Stunden wurde nichts geschrieben.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {recentScenes.map(({ scene, last }) => {
              const lastChar = last ? character(last.character_id) : undefined;
              return (
                <Link
                  key={scene.id}
                  href={`/szenen/${scene.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-accent shrink-0">
                    <Icon name="flame" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-[14px] text-text-primary truncate">
                      {scene.title}
                    </div>
                    <div className="text-[11px] text-text-tertiary truncate">
                      {scene.location_name} · {areaName(scene.location_area)}
                    </div>
                  </div>
                  {last && lastChar && (
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-text-secondary">
                        {lastChar.name.split(" ")[0]}
                      </div>
                      <div className="text-[10px] text-text-tertiary">
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

      {/* Wer war online */}
      <section className="mt-10">
        <h2 className="section-bar text-[13px] text-text-primary mb-3">
          In den letzten 24h online
        </h2>
        {onlinePlayers.length === 0 ? (
          <Empty>Niemand war zuletzt online.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlinePlayers.map((p) => (
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
                  {withinHours(p.last_seen, 1) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-bg-surface" />
                  )}
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] text-text-primary">
                    {p.username}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {timeAgo(p.last_seen)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] text-text-tertiary bg-bg-surface border border-border-subtle rounded-lg px-4 py-5">
      {children}
    </div>
  );
}

function SceneRow({
  scene,
  store,
  prominent = false,
}: {
  scene: Scene;
  store: ReturnType<typeof useStore>;
  prominent?: boolean;
}) {
  const posts = store.postsOf(scene.id);
  const turnId = whoseTurn(scene, posts);
  const turnChar = turnId ? store.character(turnId) : undefined;
  const last = posts[posts.length - 1];
  const lastChar = last ? store.character(last.character_id) : undefined;

  return (
    <Link
      href={`/szenen/${scene.id}`}
      className={`block rounded-xl border border-border-subtle bg-bg-surface px-5 transition-colors hover:bg-white/[0.03] ${
        prominent ? "py-4" : "py-3"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className={`font-serif text-text-primary ${
            prominent ? "text-lg" : "text-[15px]"
          }`}
        >
          {scene.title}
        </h3>
        <span className="shrink-0 inline-flex items-center gap-1 text-[12px] text-text-secondary">
          Weiterschreiben
          <Icon name="arrow-right" size={14} />
        </span>
      </div>
      <div className="text-[12px] text-text-tertiary mt-0.5">
        {scene.location_name} · {areaName(scene.location_area)} ·{" "}
        {formatInplayDate(scene.inplay_date)}, {scene.inplay_time}
      </div>

      {turnChar && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-2.5 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={turnChar.faceclaim_image_url ?? ""}
            alt={turnChar.name}
            className="w-4 h-4 rounded-full object-cover"
          />
          <span className="text-[11px] text-text-secondary">
            {turnChar.name} ist dran
          </span>
        </div>
      )}

      {prominent && last && lastChar && (
        <p className="prose-serif mt-3 line-clamp-2 !text-[13px] text-text-secondary">
          <span className="text-text-tertiary not-italic">
            {lastChar.name}:{" "}
          </span>
          {last.content.replace(/\*/g, "")}
        </p>
      )}
    </Link>
  );
}
