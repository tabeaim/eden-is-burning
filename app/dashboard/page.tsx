"use client";

import Link from "next/link";
import { useStore, whoseTurn } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import type { Scene } from "@/lib/types";

export default function DashboardPage() {
  const store = useStore();
  const { currentPlayer, scenes, charactersOf, postsOf, character } = store;
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

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <PageHeader
        title={`Hallo, ${currentPlayer.username}`}
        subtitle="Dein Inplaytracker — offene Szenen, in denen du mitspielst."
      />

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
