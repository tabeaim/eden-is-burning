"use client";

import { characterImage } from "@/lib/avatar";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { pageHeader } from "@/lib/headers";
import { PageHeader } from "@/components/PageHeader";
import { TIER_NAMES, playsAs, tierLabel, tierOf } from "@/lib/characters";
import { PhoneSettings } from "@/components/phone/PhoneSettings";
import { NewCharacterButton } from "@/components/NewCharacterButton";
import { CharacterBasicsForm } from "@/components/CharacterBasicsForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MultiSelect } from "@/components/MultiSelect";
import { Icon } from "@/components/Icon";
import type { Character } from "@/lib/types";

type SettingsTab = "profile" | "characters" | "appearance" | "admin";

export default function SettingsPage() {
  const { currentPlayer, isAdmin } = useStore();
  // „#charakter-<id>" (z.B. aus der Einstellungen-App auf dem Handy) öffnet gleich
  // den Reiter „Meine Charaktere" mit diesem Charakter
  const [tab, setTab] = useState<SettingsTab>("profile");
  // Die Adresse steht erst nach dem ersten Rendern fest (Seitenwechsel innerhalb
  // der App) – deshalb hier und nicht schon beim Anlegen des Zustands lesen.
  useEffect(() => {
    if (/^#(charakter|handy)-/.test(window.location.hash)) setTab("characters");
  }, []);
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

      {/* Inhalt linksbündig in Formularbreite – Container-Breite bleibt einheitlich */}
      <div className="max-w-2xl">
      {/* Reiter wie in der Szenen-Übersicht (runde Pills) */}
      <div className="flex flex-wrap gap-1.5 mb-6">
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
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[0.8125rem] text-text-primary"
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
          className="rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40"
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
  const { currentPlayer, charactersOf, npcs } = useStore();
  if (!currentPlayer) return null;
  const chars = charactersOf(currentPlayer.id);
  // NPCs, die man selbst angelegt hat (Admins: alle) – Profil optional ausfüllbar
  // Nebenfiguren, die ich bespiele (zugeordnete SCs, zeitweise Statist*innen).
  // Selbst angelegte Statist*innen stehen erst hier, wenn ich sie auch bespiele.
  const mine = npcs.filter((c) => playsAs(c, currentPlayer.id));

  const heading = "font-display lowercase text-[2rem] leading-none text-accent";
  return (
    <div className="flex flex-col gap-3">
      <h2 className={heading}>main characters.</h2>
      {chars.map((c) => (
        <CharacterEditor key={c.id} character={c} />
      ))}
      <NewCharacterButton kind="character" />

      <h2 className={`${heading} mt-6`}>supporting characters.</h2>
      {mine
        .filter((c) => tierOf(c) === "supporting")
        .map((c) => (
          <CharacterEditor key={c.id} character={c} />
        ))}
      <NewCharacterButton kind="sc" />

      <h2 className={`${heading} mt-6`}>statist*innen.</h2>
      <p className="-mt-1 text-[0.8125rem] text-text-tertiary">
        Hier stehen nur die Statist*innen, die du gerade bespielst. Alle anderen findest du
        unter Charaktere – dort lassen sie sich auch direkt im Profil bearbeiten.
      </p>
      {mine
        .filter((c) => tierOf(c) === "extra")
        .map((c) => (
          <CharacterEditor key={c.id} character={c} />
        ))}
      <NewCharacterButton kind="extra" />

      <Trash />
    </div>
  );
}

// Papierkorb: gelöschte Charaktere aller Stufen wiederherstellen oder endgültig
// löschen. Sichtbar sind die eigenen, alle Statist*innen (die gehören allen) und
// für Admins alles.
function Trash() {
  const { trashedCharacters, restoreCharacter, deleteCharacter, currentPlayer, isAdmin, posts } =
    useStore();
  const [purge, setPurge] = useState<Character | null>(null);
  if (!currentPlayer) return null;
  const mine = trashedCharacters.filter(
    (c) =>
      isAdmin ||
      tierOf(c) === "extra" ||
      c.player_id === currentPlayer.id ||
      (c.co_owner_ids ?? []).includes(currentPlayer.id),
  );
  if (mine.length === 0) return null;
  const postCount = (c: Character) => posts.filter((p) => p.character_id === c.id).length;
  return (
    <>
      <h2 className="font-display lowercase text-[2rem] leading-none text-accent mt-6">papierkorb.</h2>
      {mine.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterImage(c)} alt="" className="h-10 w-10 rounded-full object-cover bg-bg-primary opacity-60" />
          <div className="min-w-0 flex-1">
            <div className="text-[0.875rem] text-text-primary">{c.name}</div>
            <div className="text-[0.8125rem] text-text-tertiary">
              {TIER_NAMES[tierOf(c)]} · {postCount(c)} {postCount(c) === 1 ? "Post" : "Posts"}
            </div>
          </div>
          <button
            onClick={() => restoreCharacter(c.id)}
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08]"
          >
            Wiederherstellen
          </button>
          <button
            onClick={() => setPurge(c)}
            className="rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
          >
            Endgültig löschen
          </button>
        </div>
      ))}
      {purge && (
        <ConfirmDialog
          title={`${purge.name} endgültig löschen?`}
          warning={`Das lässt sich NICHT rückgängig machen. Mit ${purge.name} werden ${postCount(purge)} ${
            postCount(purge) === 1 ? "Post" : "Posts"
          }, alle Zitate, Chats und Anrufe gelöscht – auch in Szenen anderer Spieler*innen.`}
          text="Wenn du unsicher bist, lass den Charakter einfach im Papierkorb liegen."
          confirmLabel="Endgültig löschen"
          onCancel={() => setPurge(null)}
          onConfirm={() => {
            deleteCharacter(purge.id);
            setPurge(null);
          }}
        />
      )}
    </>
  );
}

