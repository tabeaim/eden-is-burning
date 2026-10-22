"use client";

import { playerImage } from "@/lib/avatar";
import { capFirst } from "@/lib/format";
import { BannerPosition } from "@/components/BannerPosition";
import { bannerStyle } from "@/lib/headers";
import { characterImage } from "@/lib/avatar";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { TabRule } from "@/components/TabRule";
import { IMAGE_SIZES, uploadImage } from "@/lib/images";
import { defaultHeader } from "@/lib/headers";
import { PageHeader } from "@/components/PageHeader";
import { TIER_NAMES, isPaused, playsAs, tierLabel, tierOf } from "@/lib/characters";
import { PAUSED_CLASS } from "@/lib/gone";
import { Toggle } from "@/components/Toggle";
import { PhoneSettings } from "@/components/phone/PhoneSettings";
import { NewCharacterButton } from "@/components/NewCharacterButton";
import Link from "next/link";
import { CharacterBasicsForm } from "@/components/CharacterBasicsForm";
import { Collapsible } from "@/components/Collapsible";
import { PlayExistingButton } from "@/components/PlayExistingButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MultiSelect } from "@/components/MultiSelect";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/lib/theme";
import {
  MAX_CUSTOM_PING_SECONDS,
  PING_CUSTOM_KEY,
  PING_CUSTOM_NAME_KEY,
  PING_KEY,
  PING_SOUNDS,
  PING_SOUND_KEY,
  type PingSound,
  pingEnabled,
  pingSound,
  playPing,
  readCustomPing,
} from "@/components/AlertPing";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type { Character } from "@/lib/types";

type SettingsTab = "profile" | "characters" | "appearance" | "notifications" | "admin";

