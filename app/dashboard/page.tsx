"use client";

import { playerImage } from "@/lib/avatar";
import { CAPTIC_OPEN_KEY } from "@/components/phone/captic/CapticApp";
import { characterImage } from "@/lib/avatar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore, whoseTurn } from "@/lib/store";
import { timeAgo, withinHours } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuoteRotator } from "@/components/QuoteRotator";
import { SceneCard, SceneRow } from "@/components/SceneCard";
import { ChatRow } from "@/components/phone/ChatRow";
import { MAILBOX_KEY, rememberPhone } from "@/lib/phone";
import { formatInplayDateShort } from "@/lib/format";
import { chatUnits, isArchived, isLeftOnRead, unitKey, type ChatUnit } from "@/lib/chats";
import { isPaused } from "@/lib/characters";
import type { Character, Player, Scene } from "@/lib/types";

// Merker für auf-/zugeklappte Abschnitte (pro Gerät)
const DRAN_KEY = "eden:dash-dran";
const WARTEN_KEY = "eden:dash-warten";
function recall(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const store = useStore();
  const {
    currentPlayer,
    scenes,
    players,
    charactersOf,
    postsOf,
    onlineIds,
    idleIds,
    mobileIds,
    chats,
    chatMessages,
    chatScenes,
    incomingCalls,
    mailboxAlerts,
    dismissMailboxAlert,
    capticAlerts,
    character,
    myNpcs,
    isSubscribed,
  } = store;
  // Auf-/zugeklappte Abschnitte merkt sich das Gerät (localStorage); null = noch
  // nie selbst umgeschaltet → Standard (s.u.)
  // (Das Dashboard wird erst nach dem Laden im Browser gezeichnet, siehe AppShell –
  // der Merker lässt sich deshalb gleich beim ersten Zeichnen lesen.)
  const [showWartenState, setShowWartenState] = useState<boolean | null>(() => recall(WARTEN_KEY));
  const [showDran, setShowDranState] = useState<boolean | null>(() => recall(DRAN_KEY));
  const remember = (key: string, open: boolean) => {
    try {
      localStorage.setItem(key, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  const setShowDran = (open: boolean) => {
    setShowDranState(open);
    remember(DRAN_KEY, open);
  };
  const showWarten = showWartenState ?? false;
  const setShowWarten = (open: boolean) => {
    setShowWartenState(open);
    remember(WARTEN_KEY, open);
  };
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (!currentPlayer) return null;

  // Main Characters und bespielte Nebenfiguren. Für Nebenfiguren (SC, Statist*in)
  // zählen nur „abonnierte" Szenen und Chats – also die, in denen ich selbst mit
  // ihnen gestartet oder geantwortet habe (mehrere können dieselbe Figur bespielen).
  // Pausierte Main Characters bilden keine Gruppe und zählen nicht mit.
  const myChars = [...charactersOf(currentPlayer.id).filter((c) => !isPaused(c)), ...myNpcs];
  const follows = (c: Character, itemId: string) => !c.is_npc || isSubscribed(itemId);

  // Zeitpunkt des letzten Posts einer Szene (postsOf ist nach post_number sortiert)
  const lastPostAt = (sceneId: string): string | null => {
    const posts = postsOf(sceneId);
    return posts.length ? posts[posts.length - 1].created_at : null;
  };
  // Szene mit dem jüngsten Post zuerst
  const byLastPostDesc = (a: Scene, b: Scene) =>
    new Date(lastPostAt(b.id) ?? b.created_at).getTime() -
    new Date(lastPostAt(a.id) ?? a.created_at).getTime();

  // Chats (Handy), je Strang: jede aktive SMS-Szene und die losen Nachrichten eines
  // Chats zählen einzeln. Unbeantwortet = die neueste Nachricht des Strangs kommt
  // von jemand anderem. Archivierte Chats und „leave on read" sind pausiert.
  const allUnits = chats.flatMap((ch) => chatUnits(ch, chatMessages, chatScenes));
  const openChatsOf = (c: Character) =>
    allUnits.filter(
      (u) =>
        u.chat.participant_ids.includes(c.id) &&
        follows(c, u.chat.id) &&
        !isArchived(u.chat) &&
        !isLeftOnRead(u.chat, c.id, u.last),
    );
  const byLastMsgDesc = (a: ChatUnit, b: ChatUnit) =>
    b.last.created_at.localeCompare(a.last.created_at);

  // Pro Charakter: in welchen aktiven Szenen ist er dran / wartet er auf andere?
  const grouped = myChars
    .map((c) => {
      const charScenes = scenes.filter(
        (s) =>
          s.status === "active" &&
          !s.paused &&
          s.participant_ids.includes(c.id) &&
          follows(c, s.id),
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
      const open = openChatsOf(c).sort(byLastMsgDesc);
      const chatsDran = open.filter((u) => u.last.character_id !== c.id);
      const chatsWarten = open.filter((u) => u.last.character_id === c.id);
      return { char: c, dran, warten, chatsDran, chatsWarten };
    })
    .filter(
      (g) =>
        g.dran.length > 0 || g.warten.length > 0 || g.chatsDran.length > 0 || g.chatsWarten.length > 0,
    );

  // „Du bist dran": eine Liste über alle Charaktere, das Neueste zuerst – jede
  // Szene und jeder Chat-Strang einmal (Chats mit dem Charakter, der antworten soll)
  const dranItems = [
    ...grouped.flatMap((g) =>
      g.dran.map((s) => ({ key: s.id, at: lastPostAt(s.id) ?? s.created_at, scene: s, unit: null, char: g.char })),
    ),
    ...grouped.flatMap((g) =>
      g.chatsDran.map((u) => ({ key: unitKey(u), at: u.last.created_at, scene: null, unit: u, char: g.char })),
    ),
  ]
    .filter((x, i, all) => all.findIndex((y) => y.key === x.key) === i)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const hasDran = dranItems.length > 0;
  const hasWarten = grouped.some((g) => g.warten.length > 0 || g.chatsWarten.length > 0);

  // Numerische Übersicht über distinkte offene Szenen des Spielers
  const myCharIds = new Set(myChars.map((c) => c.id));
  const myOpenScenes = scenes.filter(
    (s) =>
      s.status === "active" &&
      !s.paused &&
      myChars.some((c) => s.participant_ids.includes(c.id) && follows(c, s.id)),
  );
  // Chat-Stränge zählen mit (jeder einmal, auch wenn mehrere eigene Charaktere dabei sind)
  const openChatIds = new Set(grouped.flatMap((g) => [...g.chatsDran, ...g.chatsWarten].map(unitKey)));
  const dranChatIds = new Set(grouped.flatMap((g) => g.chatsDran.map(unitKey)));
  const totalOpen = myOpenScenes.length + openChatIds.size;
  const dranCount =
    myOpenScenes.filter((s) => {
      const t = whoseTurn(s, postsOf(s.id));
      return t != null && myCharIds.has(t);
    }).length + dranChatIds.size;
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

  // Chats mit neuen Nachrichten in den letzten 24h (alle, auch fremde) – stehen
  // zusammen mit den Szenen in einer nach Zeit sortierten Liste
  const recentItems = [
    ...recentScenes.map(({ scene, last }) => ({ key: scene.id, at: last!.created_at, scene, unit: null })),
    ...allUnits
      .filter((u) => withinHours(u.last.created_at, 24))
      .map((u) => ({ key: unitKey(u), at: u.last.created_at, scene: null, unit: u })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

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
        subtitle="Dein Inplaytracker – offene Szenen, in denen du mitspielst."
        width="max-w-6xl"
        bannerImage={currentPlayer.dashboard_header_url ?? undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-16 items-start">
        {/* LINKS: die Szenenübersicht */}
        <div className="flex flex-col gap-6 lg:gap-10">
          {/* Klingelnde Anrufe an eigene Charaktere – führen aufs Handy zum Abheben */}
          {incomingCalls.length > 0 && (
            <section className="flex flex-col gap-2">
              {incomingCalls.map((call) => (
                <Link
                  key={call.id}
                  href="/handy"
                  onClick={() => rememberPhone(call.callee_id)}
                  className="flex items-center gap-3 rounded-lg border border-accent/60 bg-accent-soft px-3.5 py-2.5 hover:bg-accent/20"
                >
                  <span className="phone-ring flex h-6 w-6 shrink-0 items-center justify-center text-accent">
                    <Icon name="phone" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[0.875rem] leading-snug text-text-primary">
                      {character(call.caller_id)?.name ?? "Jemand"} ruft{" "}
                      {character(call.callee_id)?.name.split(" ")[0] ?? "dich"} an
                    </span>
                    <span className="block text-[0.875rem] text-text-tertiary">
                      {formatInplayDateShort(call.inplay_date)}
                      {call.inplay_time ? `, ${call.inplay_time}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.8125rem] font-medium text-accent">Reagieren ›</span>
                </Link>
              ))}
            </section>
          )}
          {/* Mailbox: abgelehnter eigener Anruf (aufsprechen) bzw. neue Nachricht auf
              der Mailbox eines eigenen Charakters – beides führt in die Anrufliste */}
          {mailboxAlerts.length > 0 && (
            <section className="flex flex-col gap-2">
              {mailboxAlerts.map(({ kind, call }) => {
                const caller = character(call.caller_id);
                const callee = character(call.callee_id);
                return (
                  <div
                    key={`${kind}:${call.id}`}
                    className="flex items-center gap-1 rounded-lg border border-accent/60 bg-accent-soft pr-1.5 hover:bg-accent/20"
                  >
                    <Link
                      href="/handy/telefon"
                      onClick={() => {
                        rememberPhone(kind === "leave" ? call.caller_id : call.callee_id);
                        if (kind === "new") return dismissMailboxAlert("new", call.id);
                        try {
                          sessionStorage.setItem(MAILBOX_KEY, call.id);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-accent">
                        <Icon name="phone" size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-[0.875rem] leading-snug text-text-primary">
                          {kind === "leave"
                            ? `${callee?.name ?? "Jemand"} hat den Anruf von ${caller?.name.split(" ")[0] ?? "dir"} abgelehnt`
                            : `${caller?.name ?? "Jemand"} hat ${callee?.name.split(" ")[0] ?? "dir"} auf die Mailbox gesprochen`}
                        </span>
                        <span className="block text-[0.875rem] text-text-tertiary">
                          {formatInplayDateShort(call.inplay_date)}
                          {call.inplay_time ? `, ${call.inplay_time}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.8125rem] font-medium text-accent">
                        {kind === "leave" ? "Auf die Mailbox sprechen ›" : "Anhören ›"}
                      </span>
                    </Link>
                    {kind === "leave" && (
                      <button
                        onClick={() => dismissMailboxAlert("leave", call.id)}
                        title="Nicht aufsprechen – Hinweis ausblenden"
                        aria-label="Hinweis ausblenden"
                        className="shrink-0 rounded p-1.5 text-text-tertiary hover:text-text-primary"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          )}
          {/* Neue Likes, Kommentare, Follower auf Captic – führt in die Aktivitäten
              des Charakters; dort gilt es als gesehen und der Hinweis verschwindet */}
          {capticAlerts.length > 0 && (
            <section className="flex flex-col gap-2">
              {capticAlerts.map((a) => (
                <Link
                  key={a.characterId}
                  href="/handy/captic"
                  onClick={() => {
                    rememberPhone(a.characterId);
                    try {
                      sessionStorage.setItem(CAPTIC_OPEN_KEY, "activity");
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="flex items-center gap-3 rounded-lg border border-accent/60 bg-accent-soft px-3.5 py-2.5 hover:bg-accent/20"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-accent">
                    <Icon name="heart" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[0.875rem] leading-snug text-text-primary">
                      Neue Aktivität auf Captic
                    </span>
                    <span className="block text-[0.875rem] text-text-tertiary">
                      bei {character(a.characterId)?.name ?? "deinem Charakter"}
                    </span>
                  </span>
                  <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold text-black">
                    {a.count}
                  </span>
                </Link>
              ))}
            </section>
          )}
          <section>
            <button
              onClick={() => setShowDran(!dranOpen)}
              aria-expanded={dranOpen}
              className={`flex w-full items-center gap-2 text-left ${dranOpen ? "mb-4" : ""}`}
            >
              <DashHeading note={`${dranCount}/${totalOpen}`}>du bist dran.</DashHeading>
              <span
                className={`text-text-tertiary transition-transform ${
                  dranOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {!dranOpen ? null : !hasDran ? (
              <Empty>Gerade bist du in keiner Szene und keinem Chat am Zug.</Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {dranItems.map((item) =>
                  item.scene ? (
                    <SceneCard key={item.key} scene={item.scene} />
                  ) : (
                    <ChatItem key={item.key} unit={item.unit!} char={item.char} canLeaveOnRead />
                  ),
                )}
              </div>
            )}
          </section>

          <section>
            <button
              onClick={() => setShowWarten(!showWarten)}
              aria-expanded={showWarten}
              className={`flex w-full items-center gap-2 text-left ${showWarten ? "mb-4" : ""}`}
            >
              <DashHeading note={`${wartenCount}/${totalOpen}`}>wartet auf andere.</DashHeading>
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
                    .filter((g) => g.warten.length > 0 || g.chatsWarten.length > 0)
                    .map((g) => (
                      <CharacterGroup
                        key={g.char.id}
                        char={g.char}
                        scenes={g.warten}
                        chats={g.chatsWarten}
                        muted
                      />
                    ))}
                </div>
              ))}
          </section>
        </div>

        {/* RECHTS: Zitat über allem, darunter 24h-Aktivität und Online */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-6">
          <QuoteRotator />

          {/* nur, wenn in den letzten 24h etwas los war */}
          {recentItems.length > 0 && (
          <section>
            <DashHeading note="letzte 24h" className="mb-3">aktive szenen.</DashHeading>
            <div className="flex flex-col gap-2">
              {recentItems.map((item) =>
                item.scene ? (
                  <SceneRow key={item.key} scene={item.scene} />
                ) : (
                  <ChatRow key={item.key} chat={item.unit!.chat} scene={item.unit!.scene} />
                ),
              )}
            </div>
          </section>
          )}

          <section>
            <DashHeading note="jetzt" className="mb-3">online.</DashHeading>
            <PlayerPresenceList
              players={onlineNow}
              now
              idleIds={idleIds.filter((id) => id !== currentPlayer.id)}
              mobileIds={mobileIds}
            />
          </section>

          {onlineRecent.length > 0 && (
            <section>
              <DashHeading note="letzte 24h" className="mb-3">online.</DashHeading>
              <PlayerPresenceList players={onlineRecent} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerPresenceList({
  players,
  now = false,
  idleIds = [],
  mobileIds = [],
}: {
  mobileIds?: string[]; // mit dem Handy online → kleines Handy-Icon am Namen
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
              src={playerImage(p)}
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
            <div className="flex items-center gap-1 text-[0.8125rem] text-text-primary">
              {p.username}
              {now && mobileIds.includes(p.id) && (
                <span title="mit dem Handy online" className="text-text-tertiary">
                  <Icon name="phone" size={12} aria-label="mit dem Handy online" />
                </span>
              )}
            </div>
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
  chats = [],
  muted = false,
  canLeaveOnRead = false,
}: {
  char: Character;
  scenes: Scene[];
  chats?: ChatUnit[];
  muted?: boolean;
  canLeaveOnRead?: boolean; // unbeantwortete Chats lassen sich pausieren
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={characterImage(char)}
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
          {[
            scenes.length > 0 && `${scenes.length} ${scenes.length === 1 ? "Szene" : "Szenen"}`,
            chats.length > 0 && `${chats.length} ${chats.length === 1 ? "Chat" : "Chats"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="flex flex-col gap-2 pl-1">
        {scenes.map((s) => (
          <SceneCard key={s.id} scene={s} muted={muted} />
        ))}
        {chats.map((u) => (
          <ChatItem key={unitKey(u)} unit={u} char={char} muted={muted} canLeaveOnRead={canLeaveOnRead} />
        ))}
      </div>
    </div>
  );
}

// Ein Chat-Strang in den Listen des Dashboards, aus Sicht des eigenen Charakters
function ChatItem({
  unit: u,
  char,
  muted = false,
  canLeaveOnRead = false,
}: {
  unit: ChatUnit;
  char: Character;
  muted?: boolean;
  canLeaveOnRead?: boolean; // unbeantwortete Chats lassen sich pausieren
}) {
  const { leaveOnRead, updateChatScene } = useStore();
  return (
    <ChatRow
      chat={u.chat}
      scene={u.scene}
      forCharacter={char.id}
      muted={muted}
      action={
        canLeaveOnRead ? (
          <button
            onClick={() => {
              leaveOnRead(u.chat.id, char.id, u.last.id);
              if (u.scene) updateChatScene(u.scene.id, { status: "closed" });
            }}
            title={
              u.scene
                ? "Nachricht unbeantwortet lassen – beendet die SMS-Szene"
                : "Nachricht unbeantwortet lassen – der Chat pausiert, bis jemand wieder schreibt"
            }
            className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
          >
            Leave on read
          </button>
        ) : undefined
      }
    />
  );
}

// Abschnitts-Überschrift des Dashboards: wie überall in der Display-Schrift, klein
// geschrieben mit Punkt; dahinter klein der Zähler bzw. der Zeitraum
function DashHeading({
  children,
  note,
  className = "",
}: {
  children: React.ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <h2 className={`${className} flex items-baseline gap-2.5 font-display lowercase text-[1.625rem] leading-none text-accent`}>
      {children}
      {note && (
        <span className="font-sans text-[0.8125rem] normal-case tracking-normal text-text-tertiary [-webkit-text-stroke:0]">
          {note}
        </span>
      )}
    </h2>
  );
}