function CharacterEditor({ character }: { character: Character }) {
  const { updateCharacter, trashCharacter, posts, currentPlayer } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMain, setConfirmMain] = useState(false);
  const postCount = posts.filter((p) => p.character_id === character.id).length;
  const anchor = `charakter-${character.id}`;
  // „#handy-<id>" (Einstellungen-App auf dem Handy) springt direkt zum Handy-Block
  const phoneAnchor = `handy-${character.id}`;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Gezielt angesprungen: aufklappen und – sobald der Inhalt da ist – hinscrollen
  const [jump, setJump] = useState<"top" | "phone" | null>(null);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== `#${anchor}` && hash !== `#${phoneAnchor}`) return;
    setOpen(true);
    setJump(hash === `#${phoneAnchor}` ? "phone" : "top");
  }, [anchor, phoneAnchor]);
  useEffect(() => {
    if (!jump || !open) return;
    const target = jump === "phone" ? document.getElementById(phoneAnchor) : box.current;
    target?.scrollIntoView({ block: "start" });
    setJump(null);
  }, [jump, open, phoneAnchor]);
  const kindName = TIER_NAMES[tierOf(character)];

  return (
    <div
      ref={box}
      id={anchor}
      className="scroll-mt-4 rounded-xl border border-border-subtle bg-bg-surface overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={characterImage(character)}
          alt={character.name}
          className="w-10 h-10 rounded-full object-cover bg-bg-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[0.875rem] text-text-primary">
            {character.name}
            {character.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                {tierLabel(character)}
              </span>
            )}
          </div>
          <div className="text-[0.875rem] text-text-tertiary">{character.role}</div>
        </div>
        <span className="text-text-tertiary text-[0.875rem]">
          {open ? "Schließen" : "Bearbeiten"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-border-subtle">
          <CharacterBasicsForm character={character} />

          {/* Handy: Main Characters voll, Supporting Characters reduziert, Statist*innen gar nicht */}
          {tierOf(character) !== "extra" && (
            <div id={phoneAnchor} className="scroll-mt-4">
              <PhoneSettings character={character} reduced={character.is_npc} />
            </div>
          )}
          {tierOf(character) === "supporting" && <NpcOwners character={character} />}
          {tierOf(character) === "supporting" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle p-3 sm:p-4">
              <p className="min-w-0 flex-1 text-[0.8125rem] text-text-tertiary">
                Aus einem Supporting Character kann ein Main Character werden – mit vollem Profil
                und eigenem Handy. Er gehört dann nur noch dir.
              </p>
              <button
                onClick={() => setConfirmMain(true)}
                className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08]"
              >
                Zum Main Character machen
              </button>
            </div>
          )}
          {confirmMain && (
            <ConfirmDialog
              title={`${character.name} zum Main Character machen?`}
              text="Der Charakter bekommt das volle Profil und gehört danach nur noch dir. Andere Zuordnungen entfallen. Zurück zum Supporting Character geht es nicht."
              confirmLabel="Zum Main Character machen"
              onCancel={() => setConfirmMain(false)}
              onConfirm={() => {
                setConfirmMain(false);
                if (currentPlayer) {
                  updateCharacter(character.id, {
                    is_npc: false,
                    npc_tier: null,
                    player_id: currentPlayer.id,
                    co_owner_ids: [],
                  });
                }
              }}
            />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
            {/* zeitweise bespielte Statist*in: wieder von mir lösen */}
            {tierOf(character) === "extra" && currentPlayer && playsAs(character, currentPlayer.id) && (
              <button
                onClick={() =>
                  updateCharacter(character.id, {
                    co_owner_ids: (character.co_owner_ids ?? []).filter((id) => id !== currentPlayer.id),
                  })
                }
                className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08]"
              >
                Von mir lösen
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
            >
              <Icon name="trash" size={14} /> {kindName} löschen
            </button>
          </div>
          {confirmDelete && (
            <ConfirmDialog
              title={`${character.name} wirklich löschen?`}
              warning={`Achtung: ${character.name} verschwindet für alle aus Listen, Szenen-Auswahl und Handy.`}
              text={`${kindName} mit ${postCount} ${
                postCount === 1 ? "Post" : "Posts"
              } kommt in den Papierkorb (unten bei „Meine Charaktere“) und lässt sich von dort wiederherstellen. Posts, Chats und Anrufe bleiben erhalten.`}
              confirmLabel="In den Papierkorb"
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => {
                setConfirmDelete(false);
                trashCharacter(character.id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Ein NPC kann mehreren Spieler*innen zugeordnet sein (speichert sofort).
function NpcOwners({ character }: { character: Character }) {
  const { players, player, updateCharacter } = useStore();
  const owners = character.co_owner_ids ?? [];
  const creator = player(character.player_id);
  const others = players.filter((p) => p.id !== character.player_id);
  const save = (ids: string[]) => updateCharacter(character.id, { co_owner_ids: ids });
  return (
    <div className="rounded-lg border border-border-subtle p-3 sm:p-4">
      <div className="text-[0.875rem] font-semibold text-text-primary">Zugeordnet</div>
      <p className="mt-0.5 text-[0.8125rem] text-text-tertiary">
        Angelegt von {creator?.username ?? "?"}. Alle Zugeordneten dürfen den Supporting Character bearbeiten und
        für ihn schreiben.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Weitere Spieler*innen"
          icon="users"
          options={others.map((p) => ({ value: p.id, label: p.username }))}
          selected={owners}
          onToggle={(id) => save(owners.includes(id) ? owners.filter((x) => x !== id) : [...owners, id])}
          onClear={() => save([])}
        />
        <span className="text-[0.8125rem] text-text-secondary">
          {[creator?.username, ...owners.map((id) => player(id)?.username)].filter(Boolean).join(", ")}
        </span>
      </div>
    </div>
  );
}
