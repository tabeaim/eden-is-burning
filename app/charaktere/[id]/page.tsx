"use client";

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { Icon } from "@/components/Icon";

export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { character, player, scenes, postsOf } = useStore();
  const c = character(id);

  if (!c) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16 text-text-tertiary">
        Charakter nicht gefunden.{" "}
        <Link href="/einwohnerinnen" className="underline">
          Zum Verzeichnis
        </Link>
      </div>
    );
  }

  const p = player(c.player_id);
  const inScenes = scenes.filter((s) => s.participant_ids.includes(c.id));

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <div className="flex gap-6">
        <div className="w-[200px] shrink-0">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.faceclaim_image_url ?? ""}
              alt={c.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex items-center gap-3 text-text-tertiary">
            {c.pinterest_url && (
              <a
                href={c.pinterest_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-text-primary"
              >
                <Icon name="pinterest" size={18} />
              </a>
            )}
            <span className="opacity-70">
              <Icon name="message" size={18} />
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl text-text-primary leading-tight">
            {c.name}
          </h1>
          {c.tagline && (
            <div className="mt-1.5 inline-block rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[12px] text-text-secondary">
              {c.tagline}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
            <Field label="Rolle" value={c.role} />
            <Field label="Alter" value={c.age ? `${c.age}` : null} />
            <Field label="Faceclaim" value={c.faceclaim} />
            <Field label="Bezirk" value={areaName(c.area)} />
            <Field
              label="Gespielt von"
              value={
                p ? (
                  <Link
                    href={`/spieler/${p.username}`}
                    className="text-text-primary hover:underline"
                  >
                    {p.username}
                  </Link>
                ) : null
              }
            />
          </dl>

          {c.bio && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">
                Biografie
              </div>
              <p className="prose-serif !text-left text-text-secondary">
                {c.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-text-secondary mb-3">
          Szenen
        </h2>
        {inScenes.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">
            Noch in keiner Szene.
          </p>
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
                  {formatInplayDate(s.inplay_date)} · {postsOf(s.id).length}{" "}
                  Posts
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}
