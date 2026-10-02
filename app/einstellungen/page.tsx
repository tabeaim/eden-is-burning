"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AREA_ORDER, AREAS, type AreaKey } from "@/lib/world";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { pageHeader } from "@/lib/headers";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import type { Character } from "@/lib/types";

type SettingsTab = "profile" | "characters" | "appearance" | "admin";

export default function SettingsPage() {
  const { currentPlayer, isAdmin } = useStore();
  const [tab, setTab] = useState<SettingsTab>("profile");
  if (!currentPlayer) return null;

  const tabs: [SettingsTab, string][] = [
    ["profile", "Mein Profil"],
    ["characters", "Meine Charaktere"],
    ["appearance", "Darstellung"],
  ];
  if (isAdmin) tabs.push(["admin", "Freischaltungen"]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <PageHeader title="Einstellungen" width="max-w-6xl" />

      {/* Inhalt linksbündig in Formularbreite — Container-Breite bleibt einheitlich */}
      <div className="max-w-2xl">
      <div className="flex gap-1.5 mb-6 border-b border-border-subtle">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-[0.8125rem] -mb-px border-b-2 transition-colors ${
              tab === key
                ? "border-white/40 text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "characters" && <CharactersTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "admin" && isAdmin && <AdminTab />}
      </div>
    </div>
  );
}

// Nur für Admins: neu registrierte Spieler*innen freischalten.
function AdminTab() {
  const { players, updatePlayer, currentPlayer, refresh } = useStore();
  const pending = players.filter((p) => !p.approved);
  const approved = players.filter((p) => p.approved);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-3">
          Wartet auf Freischaltung ({pending.length})
        </div>
        {pending.length === 0 ? (
          <p className="text-[0.875rem] text-text-tertiary">
            Niemand wartet gerade.{" "}
            <button onClick={() => refresh()} className="underline hover:text-text-secondary">
              Aktualisieren
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-bg-surface border border-border-subtle rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[0.875rem] text-text-primary truncate">
                    {p.username}
                  </div>
                  <div className="text-[0.875rem] text-text-tertiary truncate">
                    {p.email}
                  </div>
                </div>
                <button
                  onClick={() => updatePlayer(p.id, { approved: true })}
                  className="rounded-md bg-accent/90 hover:bg-accent text-black font-medium border border-accent px-3 py-1.5 text-[0.8125rem] transition-colors"
                >
                  Freischalten
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-[0.875rem] text-text-secondary mb-3">
          Freigeschaltet ({approved.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {approved.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 bg-bg-surface border border-border-subtle rounded-full px-3 py-1 text-[0.8125rem] text-text-secondary"
            >
              {p.username}
              {p.is_admin && <span className="text-accent">· Admin</span>}
              {p.id === currentPlayer?.id && (
                <span className="text-text-tertiary">· du</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

function ProfileTab() {
  const { currentPlayer, updatePlayer } = useStore();
  const [bio, setBio] = useState(currentPlayer?.bio ?? "");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!currentPlayer) return null;

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentPlayer) return;
    const url = await uploadImage(file, "avatars", IMAGE_SIZES.avatar);
    updatePlayer(currentPlayer.id, { avatar_url: url });
  }

  function save() {
    updatePlayer(currentPlayer!.id, { bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPlayer.avatar_url ?? ""}
          alt={currentPlayer.username}
          className="w-20 h-20 rounded-full object-cover bg-bg-surface border border-border-subtle"
        />
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] border border-border-subtle px-3 py-2 text-[0.8125rem] text-text-primary"
          >
            <Icon name="upload" size={15} /> Avatar hochladen
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onAvatar}
            className="hidden"
          />
        </div>
      </div>

      <label className="text-[0.875rem] text-text-secondary">
        Username
        <input value={currentPlayer.username} readOnly className={`mt-1 ${field} opacity-60`} />
      </label>

      <label className="text-[0.875rem] text-text-secondary">
        Bio <span className="text-text-tertiary">({bio.length}/500)</span>
        <textarea
          value={bio}
          maxLength={500}
          rows={4}
          onChange={(e) => setBio(e.target.value)}
          className={`mt-1 ${field} resize-y`}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary"
        >
          Speichern
        </button>
        {saved && <span className="text-[0.875rem] text-text-secondary">Gespeichert ✓</span>}
      </div>
    </div>
  );
}

// Darstellung: eigener Dashboard-Header und Farbmodus.
function AppearanceTab() {
  const { currentPlayer, updatePlayer } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!currentPlayer) return null;
  const header = currentPlayer.dashboard_header_url ?? null;

  async function onHeader(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentPlayer) return;
    setBusy(true);
    try {
      const url = await uploadImage(file, "dashboards", IMAGE_SIZES.banner);
      updatePlayer(currentPlayer.id, { dashboard_header_url: url });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Dashboard-Header */}
      <div>
        <div className="flex items-center justify-between text-[0.875rem] text-text-secondary mb-1">
          <span>
            Header für dein Dashboard{" "}
            {!header && <span className="text-text-tertiary">(Standard)</span>}
          </span>
          {header && (
            <button
              type="button"
              onClick={() => updatePlayer(currentPlayer.id, { dashboard_header_url: null })}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Entfernen
            </button>
          )}
        </div>
        <div
          className="relative h-32 w-full rounded-md overflow-hidden border border-border-subtle bg-bg-primary bg-center bg-cover"
          style={{ backgroundImage: `url("${header || pageHeader("dashboard")}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50"
          >
            <Icon name="upload" size={14} /> {busy ? "Lädt hoch…" : "Bild hochladen"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onHeader} className="hidden" />
        <p className="mt-1 text-[0.8125rem] text-text-tertiary">
          Nur du siehst diesen Header, oben auf deinem Dashboard. Querformat wirkt am besten.
        </p>
      </div>

      {/* Farbmodus */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-2">Farbmodus</div>
        <div className="flex gap-2">
          <span className="rounded-md border border-accent/50 bg-accent-soft px-3 py-1.5 text-[0.8125rem] text-text-primary">
            Dunkel
          </span>
          <span
            title="Der Hellmodus kommt später"
            className="rounded-md border border-border-subtle bg-bg-primary px-3 py-1.5 text-[0.8125rem] text-text-tertiary opacity-60"
          >
            Hell <span className="text-[0.75rem]">(kommt später)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function CharactersTab() {
  const { currentPlayer, charactersOf, addCharacter, npcs, canEditCharacter } =
    useStore();
  if (!currentPlayer) return null;
  const chars = charactersOf(currentPlayer.id);
  // NPCs, die man selbst angelegt hat (Admins: alle) — Profil optional ausfüllbar
  const myNpcs = npcs.filter(canEditCharacter);

  return (
    <div className="flex flex-col gap-3">
      {chars.map((c) => (
        <CharacterEditor key={c.id} character={c} />
      ))}
      <button
        onClick={() => addCharacter(currentPlayer.id)}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-4 text-[0.8125rem] text-text-secondary hover:text-text-primary hover:border-white/30 transition-colors"
      >
        <Icon name="plus" size={16} /> Neuen Charakter anlegen
      </button>

      {myNpcs.length > 0 && (
        <>
          <div className="mt-4 text-[0.875rem] uppercase tracking-wider font-semibold text-text-tertiary">
            NPCs
          </div>
          {myNpcs.map((c) => (
            <CharacterEditor key={c.id} character={c} />
          ))}
        </>
      )}
    </div>
  );
}

function CharacterEditor({ character }: { character: Character }) {
  const { updateCharacter } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(character);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "characters", IMAGE_SIZES.portrait);
    set("faceclaim_image_url", url);
    updateCharacter(character.id, { faceclaim_image_url: url });
  }

  function save() {
    updateCharacter(character.id, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft.faceclaim_image_url ?? ""}
          alt={draft.name}
          className="h-10 w-12 rounded-md object-cover bg-bg-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[0.875rem] text-text-primary">
            {draft.name}
            {character.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                NPC
              </span>
            )}
          </div>
          <div className="text-[0.875rem] text-text-tertiary">{draft.role}</div>
        </div>
        <span className="text-text-tertiary text-[0.875rem]">
          {open ? "Schließen" : "Bearbeiten"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-border-subtle">
          <div className="flex items-start gap-4 pt-4">
            <div className="w-[110px] shrink-0">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-primary border border-border-subtle">
                {draft.faceclaim_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.faceclaim_image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
                    <Icon name="photo" size={22} />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] border border-border-subtle px-2 py-1.5 text-[0.8125rem] text-text-primary"
              >
                <Icon name="upload" size={13} /> Foto
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPhoto}
                className="hidden"
              />
              <p className="mt-1 text-[0.875rem] text-text-tertiary text-center">
                Pflicht für V1
              </p>
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Labeled label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={field}
                />
              </Labeled>
              <Labeled label="Faceclaim (Schauspieler)">
                <input
                  value={draft.faceclaim ?? ""}
                  onChange={(e) => set("faceclaim", e.target.value)}
                  className={field}
                />
              </Labeled>
              <Labeled label={`Tagline (${(draft.tagline ?? "").length}/60)`}>
                <input
                  value={draft.tagline ?? ""}
                  maxLength={60}
                  onChange={(e) => set("tagline", e.target.value)}
                  className={field}
                />
              </Labeled>
              <Labeled label="Rolle">
                <input
                  value={draft.role ?? ""}
                  onChange={(e) => set("role", e.target.value)}
                  className={field}
                />
              </Labeled>
              <Labeled label="Alter">
                <input
                  type="number"
                  value={draft.age ?? ""}
                  onChange={(e) =>
                    set("age", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className={field}
                />
              </Labeled>
              <Labeled label="Viertel">
                <select
                  value={draft.area}
                  onChange={(e) => set("area", e.target.value as AreaKey)}
                  className={field}
                >
                  {character.is_npc && (
                    <option value="" className="bg-bg-surface">
                      —
                    </option>
                  )}
                  {AREA_ORDER.map((k) => (
                    <option key={k} value={k} className="bg-bg-surface">
                      {AREAS[k].name}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>
          </div>

          <Labeled label={`Bio (${(draft.bio ?? "").length}/1000)`}>
            <textarea
              value={draft.bio ?? ""}
              maxLength={1000}
              rows={4}
              onChange={(e) => set("bio", e.target.value)}
              className={`${field} resize-y`}
            />
          </Labeled>
          <Labeled label="Pinterest-URL">
            <input
              value={draft.pinterest_url ?? ""}
              onChange={(e) => set("pinterest_url", e.target.value)}
              className={field}
            />
          </Labeled>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              className="rounded-md bg-white/[0.1] hover:bg-white/[0.16] border border-border-subtle px-5 py-2 text-[0.8125rem] text-text-primary"
            >
              Speichern
            </button>
            {saved && (
              <span className="text-[0.875rem] text-text-secondary">
                Gespeichert ✓
              </span>
            )}
            <Link
              href={`/charaktere/${character.id}`}
              className="ml-auto text-[0.875rem] text-text-tertiary hover:text-text-secondary"
            >
              Profil ansehen →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-[0.875rem] text-text-secondary block">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
