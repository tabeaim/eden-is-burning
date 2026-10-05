"use client";

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
import { rememberPhone } from "@/lib/phone";
import { formatInplayDateShort } from "@/lib/format";
import { isArchived, isLeftOnRead, lastMessages } from "@/lib/chats";
import type { Character, Chat, Player, Scene } from "@/lib/types";

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
    incomingCalls,
    character,
    myNpcs,
    isSubscribed,
  } = store;
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

  // Main Characters und bespielte Nebenfiguren. Für Nebenfiguren (SC, Statist*in)
  // zählen nur „abonnierte" Szenen und Chats – also die, in denen ich selbst mit
  // ihnen gestartet oder geantwortet habe (mehrere können dieselbe Figur bespielen).
  const myChars = [...charactersOf(currentPlayer.id), ...myNpcs];
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

  // Chats (Handy): unbeantwortet = die neueste Nachricht kommt von jemand anderem.
  // Archivierte und „leave on read" markierte Chats sind pausiert.
  const lastMsg = lastMessages(chatMessages);
  const openChatsOf = (c: Character) =>
    chats.filter((ch) => {
      const last = lastMsg.get(ch.id);
      const charId = c.id;
      return (
        !!last &&
        ch.participant_ids.includes(charId) &&
        follows(c, ch.id) &&
        !isArchived(ch) &&
        !isLeftOnRead(ch, charId, last)
      );
    });
  const byLastMsgDesc = (a: Chat, b: Chat) =>
    (lastMsg.get(b.id)?.created_at ?? "").localeCompare(lastMsg.get(a.id)?.created_at ?? "");

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
      const chatsDran = open.filter((ch) => lastMsg.get(ch.id)!.character_id !== c.id);
      const chatsWarten = open.filter((ch) => lastMsg.get(ch.id)!.character_id === c.id);
      return { char: c, dran, warten, chatsDran, chatsWarten };
    })
    .filter(
      (g) =>
        g.dran.length > 0 || g.warten.length > 0 || g.chatsDran.length > 0 || g.chatsWarten.length > 0,
    );

  const hasDran = grouped.some((g) => g.dran.length > 0 || g.chatsDran.length > 0);
  const hasWarten = grouped.some((g) => g.warten.length > 0 || g.chatsWarten.length > 0);

  // Numerische Übersicht über distinkte offene Szenen des Spielers
  const myCharIds = new Set(myChars.map((c) => c.id));
  const myOpenScenes = scenes.filter(
    (s) =>
      s.status === "active" &&
      !s.paused &&
      myChars.some((c) => s.participant_ids.includes(c.id) && follows(c, s.id)),
  );
  // Chats zählen mit (jeder Chat einmal, auch wenn mehrere eigene Charaktere dabei sind)
  const openChatIds = new Set(grouped.flatMap((g) => [...g.chatsDran, ...g.chatsWarten].map((c) => c.id)));
  const dranChatIds = new Set(grouped.flatMap((g) => g.chatsDran.map((c) => c.id)));
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
    ...recentScenes.map(({ scene, last }) => ({ key: scene.id, at: last!.created_at, scene, chat: null })),
    ...chats
      .filter((ch) => {
        const last = lastMsg.get(ch.id);
        return last && withinHours(last.created_at, 24);
      })
      .map((ch) => ({ key: ch.id, at: lastMsg.get(ch.id)!.created_at, scene: null, chat: ch })),
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

      {/* Zitat über die volle Breite, über allem anderen */}
      <div className="mb-8">
        <QuoteRotator />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-16 items-start">
        {/* LINKS: Szenenübersicht, nach Charakteren gruppiert */}
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
              <Empty>Gerade bist du in keiner Szene und keinem Chat am Zug.</Empty>
            ) : (
              <div className="flex flex-col gap-6">
                {grouped
                  .filter((g) => g.dran.length > 0 || g.chatsDran.length > 0)
                  .map((g) => (
                    <CharacterGroup
                      key={g.char.id}
                      char={g.char}
                      scenes={g.dran}
                      chats={g.chatsDran}
                      canLeaveOnRead
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

        {/* RECHTS: Zitate, 24h-Aktivität, Online */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-6">

          <section>
            <h2 className="section-bar text-[0.875rem] text-text-secondary mb-3">
              Aktive Szenen · letzte 24h
            </h2>
            {recentItems.length === 0 ? (
              <Empty>Keine.</Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {recentItems.map((item) =>
                  item.scene ? (
                    <SceneRow key={item.key} scene={item.scene} />
                  ) : (
                    <ChatRow key={item.key} chat={item.chat!} />
                  ),
                )}
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
              mobileIds={mobileIds}
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
  chats?: Chat[];
  muted?: boolean;
  canLeaveOnRead?: boolean; // unbeantwortete Chats lassen sich pausieren
}) {
  const { chatMessages, leaveOnRead } = useStore();
  const lastMsg = lastMessages(chatMessages);
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
        {chats.map((ch) => (
          <ChatRow
            key={ch.id}
            chat={ch}
            forCharacter={char.id}
            muted={muted}
            action={
              canLeaveOnRead ? (
                <button
                  onClick={() => leaveOnRead(ch.id, char.id, lastMsg.get(ch.id)?.id ?? null)}
                  title="Nachricht unbeantwortet lassen – der Chat pausiert, bis jemand wieder schreibt"
                  className="rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
                >
                  Leave on read
                </button>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