export default function SettingsPage() {
  const { currentPlayer, isAdmin } = useStore();
  // „#charakter-<id>" (z.B. aus der Einstellungen-App auf dem Handy) öffnet gleich
  // den Reiter „Meine Charaktere" mit diesem Charakter
  const [tab, setTab] = useState<SettingsTab>("characters");
  // Die Adresse steht erst nach dem ersten Rendern fest (Seitenwechsel innerhalb
  // der App) – deshalb hier und nicht schon beim Anlegen des Zustands lesen.
  useEffect(() => {
    if (/^#(charakter|handy)-/.test(window.location.hash)) setTab("characters");
  }, []);
  if (!currentPlayer) return null;

  const tabs: [SettingsTab, string][] = [
    ["characters", "Meine Charaktere"],
    ["appearance", "Darstellung"],
    ["notifications", "Benachrichtigungen"],
    ["profile", "Meine Daten"],
  ];
  if (isAdmin) tabs.push(["admin", "Admin"]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-5 pb-8">
      <PageHeader title="Einstellungen" width="max-w-6xl" />

      {/* Reiter wie in der Szenen-Übersicht (runde Pills), darunter der Strich über die Seitenbreite */}
      <div className="flex flex-wrap gap-1.5">
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
      <TabRule />

      {/* Inhalt linksbündig in Formularbreite; die Admin-Verwaltung braucht mehr Platz */}
      <div className={tab === "admin" ? "max-w-5xl" : "max-w-2xl"}>
      {tab === "profile" && <ProfileTab />}
      {tab === "characters" && <CharactersTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "admin" && isAdmin && <AdminPanel />}
      </div>
    </div>
  );
}

const field =
  "w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-[0.875rem] text-text-primary outline-none focus:border-white/20";

function ProfileTab() {
  const { currentPlayer, players, updatePlayer, changeEmail, changePassword, deletePlayer, signIn, signOut } = useStore();
  const [username, setUsername] = useState(currentPlayer?.username ?? "");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Konto
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  // Konto löschen: erst aufklappen, dann zur Bestätigung das Passwort eingeben
  const [deleting, setDeleting] = useState(false);
  const [confirmPw, setConfirmPw] = useState("");
  if (!currentPlayer) return null;

  async function removeAccount() {
    if (!currentPlayer) return;
    setBusy(true);
    // Passwort prüfen (meldet mit denselben Daten neu an)
    const check = await signIn(currentPlayer.email, confirmPw);
    if (check.error) {
      setBusy(false);
      setNotice({ ok: false, text: "Das Passwort stimmt nicht." });
      return;
    }
    const res = await deletePlayer(currentPlayer.id);
    if (res.error) {
      setBusy(false);
      setNotice({ ok: false, text: `Das Konto ließ sich nicht löschen: ${res.error}` });
      return;
    }
    await signOut();
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentPlayer) return;
    const url = await uploadImage(file, "avatars", IMAGE_SIZES.avatar);
    updatePlayer(currentPlayer.id, { avatar_url: url });
  }

  const name = username.trim();
  const taken = players.some(
    (p) => p.id !== currentPlayer.id && p.username.toLowerCase() === name.toLowerCase(),
  );
  const nameOk = name.length >= 2 && !taken;
  function saveName() {
    if (!nameOk || name === currentPlayer!.username) return;
    updatePlayer(currentPlayer!.id, { username: name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function saveEmail() {
    setBusy(true);
    setNotice(null);
    const { error } = await changeEmail(email);
    setBusy(false);
    setNotice(
      error
        ? { ok: false, text: `E-Mail nicht geändert: ${error}` }
        : {
            ok: true,
            text: "Gespeichert. Falls eine Bestätigung nötig ist, kommt eine Mail an die neue Adresse – erst danach gilt sie für die Anmeldung.",
          },
    );
    if (!error) setEmail("");
  }
  async function savePassword() {
    setBusy(true);
    setNotice(null);
    const { error } = await changePassword(pw);
    setBusy(false);
    setNotice(error ? { ok: false, text: `Passwort nicht geändert: ${error}` } : { ok: true, text: "Passwort geändert." });
    if (!error) {
      setPw("");
      setPw2("");
    }
  }

  const primary =
    "rounded-md bg-accent/90 hover:bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-black disabled:opacity-40";
  const heading = "font-display lowercase text-[1.625rem] leading-none text-accent";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playerImage(currentPlayer)}
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
          <input ref={fileRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />
        </div>
      </div>

      <div className="text-[0.875rem] text-text-secondary">
        Username
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            value={username}
            maxLength={30}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className={`${field} max-w-xs`}
          />
          <button onClick={saveName} disabled={!nameOk || name === currentPlayer.username} className={primary}>
            Speichern
          </button>
          {saved && <span className="text-[0.875rem] text-text-secondary">Gespeichert ✓</span>}
        </div>
        {taken && <span className="mt-1 block text-[0.8125rem] text-red-300">Diesen Namen gibt es schon.</span>}
        <span className="mt-1 block text-[0.8125rem] text-text-tertiary">
          Lässt sich jederzeit ändern. Mit dem neuen Namen meldest du dich dann auch an.
        </span>
      </div>

      <div>
        <Link
          href={`/spieler/${encodeURIComponent(currentPlayer.username)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-primary hover:bg-white/[0.08]"
        >
          <Icon name="star" size={14} /> Zum Profil
        </Link>
      </div>

      {/* Konto: Anmelde-Adresse und Passwort */}
      <h2 className={`${heading} mt-4`}>konto.</h2>
      <div className="text-[0.875rem] text-text-secondary">
        E-Mail-Adresse <span className="text-text-tertiary">(aktuell: {currentPlayer.email})</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="neue Adresse"
            autoComplete="email"
            className={`${field} max-w-xs`}
          />
          <button onClick={() => void saveEmail()} disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())} className={primary}>
            E-Mail ändern
          </button>
        </div>
      </div>
      <div className="text-[0.875rem] text-text-secondary">
        Neues Passwort <span className="text-text-tertiary">(mindestens 6 Zeichen)</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="neues Passwort"
            autoComplete="new-password"
            className={`${field} max-w-[14rem]`}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="wiederholen"
            autoComplete="new-password"
            className={`${field} max-w-[14rem]`}
          />
          <button onClick={() => void savePassword()} disabled={busy || pw.length < 6 || pw !== pw2} className={primary}>
            Passwort ändern
          </button>
        </div>
        {pw2 && pw !== pw2 && (
          <span className="mt-1 block text-[0.8125rem] text-red-300">Die beiden Eingaben stimmen nicht überein.</span>
        )}
      </div>
      {notice && (
        <p role="status" className={`text-[0.8125rem] ${notice.ok ? "text-text-secondary" : "text-red-300"}`}>
          {notice.text}
        </p>
      )}

      {/* Konto löschen */}
      <h2 className={`${heading} mt-6`}>konto löschen.</h2>
      {!deleting ? (
        <div>
          <p className="mb-2 text-[0.8125rem] text-text-tertiary">
            Löscht dein Konto samt Login. Das lässt sich nicht rückgängig machen.
          </p>
          <button
            onClick={() => setDeleting(true)}
            className="rounded-md border border-red-400/40 px-3 py-1.5 text-[0.8125rem] text-red-300 hover:bg-red-500/10"
          >
            Konto löschen …
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-red-400/40 p-4">
          <p className="text-[0.875rem] font-medium text-red-300">Das lässt sich NICHT rückgängig machen.</p>
          <ul className="list-disc pl-5 text-[0.8125rem] leading-relaxed text-text-secondary">
            <li>Dein Login und dein Spieler*innen-Profil werden gelöscht.</li>
            <li>
              Deine Charaktere, Szenen und Posts bleiben bestehen, werden aber als „gelöscht“ gekennzeichnet: Dein
              Name erscheint ausgegraut, die Charakternamen durchgestrichen.
            </li>
            <li>Hast du nichts erstellt, verschwindest du ohne Spur.</li>
            <li>Admins können später alle Spuren von dir und deinen Charakteren endgültig entfernen.</li>
          </ul>
          <label className="text-[0.8125rem] text-text-secondary">
            Zur Bestätigung dein Passwort:
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="current-password"
              className={`mt-1 ${field} max-w-xs`}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setDeleting(false);
                setConfirmPw("");
              }}
              className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Abbrechen
            </button>
            <button
              onClick={() => void removeAccount()}
              disabled={busy || !confirmPw}
              className="rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-[0.8125rem] text-red-200 hover:bg-red-500/20 disabled:opacity-40"
            >
              {busy ? "Löscht …" : "Konto endgültig löschen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Darstellung: eigener Dashboard-Header und Farbmodus (dunkel/hell).
function AppearanceTab() {
  const { currentPlayer, updatePlayer, appSettings } = useStore();
  const { theme, chosen, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Entwurf, solange der Ausschnitt-Regler bewegt wird (gespeichert beim Loslassen)
  const [draft, setDraft] = useState<string | null>(null);
  if (!currentPlayer) return null;
  const header = draft ?? currentPlayer.dashboard_header_url ?? null;

  async function onHeader(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentPlayer) return;
    setBusy(true);
    try {
      const url = await uploadImage(file, "dashboards", IMAGE_SIZES.banner);
      setDraft(null);
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
              onClick={() => {
                setDraft(null);
                updatePlayer(currentPlayer.id, { dashboard_header_url: null });
              }}
              className="text-[0.8125rem] text-text-tertiary hover:text-text-primary"
            >
              Entfernen
            </button>
          )}
        </div>
        <div
          className="relative h-32 w-full rounded-md overflow-hidden border border-border-subtle bg-bg-primary bg-cover"
          style={bannerStyle(header || defaultHeader(appSettings, "dashboard", theme))}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/70 to-transparent" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="on-dark absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 hover:bg-black/70 border border-border-subtle px-2.5 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50"
          >
            <Icon name="upload" size={14} /> {busy ? "Lädt hoch…" : "Bild hochladen"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onHeader} className="hidden" />
        {header && (
          <BannerPosition
            url={header}
            onChange={setDraft}
            onCommit={(url) => {
              if (url !== currentPlayer.dashboard_header_url) updatePlayer(currentPlayer.id, { dashboard_header_url: url });
              setDraft(null);
            }}
          />
        )}
        <p className="mt-1 text-[0.8125rem] text-text-tertiary">
          Nur du siehst diesen Header, oben auf deinem Dashboard.
        </p>
      </div>

      {/* Farbmodus */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-2">Farbmodus</div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["dark", "Dunkel"],
              ["light", "Hell"],
            ] as const
          ).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              aria-pressed={theme === key}
              className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
                theme === key
                  ? "bg-accent text-black font-medium"
                  : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
              }`}
            >
              {name}
            </button>
          ))}
          {chosen && (
            <button onClick={() => setTheme(null)} className="px-2 text-[0.8125rem] text-text-tertiary hover:text-text-primary">
              Standard der App
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

// Benachrichtigungen: Ton bei Neuem an/aus, Ton wählen oder eigenen hochladen.
// Alles gilt nur auf diesem Gerät (liegt im Browser).
function NotificationsTab() {
  const [ping, setPing] = useState(true);
  const [sound, setSound] = useState<PingSound>("chime");
  const [customName, setCustomName] = useState<string | null>(null);
  const [hasCustom, setHasCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setPing(pingEnabled());
    setSound(pingSound());
    try {
      setHasCustom(!!localStorage.getItem(PING_CUSTOM_KEY));
      setCustomName(localStorage.getItem(PING_CUSTOM_NAME_KEY));
    } catch {
      /* ignore */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function store(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function choose(next: PingSound) {
    setSound(next);
    store(PING_SOUND_KEY, next);
    playPing(next);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const url = await readCustomPing(file);
      if (!store(PING_CUSTOM_KEY, url)) throw new Error("Der Browser hat keinen Platz für diese Datei.");
      store(PING_CUSTOM_NAME_KEY, file.name);
      setHasCustom(true);
      setCustomName(file.name);
      choose("custom");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function removeCustom() {
    store(PING_CUSTOM_KEY, null);
    store(PING_CUSTOM_NAME_KEY, null);
    setHasCustom(false);
    setCustomName(null);
    if (sound === "custom") {
      setSound("chime");
      store(PING_SOUND_KEY, "chime");
    }
  }

  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors ${
      active ? "bg-accent text-black font-medium" : "bg-white/[0.04] text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="flex flex-col gap-8">
      {/* Ton an/aus */}
      <Toggle
        checked={ping}
        onChange={(on) => {
          setPing(on);
          store(PING_KEY, on ? "1" : "0");
          if (on) playPing();
        }}
      >
        Ton bei Neuem{" "}
        <span className="text-text-tertiary">
          (neuer Post in deinen Szenen, Nachricht, Anruf, Mailbox, Captic – solange Eden in einem Tab offen ist)
        </span>
      </Toggle>

      {/* Tonauswahl */}
      <div className={ping ? "" : "opacity-50"}>
        <div className="text-[0.875rem] text-text-secondary mb-2">Ton</div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PING_SOUNDS) as (keyof typeof PING_SOUNDS)[]).map((key) => (
            <button key={key} onClick={() => choose(key)} aria-pressed={sound === key} className={pill(sound === key)}>
              {PING_SOUNDS[key].label}
            </button>
          ))}
          {hasCustom && (
            <button
              onClick={() => choose("custom")}
              aria-pressed={sound === "custom"}
              className={`${pill(sound === "custom")} max-w-[16rem] truncate`}
              title={customName ?? undefined}
            >
              Eigener Ton{customName ? `: ${customName}` : ""}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[0.8125rem] text-text-tertiary">Antippen spielt den Ton zur Probe ab.</p>
      </div>

      {/* Eigener Ton */}
      <div>
        <div className="text-[0.875rem] text-text-secondary mb-2">Eigener Ton</div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-border-subtle px-3 py-1.5 text-[0.8125rem] text-text-primary disabled:opacity-50"
          >
            <Icon name="upload" size={14} /> {busy ? "Prüft…" : hasCustom ? "Anderen Ton hochladen" : "Ton hochladen"}
          </button>
          {hasCustom && (
            <button onClick={removeCustom} className="text-[0.8125rem] text-text-tertiary hover:text-text-primary">
              Eigenen Ton entfernen
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="audio/*" onChange={onUpload} className="hidden" />
        {error && <p className="mt-1.5 text-[0.8125rem] text-red-300">{error}</p>}
        <p className="mt-1.5 text-[0.8125rem] text-text-tertiary">
          MP3, WAV, OGG o.ä., höchstens 1 MB und {MAX_CUSTOM_PING_SECONDS} Sekunden.
        </p>
      </div>

      <p className="text-[0.8125rem] text-text-tertiary">
        Diese Einstellungen gelten nur auf diesem Gerät und in diesem Browser.
      </p>
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

  const heading = "font-display lowercase text-[1.625rem] leading-none text-accent";
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
      <div className="flex flex-wrap items-start gap-2">
        <NewCharacterButton kind="sc" />
        <PlayExistingButton tier="supporting" />
      </div>

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
      <div className="flex flex-wrap items-start gap-2">
        <NewCharacterButton kind="extra" />
        <PlayExistingButton tier="extra" />
      </div>

    </div>
  );
}

function CharacterEditor({ character }: { character: Character }) {
  const { updateCharacter, trashCharacter, posts, currentPlayer } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMain, setConfirmMain] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const postCount = posts.filter((p) => p.character_id === character.id).length;
  const anchor = `charakter-${character.id}`;
  // „#handy-<id>" (Einstellungen-App auf dem Handy) springt direkt zum Handy-Block
  const phoneAnchor = `handy-${character.id}`;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Gezielt angesprungen: aufklappen und – sobald der Inhalt da ist – hinscrollen
  const [jump, setJump] = useState<"top" | "phone" | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false); // Handy-Abschnitt gezielt geöffnet
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== `#${anchor}` && hash !== `#${phoneAnchor}`) return;
    setOpen(true);
    if (hash === `#${phoneAnchor}`) setPhoneOpen(true);
    setJump(hash === `#${phoneAnchor}` ? "phone" : "top");
  }, [anchor, phoneAnchor]);
  useEffect(() => {
    if (!jump || !open) return;
    const target = jump === "phone" ? document.getElementById(phoneAnchor) : box.current;
    target?.scrollIntoView({ block: "start" });
    setJump(null);
  }, [jump, open, phoneAnchor]);
  const kindName = TIER_NAMES[tierOf(character)];
  const paused = isPaused(character);

  return (
    <div
      ref={box}
      id={anchor}
      className={`scroll-mt-4 rounded-xl border border-border-subtle bg-bg-surface ${
        paused ? "border-dashed" : ""
      }`}
    >
      {/* kein overflow-hidden an der Karte: aufgeklappte Auswahllisten (Zuordnung)
          ragen über ihren Rand hinaus */}
      <div className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] ${open ? "rounded-t-xl" : "rounded-xl"}`}>
        <Link href={`/charaktere/${character.id}`} title="Zum Profil" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterImage(character)}
            alt={`Profil von ${character.name}`}
            className="w-10 h-10 rounded-full object-cover bg-bg-primary ring-1 ring-transparent hover:ring-accent/60"
          />
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
        <div className="flex-1 min-w-0">
          <div className="text-[0.875rem] text-text-primary">
            <span className={paused ? `${PAUSED_CLASS} opacity-60` : ""}>{character.name}</span>
            {character.is_npc && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">
                {tierLabel(character)}
              </span>
            )}
            {paused && (
              <span className="ml-1.5 text-[0.6875rem] uppercase tracking-wider text-text-tertiary">pausiert</span>
            )}
          </div>
          <div className="text-[0.875rem] text-text-tertiary">{capFirst(character.role)}</div>
        </div>
        <span className="text-text-tertiary text-[0.875rem]">
          {open ? "Schließen" : "Bearbeiten"}
        </span>
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-border-subtle">
          <CharacterBasicsForm character={character} />

          {/* Handy: Main Characters voll, Supporting Characters reduziert, Statist*innen gar nicht */}
          {tierOf(character) !== "extra" && (
            <div id={phoneAnchor} className="scroll-mt-4">
              <Collapsible title="Handy-Einstellungen" forceOpen={phoneOpen}>
                <PhoneSettings character={character} reduced={character.is_npc} />
              </Collapsible>
            </div>
          )}
          {tierOf(character) === "main" && (
            <Collapsible title="Pausieren">
              <Toggle
                checked={paused}
                onChange={(on) =>
                  updateCharacter(character.id, { profile: { ...(character.profile ?? {}), paused: on } })
                }
              >
                {character.name} pausieren
              </Toggle>
              <p className="text-[0.8125rem] text-text-tertiary">
                Für Charaktere, die du gerade nicht bespielst: Die Charakter-Karte wird ausgegraut, der Name
                steht in Szenen kursiv, und auf dem Dashboard taucht {character.name} nicht mehr als Gruppe auf.
                Szenen, Posts und Chats bleiben, wie sie sind – schreiben kannst du weiterhin.
              </p>
            </Collapsible>
          )}
          {tierOf(character) === "supporting" && (
            <Collapsible title="Zuordnung">
              <NpcOwners character={character} />
            </Collapsible>
          )}
          {tierOf(character) === "supporting" && (
            <Collapsible title="Stufe">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
            </Collapsible>
          )}
          {confirmLeave && currentPlayer && (
            <ConfirmDialog
              title={`${character.name} von dir lösen?`}
              text={`Du kannst ${character.name} danach nicht mehr bearbeiten und nicht mehr für sie schreiben. Bisherige Posts bleiben stehen; bespielen kannst du sie jederzeit wieder.`}
              confirmLabel="Von mir lösen"
              onCancel={() => setConfirmLeave(false)}
              onConfirm={() => {
                setConfirmLeave(false);
                updateCharacter(character.id, {
                  co_owner_ids: (character.co_owner_ids ?? []).filter((id) => id !== currentPlayer.id),
                });
              }}
            />
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
                onClick={() => setConfirmLeave(true)}
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
              } wird gelöscht: In Szenen und Posts bleibt der Name durchgestrichen stehen, Posts, Chats und Anrufe bleiben erhalten. Nur Admins können ${character.name} über ihren Papierkorb wiederherstellen oder endgültig löschen.`}
              confirmLabel="Löschen"
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
  const { players, player, updateCharacter, currentPlayer } = useStore();
  // Wer sich selbst abwählt, verliert den Zugriff – vorher nachfragen
  const [leaving, setLeaving] = useState<string[] | null>(null);
  const me = currentPlayer?.id;
  const owners = character.co_owner_ids ?? [];
  const creator = player(character.player_id);
  const others = players.filter((p) => p.id !== character.player_id);
  const write = (ids: string[]) => updateCharacter(character.id, { co_owner_ids: ids });
  const save = (ids: string[]) =>
    me && owners.includes(me) && !ids.includes(me) ? setLeaving(ids) : write(ids);
  return (
    <div>
      {leaving && (
        <ConfirmDialog
          title={`${character.name} von dir lösen?`}
          text={`Du bist ${character.name} dann nicht mehr zugeordnet: Du kannst den Supporting Character nicht mehr bearbeiten und nicht mehr für ihn schreiben. Zurück kommst du nur, wenn dich jemand der Zugeordneten wieder einträgt.`}
          confirmLabel="Von mir lösen"
          onCancel={() => setLeaving(null)}
          onConfirm={() => {
            write(leaving);
            setLeaving(null);
          }}
        />
      )}
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
