"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { areaName } from "@/lib/world";
import { formatInplayDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { PlayerCharacterBubble } from "@/components/PlayerCharacterBubble";

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const PRESET_KEY = "eden:kalender-presets";

type Preset = { id: string; name: string; tokens: string[] };

export default function CalendarPage() {
  const { scenes, characters, players, character } = useStore();
  const [tokens, setTokens] = useState<string[]>([]); // "char:<id>" | "player:<id>"
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Gespeicherte Filterkombinationen laden (clientseitig, nach Hydration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPresets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  function persist(next: Preset[]) {
    setPresets(next);
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const toggle = (v: string) =>
    setTokens((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]));

  function tokenMatches(token: string, participantIds: string[]): boolean {
    const [type, id] = token.split(":");
    if (type === "char") return participantIds.includes(id);
    return participantIds.some((pid) => character(pid)?.player_id === id);
  }

  const charsByPlayer = players
    .map((p) => ({ player: p, chars: characters.filter((c) => c.player_id === p.id) }))
    .filter((g) => g.chars.length > 0);

  // Filtern (alle gewählten Tokens müssen passen) + nach In-Game-Datum gruppieren
  const groups = useMemo(() => {
    const filtered = scenes.filter(
      (s) =>
        tokens.length === 0 ||
        tokens.every((t) => tokenMatches(t, s.participant_ids)),
    );
    const sorted = [...filtered].sort((a, b) =>
      a.inplay_date < b.inplay_date ? 1 : a.inplay_date > b.inplay_date ? -1 : 0,
    );
    const map = new Map<string, typeof sorted>();
    for (const s of sorted) {
      const key = s.inplay_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split("-");
      return { key, label: `${MONTHS_DE[parseInt(m, 10) - 1]} ${y}`, items };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, tokens]);

  const totalShown = groups.reduce((n, g) => n + g.items.length, 0);
  const sameTokens = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));

  function saveCurrent() {
    const name = presetName.trim();
    if (!name || tokens.length === 0) return;
    persist([
      ...presets.filter((p) => p.name !== name),
      { id: crypto.randomUUID(), name, tokens: [...tokens] },
    ]);
    setPresetName("");
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <PageHeader
        title="Kalender"
        subtitle="In-Game-Zeitstrahl der Szenen, nach Monaten gruppiert." width="max-w-2xl" />

      {/* Filter (Charaktere/Spieler) & gespeicherte Kombinationen — nebeneinander, ohne Kasten */}
      <div className="mb-8 grid md:grid-cols-2 gap-x-10 gap-y-5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Filter nach Charakter / Spieler
            </span>
            {tokens.length > 0 && (
              <button
                onClick={() => setTokens([])}
                className="text-[10px] text-text-tertiary hover:text-text-primary underline"
              >
                zurücksetzen ({tokens.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {charsByPlayer.map(({ player, chars }) => (
              <PlayerCharacterBubble
                key={player.id}
                player={player}
                chars={chars}
                tokens={tokens}
                onTogglePlayer={() => toggle(`player:${player.id}`)}
                onToggleChar={(id) => toggle(`char:${id}`)}
              />
            ))}
          </div>
        </div>

        {/* Gespeicherte Filterkombinationen */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
            Gespeichert
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {presets.length === 0 && !saving && (
            <span className="text-[10px] text-text-tertiary">— noch keine</span>
          )}
          {presets.map((p) => {
            const activePreset = sameTokens(p.tokens, tokens);
            return (
              <span
                key={p.id}
                className={`group flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-[10px] transition-colors ${
                  activePreset
                    ? "border-accent/60 bg-accent-soft text-text-primary"
                    : "border-border-subtle bg-bg-primary text-text-secondary"
                }`}
              >
                <button
                  onClick={() => setTokens([...p.tokens])}
                  className="hover:text-text-primary"
                  title="Filter anwenden"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => persist(presets.filter((x) => x.id !== p.id))}
                  title="Löschen"
                  className="text-text-tertiary hover:text-accent px-1"
                >
                  ✕
                </button>
              </span>
            );
          })}

          {saving ? (
            <span className="flex items-center gap-1.5">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCurrent()}
                placeholder="Name…"
                autoFocus
                className="w-28 bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[10px] text-text-primary outline-none focus:border-white/20"
              />
              <button
                onClick={saveCurrent}
                disabled={!presetName.trim()}
                className="rounded-md bg-accent/90 hover:bg-accent text-black text-[10px] font-medium px-2 py-1 disabled:opacity-40"
              >
                Speichern
              </button>
              <button
                onClick={() => {
                  setSaving(false);
                  setPresetName("");
                }}
                className="text-[10px] text-text-tertiary hover:text-text-primary px-1"
              >
                Abbrechen
              </button>
            </span>
          ) : (
            tokens.length > 0 && (
              <button
                onClick={() => setSaving(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-[10px] text-text-tertiary hover:text-accent hover:border-accent/50"
              >
                <Icon name="plus" size={11} /> Auswahl speichern
              </button>
            )
          )}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-text-tertiary mb-4">
        {totalShown} {totalShown === 1 ? "Szene" : "Szenen"}
      </div>

      {/* Zeitstrahl, nach Monaten gruppiert */}
      {groups.length === 0 ? (
        <p className="text-[12px] text-text-tertiary">
          Keine Szenen für diesen Filter.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="section-bar text-[12px] text-text-secondary mb-4">
                {g.label}
              </h2>
              <div className="relative border-l border-border-subtle pl-6 flex flex-col gap-5">
                {g.items.map((s) => {
                  const active = s.status === "active";
                  return (
                    <div key={s.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ${
                          active ? "bg-accent ring-2 ring-accent/25" : "bg-white/25"
                        }`}
                      />
                      <div className="text-[10px] uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                        {formatInplayDate(s.inplay_date)} · {s.inplay_time}
                        {active && (
                          <span className="inline-flex items-center gap-1 text-accent">
                            <Icon name="flame" size={12} /> aktiv
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/szenen/${s.id}`}
                        className={`font-serif text-[16px] hover:underline ${
                          active ? "text-text-primary" : "text-text-secondary"
                        }`}
                      >
                        {s.title}
                      </Link>
                      <div className="text-[12px] text-text-tertiary">
                        {s.location_name} · {areaName(s.location_area)}
                      </div>
                      {s.summary && (
                        <p className="mt-0.5 text-[12px] italic text-text-secondary">
                          {s.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
