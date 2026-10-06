"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  AppSettings,
  Character,
  Chat,
  ChatMessage,
  ChatMessageKind,
  Location,
  PhoneCall,
  Player,
  Plot,
  Post,
  Scene,
  SceneQuote,
} from "./types";
import { supabase, supabaseConfigured } from "./supabase";
import { rememberPhone } from "./phone";
import { playsAs, tierOf } from "./characters";

interface PersistedState {
  players: Player[];
  characters: Character[];
  scenes: Scene[];
  posts: Post[];
  quotes: SceneQuote[];
  locations: Location[];
  plots: Plot[];
  chats: Chat[];
  chatMessages: ChatMessage[];
  calls: PhoneCall[];
}

// `characters` enthält nach außen nur spielbare Charaktere; NPCs (Charaktere mit
// is_npc) stehen getrennt in `npcs`. `character(id)` findet beide.
interface StoreValue extends PersistedState {
  npcs: Character[];
  // Letzter fehlgeschlagener Speichervorgang (für den Hinweis in der AppShell)
  saveError: string | null;
  clearSaveError: () => void;
  // Spieler-IDs, die gerade (live) die App offen haben …
  onlineIds: string[];
  // … und davon jene, deren Tab gerade nicht im Vordergrund ist („anderswo")
  idleIds: string[];
  // … und jene, die gerade mit dem Handy da sind
  mobileIds: string[];
  ready: boolean;
  configured: boolean;
  // Angemeldet, aber ohne (ladbaren) Spieler-Eintrag – Hinweis für den Login-Bildschirm
  loginProblem: string | null;
  // Auth / Login
  currentPlayerId: string | null;
  currentPlayer: Player | null;
  isApproved: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Konto: neues Passwort bzw. neue E-Mail-Adresse für die Anmeldung
  changePassword: (password: string) => Promise<{ error: string | null }>;
  changeEmail: (email: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>; // Alias für signOut (bestehende Aufrufe)
  refresh: () => Promise<void>;
  // selectors
  charactersOf: (playerId: string) => Character[];
  postsOf: (sceneId: string) => Post[];
  character: (id: string) => Character | undefined;
  player: (id: string) => Player | undefined;
  playerByUsername: (username: string) => Player | undefined;
  quotesOf: (sceneId: string) => SceneQuote[];
  locationsOf: (area: string) => Location[];
  location: (id: string) => Location | undefined;
  canEditLocation: (loc: Location) => boolean;
  canEditCharacter: (c: Character) => boolean;
  // Nebenfiguren, die ich bespiele (zugeordnete SCs und zeitweise Statist*innen)
  myNpcs: Character[];
  // Abonniert: Szenen/Chats, in denen ich mit einer Nebenfigur mitgemacht habe –
  // nur die tauchen für diese Figuren im Dashboard auf (privat, pro Spieler*in)
  isSubscribed: (itemId: string) => boolean;
  // mutations
  addPost: (sceneId: string, characterId: string, content: string) => void;
  updatePost: (postId: string, content: string) => void;
  deletePost: (postId: string) => void;
  addQuote: (postId: string, text: string) => void;
  removeQuote: (quoteId: string) => void;
  touchPresence: (playerId: string) => void;
  setLocation: (playerId: string, path: string, label: string) => void;
  // Legt den Ort an (oder findet den bestehenden) und gibt seine ID zurück.
  addLocation: (area: string, name: string, description?: string | null) => string | null;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  // Löscht den Ort (Szenen behalten ihren Ortsnamen als Text)
  deleteLocation: (id: string) => void;
  // App-weite Einstellungen (Akzentfarbe, Header-Bilder); ändern nur Admins
  appSettings: AppSettings;
  updateAppSettings: (patch: Partial<AppSettings>) => void;
  addNpc: (npc: Pick<Character, "name" | "role" | "age">, tier?: "extra" | "supporting") => string;
  addPlot: (name: string, tokens: string[], aus: string[], areas?: string[]) => string;
  updatePlot: (id: string, patch: Partial<Plot>) => void;
  deletePlot: (id: string) => void;
  canEditPlot: (plot: Plot) => boolean;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  addCharacter: (playerId: string, name: string, more?: Partial<Character>) => string;
  // Papierkorb: Charakter verschwindet aus allen Listen, bleibt aber erhalten
  trashCharacter: (id: string) => void;
  restoreCharacter: (id: string) => void;
  trashedCharacters: Character[];
  // Löscht den Charakter ENDGÜLTIG samt seiner Posts, Zitate und Chats
  deleteCharacter: (id: string) => void;
  // Löscht die Szene samt aller Posts und Zitate
  deleteScene: (id: string) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  // Konto löschen (eigenes, oder als Admin das anderer). Siehe supabase/schema-delete-player.sql
  // Ohne eigene Spuren verschwindet die Person ganz, sonst bleibt eine Hülle (`removed` = false).
  deletePlayer: (id: string) => Promise<{ error: string | null; removed: boolean; authKept: boolean }>;
  // Admin: alle Spuren einer gelöschten Hülle samt ihrer Charaktere entfernen
  purgePlayer: (id: string) => Promise<{ error: string | null }>;
  // Gelöschte Konten (Hüllen). `players` enthält nur aktive Spieler*innen; `player(id)`
  // findet auch Hüllen, damit sich ihre Charaktere und Szenen weiter beschriften lassen.
  deletedPlayers: Player[];
  addScene: (scene: Omit<Scene, "id" | "created_at">) => string;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  resetData: () => void;
  // Ungelesene Posts ("neu"-Tag) – pro Gerät/Nutzer in localStorage
  isSceneNew: (sceneId: string) => boolean;
  markSceneSeen: (sceneId: string) => void;
  markAllScenesSeen: () => void;
  markSceneUnread: (sceneId: string) => void;
  // --- Messenger ---
  messagesOf: (chatId: string) => ChatMessage[];
  // Darf ich als dieser Charakter schreiben? (eigene Charaktere und eigene NPCs)
  canWriteAs: (characterId: string) => boolean;
  // Findet den Chat dieser Charaktere oder legt ihn an; gibt die ID zurück.
  openChat: (participantIds: string[]) => string;
  addMessage: (
    chatId: string,
    characterId: string,
    kind: ChatMessageKind,
    content: string,
    opts?: { replyTo?: string | null; time?: string | null },
  ) => void;
  deleteMessage: (messageId: string) => void;
  updateMessage: (messageId: string, patch: Pick<ChatMessage, "content" | "inplay_time">) => void;
  // Löscht den Chat samt aller Nachrichten – für alle
  deleteChat: (chatId: string) => void;
  // „Left on read": die neueste Nachricht bewusst unbeantwortet lassen (oder zurücknehmen)
  leaveOnRead: (chatId: string, characterId: string, messageId: string | null) => void;
  // Chat für alle archivieren / wieder hervorholen (characterId: wer es getan hat)
  archiveChat: (chatId: string, characterId: string, archived: boolean) => void;
  toggleReaction: (messageId: string, emoji: string, characterId: string) => void;
  // Ungelesen: neueste Nachricht stammt von jemand anderem und ist neuer als der letzte Besuch
  isChatNew: (chatId: string) => boolean;
  markChatSeen: (chatId: string) => void;
  // Chat wieder als ungelesen markieren (z.B. um „left on read" aufzuheben)
  markChatUnread: (chatId: string) => void;
  unreadChatCount: number;
  // Gibt es in diesem Chat (auch einem fremden) Nachrichten seit dem letzten Besuch?
  isChatFresh: (chatId: string) => boolean;
  // --- Telefon ---
  addCall: (call: Omit<PhoneCall, "id" | "created_at">) => string;
  updateCall: (id: string, patch: Partial<PhoneCall>) => void;
  // Klingelnde Anrufe an eigene Charaktere
  incomingCalls: PhoneCall[];
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: PersistedState = {
  players: [],
  characters: [],
  scenes: [],
  posts: [],
  quotes: [],
  locations: [],
  plots: [],
  chats: [],
  chatMessages: [],
  calls: [],
};

// Supabase liefert höchstens 1000 Zeilen pro Abfrage – Nachrichten werden schnell
// mehr, daher seitenweise laden. Fehlt die Tabelle noch, bleibt die Liste leer.
async function fetchAll<T>(table: string): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

// Gerade angelegte Chats, deren Zeile noch unterwegs ist – die erste Nachricht
// wartet darauf, sonst käme sie vor ihrem Chat an (Fremdschlüssel).
const pendingChats = new Map<string, Promise<unknown>>();
// Dasselbe für gerade angelegte Szenen (erster Post, Anruf mit Telefonszene)
const pendingScenes = new Map<string, Promise<unknown>>();
function afterScene<T>(sceneId: string | null | undefined, run: () => PromiseLike<T>): PromiseLike<T> {
  const pending = sceneId ? pendingScenes.get(sceneId) : undefined;
  return pending ? pending.then(run, run) : run();
}

let lastMessageAt = 0;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Schreibt asynchron in Supabase (die Änderung ist lokal bereits sichtbar –
// "optimistic update"). Schlägt das Speichern fehl, wird das sichtbar gemeldet:
// sonst sähe die Änderung gespeichert aus und wäre nach dem Neuladen weg.
// Übernimmt eine Live-Änderung (Supabase Realtime) in eine Liste. Felder, die in
// der Nachricht fehlen (sehr große Zeilen werden gekürzt), behalten ihren Wert.
function applyChange<T extends { id: string }>(
  list: T[],
  payload: { eventType: string; new: unknown; old: unknown },
): T[] {
  if (payload.eventType === "DELETE") {
    const id = (payload.old as { id?: string } | null)?.id;
    return id ? list.filter((x) => x.id !== id) : list;
  }
  const row = payload.new as T | null;
  if (!row?.id) return list;
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const copy = list.slice();
  copy[i] = { ...copy[i], ...row };
  return copy;
}

let reportSaveError: ((message: string) => void) | null = null;
// Reine Anwesenheits-Updates melden wir nicht – da geht kein Inhalt verloren.
// Ebenso der Gelesen-Status: fehlt die Tabelle (noch), bleibt er eben im Browser.
const SILENT = new Set(["touchPresence", "setLocation", "markSeen", "markUnread"]);
function persist(label: string, p: unknown) {
  Promise.resolve(p as PromiseLike<{ error: unknown }>).then(
    ({ error }) => {
      if (!error) return;
      console.warn(`[store] ${label}:`, error);
      const detail = (error as { message?: string }).message ?? "unbekannter Fehler";
      if (!SILENT.has(label)) reportSaveError?.(`${label}: ${detail}`);
    },
    (err) => {
      console.warn(`[store] ${label}:`, err);
      if (!SILENT.has(label)) reportSaveError?.(`${label}: keine Verbindung`);
    },
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  // Lese-Status pro Szene (wann zuletzt geöffnet). Eine Szene gilt als "neu",
  // wenn ihr jüngster Post neuer ist als der letzte Besuch (oder nie geöffnet).
  const [reads, setReads] = useState<Record<string, string>>({});

  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    reportSaveError = setSaveError;
    return () => {
      reportSaveError = null;
    };
  }, []);
  const clearSaveError = useCallback(() => setSaveError(null), []);

  const isApproved = Boolean(currentPlayer?.approved);
  const isAdmin = Boolean(currentPlayer?.is_admin);

  // Lädt alle Welt-Daten (nur für freigeschaltete Nutzer*innen sichtbar; RLS).
  const loadWorld = useCallback(async () => {
    const [pl, ch, sc, po, lo, qu, pt, chats, chatMessages, calls, as] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("characters").select("*"),
      supabase.from("scenes").select("*"),
      supabase.from("posts").select("*"),
      supabase.from("locations").select("*"),
      supabase.from("quotes").select("*"),
      supabase.from("plots").select("*"),
      fetchAll<Chat>("chats"),
      fetchAll<ChatMessage>("chat_messages"),
      fetchAll<PhoneCall>("calls"),
      // Tabelle evtl. noch nicht angelegt (schema-app-settings.sql) – dann Standard
      supabase.from("app_settings").select("*"),
    ]);
    const appRow = (as.data as { key: string; value: AppSettings }[] | null)?.find((r) => r.key === "app");
    if (!as.error) setAppSettings(appRow?.value ?? {});
    setState({
      players: (pl.data as Player[]) ?? [],
      characters: (ch.data as Character[]) ?? [],
      scenes: (sc.data as Scene[]) ?? [],
      posts: (po.data as Post[]) ?? [],
      locations: (lo.data as Location[]) ?? [],
      quotes: (qu.data as SceneQuote[]) ?? [],
      plots: (pt.data as Plot[]) ?? [],
      chats,
      chatMessages,
      calls,
    });
  }, []);

  // Reagiert auf eine (geänderte) Auth-Session: eigenen Spieler laden,
  // bei Freischaltung die ganze Welt.
  const [loginProblem, setLoginProblem] = useState<string | null>(null);
  const loadForSession = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setLoginProblem(null);
        setCurrentPlayer(null);
        setState(EMPTY);
        setReady(true);
        return;
      }
      const { data: me, error: meError } = await supabase
        .from("players")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      let player = (me as Player | null) ?? null;
      // Wurde die Anmelde-Adresse geändert, zieht der Spieler-Eintrag nach (er
      // dient u.a. dazu, beim Login den Usernamen zur Adresse aufzulösen).
      const authEmail = session.user.email;
      if (player && authEmail && player.email.toLowerCase() !== authEmail.toLowerCase()) {
        const { error } = await supabase.from("players").update({ email: authEmail }).eq("id", player.id);
        if (!error) player = { ...player, email: authEmail };
      }
      // Ohne Spieler-Eintrag bliebe man kommentarlos auf dem Login-Bildschirm
      setLoginProblem(
        player
          ? null
          : meError
            ? `Angemeldet, aber der Spieler-Eintrag ließ sich nicht laden: ${meError.message}`
            : `Angemeldet als ${session.user.email ?? "?"}, aber in dieser Datenbank gibt es keinen Spieler-Eintrag zu diesem Konto.`,
      );
      setCurrentPlayer(player);
      if (player?.approved) {
        await loadWorld();
      } else {
        setState(EMPTY);
      }
      setReady(true);
    },
    [loadWorld],
  );

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => loadForSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadForSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadForSession]);

  // --- Live-Abgleich ---------------------------------------------------------
  // Neue/aktualisierte Posts, Szenen, Zitate und Spieler kommen per Supabase
  // Realtime herein; wer gerade online ist, läuft über einen Presence-Kanal.
  // Zusätzlich wird beim Zurückkehren in den Tab alles frisch geladen.
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [idleIds, setIdleIds] = useState<string[]>([]);
  const [mobileIds, setMobileIds] = useState<string[]>([]);
  const approvedId = currentPlayer?.approved ? currentPlayer.id : null;
  useEffect(() => {
    if (!approvedId) {
      setOnlineIds([]);
      setIdleIds([]);
      setMobileIds([]);
      return;
    }
    const world = supabase
      .channel("eden-world")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (p) =>
        setState((s) => ({ ...s, posts: applyChange(s.posts, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "scenes" }, (p) =>
        setState((s) => ({ ...s, scenes: applyChange(s.scenes, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, (p) =>
        setState((s) => ({ ...s, quotes: applyChange(s.quotes, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, (p) => {
        setState((s) => ({ ...s, players: applyChange(s.players, p) }));
        // eigene Zeile (z.B. Freischaltung) mitziehen
        const row = p.new as Partial<Player> | null;
        if (row?.id === approvedId) setCurrentPlayer((cp) => (cp ? { ...cp, ...row } : cp));
      })
      .subscribe();
    // Eigener Kanal: fehlen die Messenger-Tabellen (noch), bleibt der Rest live.
    const phone = supabase
      .channel("eden-phone")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, (p) =>
        setState((s) => ({ ...s, chats: applyChange(s.chats, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (p) =>
        setState((s) => ({ ...s, chatMessages: applyChange(s.chatMessages, p) })),
      )
      .subscribe();
    const phoneCalls = supabase
      .channel("eden-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (p) =>
        setState((s) => ({ ...s, calls: applyChange(s.calls, p) })),
      )
      .subscribe();

    const presence = supabase.channel("eden-online", {
      config: { presence: { key: approvedId } },
    });
    // Aktiv = Tab sichtbar, Fenster im Vordergrund und in den letzten 15 Minuten
    // etwas getan (Maus, Tastatur, Scrollen, Tippen); sonst „anderswo". Bei
    // mehreren offenen Tabs zählt eine Person als aktiv, sobald einer aktiv ist.
    // Handy = Mobil-Browser (Tablets zählen nicht). Bei mehreren Geräten gilt das
    // gerade aktive; ist keines aktiv, müssen alle offenen Handys sein.
    const mobile = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
    let subscribed = false;
    const IDLE_AFTER = 15 * 60_000;
    let lastActivity = Date.now();
    let sentActive: boolean | null = null;
    const isActive = () =>
      document.visibilityState === "visible" && document.hasFocus() && Date.now() - lastActivity < IDLE_AFTER;
    const trackNow = () => {
      if (!subscribed) return;
      sentActive = isActive();
      void presence.track({ active: sentActive, mobile });
    };
    // Eingaben merken; gemeldet wird nur, wenn sich der Zustand dadurch ändert
    const onActivity = () => {
      lastActivity = Date.now();
      if (sentActive === false && isActive()) trackNow();
    };
    const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const ev of ACTIVITY) window.addEventListener(ev, onActivity, { passive: true, capture: true });
    const idleTimer = window.setInterval(() => {
      if (sentActive === true && !isActive()) trackNow();
    }, 60_000);
    presence
      .on("presence", { event: "sync" }, () => {
        const st = presence.presenceState() as Record<
          string,
          { active?: boolean; mobile?: boolean }[]
        >;
        const ids = Object.keys(st);
        setOnlineIds(ids);
        setIdleIds(ids.filter((id) => !st[id].some((m) => m.active)));
        setMobileIds(
          ids.filter((id) => {
            const act = st[id].filter((m) => m.active);
            return (act.length ? act : st[id]).every((m) => m.mobile);
          }),
        );
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        subscribed = true;
        trackNow();
      });
    window.addEventListener("focus", trackNow);
    window.addEventListener("blur", trackNow);

    let lastLoad = Date.now();
    const onVisible = () => {
      trackNow();
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad < 30_000) return;
      lastLoad = Date.now();
      void loadWorld();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      for (const ev of ACTIVITY) window.removeEventListener(ev, onActivity, { capture: true });
      window.clearInterval(idleTimer);
      window.removeEventListener("focus", trackNow);
      window.removeEventListener("blur", trackNow);
      void supabase.removeChannel(world);
      void supabase.removeChannel(phone);
      void supabase.removeChannel(phoneCalls);
      void supabase.removeChannel(presence);
    };
  }, [approvedId, loadWorld]);

  // Lese-Status ändern: sofort im Browser (auch als Rückfall, falls die Tabelle
  // read_marks fehlt) und in der Datenbank, damit er Geräte und Deployments übersteht.
  const applyReads = useCallback(
    (pid: string, set: Record<string, string>, remove: string[] = []) => {
      setReads((r) => {
        const next = { ...r, ...set };
        for (const id of remove) delete next[id];
        try {
          localStorage.setItem(`eden:reads:${pid}`, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      const rows = Object.entries(set).map(([item_id, seen_at]) => ({ player_id: pid, item_id, seen_at }));
      if (rows.length) persist("markSeen", supabase.from("read_marks").upsert(rows));
      if (remove.length) {
        persist(
          "markUnread",
          supabase.from("read_marks").delete().eq("player_id", pid).in("item_id", remove),
        );
      }
    },
    [],
  );

  const myPlayerId = currentPlayer?.id;
  const subscribe = useCallback(
    (itemId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [`sub:${itemId}`]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );
  const isSubscribed = useCallback((itemId: string) => !!reads[`sub:${itemId}`], [reads]);

  // Lese-Status laden: erst aus dem Browser (sofort da), dann aus der Datenbank.
  // Je Eintrag gilt der neuere Zeitpunkt; was nur im Browser stand, wird einmalig
  // hochgeladen. (Jede Vercel-Preview hat eine eigene Adresse und damit einen
  // leeren Browser-Speicher – ohne Datenbank wäre dort alles wieder ungelesen.)
  useEffect(() => {
    if (!currentPlayer) {
      setReads({});
      return;
    }
    const pid = currentPlayer.id;
    let local: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(`eden:reads:${pid}`);
      local = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      /* ignore */
    }
    setReads(local);
    let cancelled = false;
    void (async () => {
      const server: Record<string, string> = {};
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("read_marks")
          .select("item_id, seen_at")
          .eq("player_id", pid)
          .range(from, from + 999);
        if (error || !data) return; // Tabelle fehlt (noch): beim Browser-Stand bleiben
        for (const row of data as { item_id: string; seen_at: string }[]) server[row.item_id] = row.seen_at;
        if (data.length < 1000) break;
      }
      if (cancelled) return;
      const newer: Record<string, string> = {};
      for (const [id, at] of Object.entries(local)) {
        if (!server[id] || new Date(at).getTime() > new Date(server[id]).getTime()) newer[id] = at;
      }
      setReads((r) => ({ ...server, ...newer, ...r }));
      const rows = Object.entries(newer).map(([item_id, seen_at]) => ({ player_id: pid, item_id, seen_at }));
      if (rows.length) persist("markSeen", supabase.from("read_marks").upsert(rows));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer?.id]);

  // --- Auth-Methoden --------------------------------------------------------
  // Akzeptiert Username ODER E-Mail. Ist die Eingabe ein Username, wird über
  // eine DB-Funktion die zugehörige E-Mail aufgelöst (Supabase-Login = E-Mail).
  const signIn = useCallback(async (identifier: string, password: string) => {
    const id = identifier.trim();
    let email = id;
    const { data } = await supabase.rpc("email_for_login", { identifier: id });
    if (typeof data === "string" && data) email = data;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentPlayer(null);
    setState(EMPTY);
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);
  // Je nach Einstellung des Projekts gilt die neue Adresse sofort oder erst nach
  // Bestätigung per Mail; der Spieler-Eintrag zieht beim nächsten Laden nach
  // (siehe loadForSession).
  const changeEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    return { error: error?.message ?? null };
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadForSession(data.session);
  }, [loadForSession]);

  // --- Selektoren -----------------------------------------------------------
  // state.characters hält alle Zeilen; nach außen getrennt in spielbare und NPCs.
  // Charaktere im Papierkorb tauchen in keiner Liste auf (`character(id)` findet
  // sie weiterhin, damit alte Posts ihren Namen behalten).
  const playable = useMemo(
    () => state.characters.filter((c) => !c.is_npc && !c.deleted_at),
    [state.characters],
  );
  const npcs = useMemo(
    () => state.characters.filter((c) => c.is_npc && !c.deleted_at),
    [state.characters],
  );
  const trashedCharacters = useMemo(
    () => state.characters.filter((c) => !!c.deleted_at),
    [state.characters],
  );
  const charactersOf = useCallback(
    (playerId: string) => playable.filter((c) => c.player_id === playerId),
    [playable],
  );
  const postsOf = useCallback(
    (sceneId: string) =>
      state.posts
        .filter((p) => p.scene_id === sceneId)
        .sort((a, b) => a.post_number - b.post_number),
    [state.posts],
  );
  const character = useCallback(
    (id: string) => state.characters.find((c) => c.id === id),
    [state.characters],
  );
  const player = useCallback(
    (id: string) => state.players.find((p) => p.id === id),
    [state.players],
  );
  const playerByUsername = useCallback(
    (username: string) =>
      state.players.find(
        (p) => !p.deleted_at && p.username.toLowerCase() === username.toLowerCase(),
      ),
    [state.players],
  );
  const quotesOf = useCallback(
    (sceneId: string) => state.quotes.filter((q) => q.scene_id === sceneId),
    [state.quotes],
  );
  const locationsOf = useCallback(
    (area: string) => state.locations.filter((l) => l.area === area),
    [state.locations],
  );
  const location = useCallback(
    (id: string) => state.locations.find((l) => l.id === id),
    [state.locations],
  );
  // Charaktere/NPCs bearbeiten darf, wer sie spielt – auch Admins nur die eigenen.
  // Fremde Profile pflegen Admins ausschließlich über Einstellungen → Admin.
  const canEditCharacter = useCallback(
    (c: Character) =>
      !!currentPlayer &&
      (tierOf(c) === "extra" || // Statist*innen dürfen alle bearbeiten
        c.player_id === currentPlayer.id ||
        (c.co_owner_ids ?? []).includes(currentPlayer.id)),
    [currentPlayer],
  );
  // Nebenfiguren, die ich gerade bespiele (zugeordnete SCs, zeitweise Statist*innen)
  const myNpcs = useMemo(
    () => npcs.filter((c) => playsAs(c, currentPlayer?.id)),
    [npcs, currentPlayer?.id],
  );
  // Orte bearbeiten dürfen Admins und wer den Ort erstellt hat.
  const canEditLocation = useCallback(
    (loc: Location) =>
      !!currentPlayer &&
      (Boolean(currentPlayer.is_admin) || loc.created_by === currentPlayer.id),
    [currentPlayer],
  );

  // --- Mutationen (optimistisch lokal + Schreiben nach Supabase) ------------
  const addQuote = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setState((s) => {
        const post = s.posts.find((p) => p.id === postId);
        if (!post) return s;
        if (s.quotes.some((q) => q.post_id === postId && q.text === trimmed)) {
          return s;
        }
        const quote: SceneQuote = {
          id: uid("q"),
          scene_id: post.scene_id,
          post_id: postId,
          character_id: post.character_id,
          text: trimmed,
          created_at: new Date().toISOString(),
        };
        persist("addQuote", supabase.from("quotes").insert(quote));
        return { ...s, quotes: [...s.quotes, quote] };
      });
    },
    [],
  );

  const removeQuote = useCallback((quoteId: string) => {
    persist("removeQuote", supabase.from("quotes").delete().eq("id", quoteId));
    setState((s) => ({ ...s, quotes: s.quotes.filter((q) => q.id !== quoteId) }));
  }, []);

  const touchPresence = useCallback((playerId: string) => {
    const now = new Date().toISOString();
    persist(
      "touchPresence",
      supabase.from("players").update({ last_seen: now }).eq("id", playerId),
    );
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === playerId ? { ...p, last_seen: now } : p,
      ),
    }));
  }, []);

  const setLocation = useCallback(
    (playerId: string, path: string, label: string) => {
      const now = new Date().toISOString();
      const current_location = { path, label, at: now };
      persist(
        "setLocation",
        supabase
          .from("players")
          .update({ last_seen: now, current_location })
          .eq("id", playerId),
      );
      setState((s) => ({
        ...s,
        players: s.players.map((p) =>
          p.id === playerId ? { ...p, last_seen: now, current_location } : p,
        ),
      }));
    },
    [],
  );

  const addPost = useCallback(
    (sceneId: string, characterId: string, content: string) => {
      setState((s) => {
        const scenePosts = s.posts.filter((p) => p.scene_id === sceneId);
        const nextNumber =
          scenePosts.reduce((m, p) => Math.max(m, p.post_number), 0) + 1;
        rememberPhone(characterId);
        subscribe(sceneId); // wer mitschreibt, hat die Szene abonniert (zählt bei Nebenfiguren)
        const post: Post = {
          id: uid("post"),
          scene_id: sceneId,
          character_id: characterId,
          content: content.trim(),
          post_number: nextNumber,
          created_at: new Date().toISOString(),
        };
        persist("addPost", afterScene(sceneId, () => supabase.from("posts").insert(post)));
        // Manuelle Zug-Übergabe nach einem Post wieder aufheben
        const sc = s.scenes.find((x) => x.id === sceneId);
        let scenes = s.scenes;
        if (sc?.next_up) {
          persist(
            "clearNextUp",
            supabase.from("scenes").update({ next_up: null }).eq("id", sceneId),
          );
          scenes = s.scenes.map((x) =>
            x.id === sceneId ? { ...x, next_up: null } : x,
          );
        }
        return { ...s, posts: [...s.posts, post], scenes };
      });
    },
    [subscribe],
  );

  const updatePost = useCallback((postId: string, content: string) => {
    persist(
      "updatePost",
      supabase.from("posts").update({ content }).eq("id", postId),
    );
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) => (p.id === postId ? { ...p, content } : p)),
    }));
  }, []);

  const deletePost = useCallback((postId: string) => {
    persist("deletePost", supabase.from("posts").delete().eq("id", postId));
    setState((s) => ({
      ...s,
      posts: s.posts.filter((p) => p.id !== postId),
      quotes: s.quotes.filter((q) => q.post_id !== postId),
    }));
  }, []);

  const addLocation = useCallback(
    (area: string, name: string, description: string | null = null) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = state.locations.find(
        (l) => l.area === area && l.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) {
        if (description && !existing.description && canEditLocation(existing)) {
          persist(
            "addLocation/desc",
            supabase.from("locations").update({ description }).eq("id", existing.id),
          );
          setState((s) => ({
            ...s,
            locations: s.locations.map((l) =>
              l.id === existing.id ? { ...l, description } : l,
            ),
          }));
        }
        return existing.id;
      }
      const base = {
        id: uid("loc"),
        area,
        name: trimmed,
        description: description ?? null,
        created_at: new Date().toISOString(),
      };
      const loc: Location = { ...base, created_by: currentPlayer?.id ?? null };
      // Fallback ohne created_by, falls schema-locations-profile.sql noch nicht
      // eingespielt ist – sonst ließen sich keine Orte/Szenen mehr anlegen.
      persist(
        "addLocation",
        supabase
          .from("locations")
          .insert(loc)
          .then((res) => (res.error ? supabase.from("locations").insert(base) : res)),
      );
      setState((s) => ({ ...s, locations: [...s.locations, loc] }));
      return loc.id;
    },
    [state.locations, currentPlayer?.id, canEditLocation],
  );

  const deletePlayer = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.rpc("delete_player", { p_id: id });
      if (error) return { error: error.message, removed: false, authKept: false };
      const res = (data ?? {}) as { result?: string; auth_kept?: boolean };
      // Hülle oder weg – am einfachsten neu laden
      await loadWorld();
      return { error: null, removed: res.result === "removed", authKept: !!res.auth_kept };
    },
    [loadWorld],
  );

  const purgePlayer = useCallback(
    async (id: string) => {
      const { error } = await supabase.rpc("purge_player", { p_id: id });
      if (error) return { error: error.message };
      await loadWorld();
      return { error: null };
    },
    [loadWorld],
  );

  const deleteLocation = useCallback((id: string) => {
    persist("deleteLocation", supabase.from("locations").delete().eq("id", id));
    setState((s) => ({ ...s, locations: s.locations.filter((l) => l.id !== id) }));
  }, []);

  const updateAppSettings = useCallback((patch: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(
        "updateAppSettings",
        supabase.from("app_settings").upsert({ key: "app", value: next, updated_at: new Date().toISOString() }),
      );
      return next;
    });
  }, []);

  const updateLocation = useCallback((id: string, patch: Partial<Location>) => {
    persist("updateLocation", supabase.from("locations").update(patch).eq("id", id));
    setState((s) => {
      const old = s.locations.find((l) => l.id === id);
      if (!old) return s;
      let scenes = s.scenes;
      // Szenen hängen per Name am Ort – beim Umbenennen mitziehen.
      if (patch.name && patch.name !== old.name) {
        persist(
          "updateLocation/scenes",
          supabase
            .from("scenes")
            .update({ location_name: patch.name })
            .eq("location_area", old.area)
            .eq("location_name", old.name),
        );
        scenes = s.scenes.map((sc) =>
          sc.location_area === old.area && sc.location_name === old.name
            ? { ...sc, location_name: patch.name as string }
            : sc,
        );
      }
      return {
        ...s,
        scenes,
        locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      };
    });
  }, []);

  const updateCharacter = useCallback((id: string, patch: Partial<Character>) => {
    persist(
      "updateCharacter",
      supabase.from("characters").update(patch).eq("id", id),
    );
    setState((s) => ({
      ...s,
      characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const addCharacter = useCallback((playerId: string, name: string, more: Partial<Character> = {}) => {
    const id = uid("c");
    const newChar: Character = {
      id,
      player_id: playerId,
      name: name.trim(),
      faceclaim: null,
      faceclaim_image_url: null,
      tagline: null,
      role: null,
      age: null,
      area: "rivers_edge",
      bio: null,
      pinterest_url: null,
      created_at: new Date().toISOString(),
      height: null,
      figure: null,
      hair: null,
      eyes: null,
      full_name: null,
      sexuality: null,
      status: null,
      origin: null,
      job: null,
      company: null,
      quote: null,
      personality: null,
      relationships: {},
    };
    Object.assign(newChar, more);
    // Rückfall ohne erweitertes Profil, falls schema-character-profile.sql noch fehlt
    const { profile: _profile, ...legacy } = newChar;
    void _profile;
    persist(
      "addCharacter",
      supabase
        .from("characters")
        .insert(newChar)
        .then((res) => (res.error && newChar.profile ? supabase.from("characters").insert(legacy) : res)),
    );
    setState((s) => ({ ...s, characters: [...s.characters, newChar] }));
    return id;
  }, []);

  const trashCharacter = useCallback((id: string) => {
    const deleted_at = new Date().toISOString();
    persist("trashCharacter", supabase.from("characters").update({ deleted_at }).eq("id", id));
    setState((s) => ({
      ...s,
      characters: s.characters.map((c) => (c.id === id ? { ...c, deleted_at } : c)),
    }));
  }, []);
  const restoreCharacter = useCallback((id: string) => {
    persist("restoreCharacter", supabase.from("characters").update({ deleted_at: null }).eq("id", id));
    setState((s) => ({
      ...s,
      characters: s.characters.map((c) => (c.id === id ? { ...c, deleted_at: null } : c)),
    }));
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setState((s) => {
      // Posts, Zitate und Nachrichten hängen per „on delete cascade" am Charakter;
      // aus Szenen und Chats muss er von Hand heraus.
      const scenes = s.scenes.map((sc) => {
        if (!sc.participant_ids.includes(id)) return sc;
        const participant_ids = sc.participant_ids.filter((x) => x !== id);
        const patch = { participant_ids, ...(sc.next_up === id ? { next_up: null } : {}) };
        persist("deleteCharacter/scene", supabase.from("scenes").update(patch).eq("id", sc.id));
        return { ...sc, ...patch };
      });
      const gone = s.chats.filter((c) => c.participant_ids.includes(id)).map((c) => c.id);
      if (gone.length) {
        persist("deleteCharacter/chats", supabase.from("chats").delete().in("id", gone));
      }
      persist("deleteCharacter", supabase.from("characters").delete().eq("id", id));
      return {
        ...s,
        scenes,
        characters: s.characters.filter((c) => c.id !== id),
        posts: s.posts.filter((p) => p.character_id !== id),
        quotes: s.quotes.filter((q) => q.character_id !== id),
        chats: s.chats.filter((c) => !gone.includes(c.id)),
        chatMessages: s.chatMessages.filter(
          (m) => m.character_id !== id && !gone.includes(m.chat_id),
        ),
        calls: s.calls.filter((c) => c.caller_id !== id && c.callee_id !== id),
      };
    });
  }, []);

  // NPC = Charakter mit is_npc; Profil ist optional ausfüllbar.
  const addNpc = useCallback(
    (input: Pick<Character, "name" | "role" | "age">, tier: "extra" | "supporting" = "extra") => {
      const id = uid("npc");
      const newNpc: Character = {
        id,
        player_id: currentPlayer?.id ?? "",
        name: input.name.trim(),
        faceclaim: null,
        faceclaim_image_url: null,
        tagline: null,
        role: input.role,
        age: input.age,
        area: "",
        bio: null,
        pinterest_url: null,
        created_at: new Date().toISOString(),
        height: null,
        figure: null,
        hair: null,
        eyes: null,
        full_name: null,
        sexuality: null,
        status: null,
        origin: null,
        job: null,
        company: null,
        quote: null,
        personality: null,
        relationships: {},
        is_npc: true,
        npc_tier: tier,
      };
      // Rückfall ohne npc_tier, falls schema-npc-tiers.sql noch nicht eingespielt ist
      const { npc_tier: _tier, ...legacy } = newNpc;
      void _tier;
      persist(
        "addNpc",
        supabase
          .from("characters")
          .insert(newNpc)
          .then((res) => (res.error ? supabase.from("characters").insert(legacy) : res)),
      );
      setState((s) => ({ ...s, characters: [...s.characters, newNpc] }));
      return id;
    },
    [currentPlayer?.id],
  );

  // --- Plots (Timeline) ------------------------------------------------------
  const canEditPlot = useCallback(
    (plot: Plot) =>
      !!currentPlayer &&
      (Boolean(currentPlayer.is_admin) || plot.created_by === currentPlayer.id),
    [currentPlayer],
  );
  const addPlot = useCallback(
    (name: string, tokens: string[], aus: string[], areas: string[] = []) => {
      const plot: Plot = {
        id: uid("plot"),
        name: name.trim(),
        tokens,
        aus,
        // nur mitschicken, wenn gesetzt (Spalte kommt aus schema-plots-areas.sql)
        ...(areas.length > 0 ? { areas } : {}),
        include_ids: [],
        exclude_ids: [],
        off_scenes: [],
        created_by: currentPlayer?.id ?? null,
        created_at: new Date().toISOString(),
      };
      persist("addPlot", supabase.from("plots").insert(plot));
      setState((s) => ({ ...s, plots: [...s.plots, plot] }));
      return plot.id;
    },
    [currentPlayer?.id],
  );
  const updatePlot = useCallback((id: string, patch: Partial<Plot>) => {
    persist("updatePlot", supabase.from("plots").update(patch).eq("id", id));
    setState((s) => ({
      ...s,
      plots: s.plots.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);
  const deletePlot = useCallback((id: string) => {
    persist("deletePlot", supabase.from("plots").delete().eq("id", id));
    setState((s) => ({ ...s, plots: s.plots.filter((p) => p.id !== id) }));
  }, []);

  const updatePlayer = useCallback((id: string, patch: Partial<Player>) => {
    persist("updatePlayer", supabase.from("players").update(patch).eq("id", id));
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    // Falls die eigene Zeile betroffen ist (z.B. Freischaltung/Profil), mitziehen.
    setCurrentPlayer((cp) => (cp && cp.id === id ? { ...cp, ...patch } : cp));
  }, []);

  const addScene = useCallback((scene: Omit<Scene, "id" | "created_at">) => {
    const id = uid("s");
    const newScene: Scene = { ...scene, id, created_at: new Date().toISOString() };
    const req = Promise.resolve(supabase.from("scenes").insert(newScene));
    pendingScenes.set(id, req);
    void req.finally(() => pendingScenes.delete(id));
    persist("addScene", req);
    setState((s) => ({ ...s, scenes: [...s.scenes, newScene] }));
    subscribe(id);
    return id;
  }, [subscribe]);

  const deleteScene = useCallback((id: string) => {
    // Posts und Zitate hängen per „on delete cascade" an der Szene
    persist("deleteScene", supabase.from("scenes").delete().eq("id", id));
    setState((s) => ({
      ...s,
      scenes: s.scenes.filter((sc) => sc.id !== id),
      posts: s.posts.filter((p) => p.scene_id !== id),
      quotes: s.quotes.filter((q) => q.scene_id !== id),
      calls: s.calls.map((c) => (c.scene_id === id ? { ...c, scene_id: null } : c)),
    }));
  }, []);

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    persist("updateScene", supabase.from("scenes").update(patch).eq("id", id));
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
    }));
  }, []);

  const resetData = useCallback(() => {
    void refresh();
  }, [refresh]);

  const markSceneSeen = useCallback(
    (sceneId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [sceneId]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );

  const markSceneUnread = useCallback(
    (sceneId: string) => {
      if (myPlayerId) applyReads(myPlayerId, {}, [sceneId]);
    },
    [myPlayerId, applyReads],
  );

  const markAllScenesSeen = useCallback(() => {
    if (!myPlayerId) return;
    const now = new Date().toISOString();
    applyReads(myPlayerId, Object.fromEntries(state.scenes.map((s) => [s.id, now])));
  }, [myPlayerId, applyReads, state.scenes]);

  const isSceneNew = useCallback(
    (sceneId: string) => {
      if (!currentPlayer) return false;
      let newest = 0;
      for (const p of state.posts) {
        if (p.scene_id !== sceneId) continue;
        const t = new Date(p.created_at).getTime();
        if (t > newest) newest = t;
      }
      if (!newest) return false;
      const ref = reads[sceneId] ? new Date(reads[sceneId]).getTime() : 0;
      return newest > ref;
    },
    [state.posts, reads, currentPlayer?.id],
  );

  // --- Messenger -------------------------------------------------------------
  const messagesOf = useCallback(
    (chatId: string) =>
      state.chatMessages
        .filter((m) => m.chat_id === chatId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [state.chatMessages],
  );

  const canWriteAs = useCallback(
    (characterId: string) =>
      !!currentPlayer &&
      state.characters.some(
        (c) => c.id === characterId && !c.deleted_at && playsAs(c, currentPlayer.id),
      ),
    [state.characters, currentPlayer],
  );

  const openChat = useCallback(
    (participantIds: string[]) => {
      const key = [...participantIds].sort().join("|");
      const existing = state.chats.find(
        (c) => [...c.participant_ids].sort().join("|") === key,
      );
      if (existing) return existing.id;
      const chat: Chat = {
        id: uid("chat"),
        participant_ids: participantIds,
        created_by: currentPlayer?.id ?? null,
        created_at: new Date().toISOString(),
      };
      const req = Promise.resolve(supabase.from("chats").insert(chat));
      pendingChats.set(chat.id, req);
      void req.finally(() => pendingChats.delete(chat.id));
      persist("openChat", req);
      setState((s) => ({ ...s, chats: [...s.chats, chat] }));
      return chat.id;
    },
    [state.chats, currentPlayer?.id],
  );

  const markChatSeen = useCallback(
    (chatId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [chatId]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );

  const markChatUnread = useCallback(
    (chatId: string) => {
      if (myPlayerId) applyReads(myPlayerId, {}, [chatId]);
    },
    [myPlayerId, applyReads],
  );

  const addMessage = useCallback(
    (
      chatId: string,
      characterId: string,
      kind: ChatMessageKind,
      content: string,
      opts: { replyTo?: string | null; time?: string | null } = {},
    ) => {
      const text = content.trim();
      if (!text) return;
      const message: ChatMessage = {
        id: uid("msg"),
        chat_id: chatId,
        character_id: characterId,
        kind,
        content: text,
        reply_to: opts.replyTo ?? null,
        reactions: {},
        inplay_time: opts.time ?? null,
        // Mehrere Nachrichten im selben Augenblick (Tagestrenner + erste SMS)
        // behalten ihre Reihenfolge
        created_at: new Date(Math.max(Date.now(), lastMessageAt + 1)).toISOString(),
      };
      lastMessageAt = new Date(message.created_at).getTime();
      const send = () => supabase.from("chat_messages").insert(message);
      const pending = pendingChats.get(chatId);
      persist("addMessage", pending ? pending.then(send, send) : send());
      if (kind !== "date") {
        rememberPhone(characterId);
        subscribe(chatId);
      }
      setState((s) => {
        // Eine neue Nachricht holt den Chat bei allen aus dem Archiv
        const chat = s.chats.find((c) => c.id === chatId);
        let chats = s.chats;
        if (kind !== "date" && chat?.archived_by?.length) {
          persist(
            "unarchiveChat",
            supabase.from("chats").update({ archived_by: [] }).eq("id", chatId),
          );
          chats = s.chats.map((c) => (c.id === chatId ? { ...c, archived_by: [] } : c));
        }
        return { ...s, chats, chatMessages: [...s.chatMessages, message] };
      });
    },
    [subscribe],
  );

  const updateMessage = useCallback(
    (messageId: string, patch: Pick<ChatMessage, "content" | "inplay_time">) => {
      persist("updateMessage", supabase.from("chat_messages").update(patch).eq("id", messageId));
      setState((s) => ({
        ...s,
        chatMessages: s.chatMessages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      }));
    },
    [],
  );

  const deleteChat = useCallback((chatId: string) => {
    // Nachrichten hängen per „on delete cascade" am Chat
    persist("deleteChat", supabase.from("chats").delete().eq("id", chatId));
    setState((s) => ({
      ...s,
      chats: s.chats.filter((c) => c.id !== chatId),
      chatMessages: s.chatMessages.filter((m) => m.chat_id !== chatId),
    }));
  }, []);

  const leaveOnRead = useCallback(
    (chatId: string, characterId: string, messageId: string | null) => {
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId);
        if (!chat) return s;
        const left_on_read = { ...(chat.left_on_read ?? {}) };
        if (messageId) left_on_read[characterId] = messageId;
        else delete left_on_read[characterId];
        persist("leaveOnRead", supabase.from("chats").update({ left_on_read }).eq("id", chatId));
        return {
          ...s,
          chats: s.chats.map((c) => (c.id === chatId ? { ...c, left_on_read } : c)),
        };
      });
    },
    [],
  );

  const archiveChat = useCallback((chatId: string, characterId: string, archived: boolean) => {
    setState((s) => {
      const chat = s.chats.find((c) => c.id === chatId);
      if (!chat) return s;
      const archived_by = archived ? [characterId] : [];
      persist("archiveChat", supabase.from("chats").update({ archived_by }).eq("id", chatId));
      return {
        ...s,
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, archived_by } : c)),
      };
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    persist("deleteMessage", supabase.from("chat_messages").delete().eq("id", messageId));
    setState((s) => ({
      ...s,
      chatMessages: s.chatMessages.filter((m) => m.id !== messageId),
    }));
  }, []);

  // Pro Charakter eine Reaktion je Nachricht (wie in den bekannten Messengern):
  // dasselbe Emoji nochmal nimmt sie zurück, ein anderes ersetzt sie.
  const toggleReaction = useCallback(
    (messageId: string, emoji: string, characterId: string) => {
      setState((s) => {
        const msg = s.chatMessages.find((m) => m.id === messageId);
        if (!msg) return s;
        const had = (msg.reactions?.[emoji] ?? []).includes(characterId);
        const reactions: Record<string, string[]> = {};
        for (const [e, ids] of Object.entries(msg.reactions ?? {})) {
          const rest = ids.filter((id) => id !== characterId);
          if (rest.length) reactions[e] = rest;
        }
        if (!had) reactions[emoji] = [...(reactions[emoji] ?? []), characterId];
        persist(
          "toggleReaction",
          supabase.from("chat_messages").update({ reactions }).eq("id", messageId),
        );
        return {
          ...s,
          chatMessages: s.chatMessages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m,
          ),
        };
      });
    },
    [],
  );

  // Chats mit ungelesener Nachricht: mindestens ein eigener Charakter ist dabei,
  // die neueste Nachricht kommt von einem fremden und ist neuer als der letzte Besuch.
  const unreadChatIds = useMemo(() => {
    const ids = new Set<string>();
    if (!currentPlayer) return ids;
    const played = state.characters.filter((c) => !c.deleted_at && playsAs(c, currentPlayer.id));
    const mine = new Set(played.map((c) => c.id));
    // Chats von Nebenfiguren zählen nur, wenn ich dort selbst mitgeschrieben habe
    const npcIds = new Set(played.filter((c) => c.is_npc).map((c) => c.id));
    const last = new Map<string, ChatMessage>();
    for (const m of state.chatMessages) {
      if (m.kind === "date") continue;
      const cur = last.get(m.chat_id);
      if (!cur || m.created_at > cur.created_at) last.set(m.chat_id, m);
    }
    for (const chat of state.chats) {
      const m = last.get(chat.id);
      if (!m || mine.has(m.character_id)) continue;
      const involved = chat.participant_ids.some(
        (id) => mine.has(id) && (!npcIds.has(id) || !!reads[`sub:${chat.id}`]),
      );
      if (!involved) continue;
      const seen = reads[chat.id] ? new Date(reads[chat.id]).getTime() : 0;
      if (new Date(m.created_at).getTime() > seen) ids.add(chat.id);
    }
    return ids;
  }, [state.chats, state.chatMessages, state.characters, reads, currentPlayer]);
  const isChatNew = useCallback((chatId: string) => unreadChatIds.has(chatId), [unreadChatIds]);

  const isChatFresh = useCallback(
    (chatId: string) => {
      let newest = "";
      for (const m of state.chatMessages) {
        if (m.chat_id === chatId && m.kind !== "date" && m.created_at > newest) newest = m.created_at;
      }
      if (!newest) return false;
      const seen = reads[chatId] ? new Date(reads[chatId]).getTime() : 0;
      return new Date(newest).getTime() > seen;
    },
    [state.chatMessages, reads],
  );

  // --- Telefon ---------------------------------------------------------------
  const addCall = useCallback((call: Omit<PhoneCall, "id" | "created_at">) => {
    const row: PhoneCall = { ...call, id: uid("call"), created_at: new Date().toISOString() };
    rememberPhone(call.caller_id);
    persist("addCall", afterScene(row.scene_id, () => supabase.from("calls").insert(row)));
    setState((s) => ({ ...s, calls: [...s.calls, row] }));
    return row.id;
  }, []);

  const updateCall = useCallback((id: string, patch: Partial<PhoneCall>) => {
    persist(
      "updateCall",
      afterScene(patch.scene_id, () => supabase.from("calls").update(patch).eq("id", id)),
    );
    setState((s) => ({
      ...s,
      calls: s.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const incomingCalls = useMemo(() => {
    if (!currentPlayer) return [];
    const mine = new Set(
      state.characters.filter((c) => !c.deleted_at && playsAs(c, currentPlayer.id)).map((c) => c.id),
    );
    return state.calls.filter((c) => c.status === "ringing" && mine.has(c.callee_id));
  }, [state.calls, state.characters, currentPlayer]);
  const unreadChatCount = unreadChatIds.size;

  const activePlayers = useMemo(() => state.players.filter((p) => !p.deleted_at), [state.players]);
  const deletedPlayers = useMemo(() => state.players.filter((p) => p.deleted_at), [state.players]);
  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      players: activePlayers,
      deletedPlayers,
      characters: playable,
      npcs,
      saveError,
      clearSaveError,
      onlineIds,
      idleIds,
      mobileIds,
      ready,
      configured: supabaseConfigured,
      loginProblem,
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayer,
      isApproved,
      isAdmin,
      signIn,
      signUp,
      signOut,
      logout: signOut,
      changePassword,
      changeEmail,
      refresh,
      appSettings,
      deletePlayer,
      purgePlayer,
      updateAppSettings,
      deleteLocation,
      charactersOf,
      postsOf,
      character,
      player,
      playerByUsername,
      quotesOf,
      locationsOf,
      location,
      canEditLocation,
      canEditCharacter,
      myNpcs,
      isSubscribed,
      addPost,
      updatePost,
      deletePost,
      addQuote,
      removeQuote,
      touchPresence,
      setLocation,
      addLocation,
      updateLocation,
      addNpc,
      addPlot,
      updatePlot,
      deletePlot,
      canEditPlot,
      updateCharacter,
      addCharacter,
      deleteCharacter,
      trashCharacter,
      restoreCharacter,
      trashedCharacters,
      deleteScene,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
      isSceneNew,
      markSceneSeen,
      markAllScenesSeen,
      markSceneUnread,
      messagesOf,
      canWriteAs,
      openChat,
      addMessage,
      deleteMessage,
      updateMessage,
      deleteChat,
      leaveOnRead,
      archiveChat,
      toggleReaction,
      isChatNew,
      markChatSeen,
      markChatUnread,
      unreadChatCount,
      isChatFresh,
      addCall,
      updateCall,
      incomingCalls,
    }),
    [
      state,
      activePlayers,
      deletedPlayers,
      ready,
      currentPlayer,
      isApproved,
      isAdmin,
      signIn,
      signUp,
      signOut,
      changePassword,
      changeEmail,
      refresh,
      appSettings,
      deletePlayer,
      purgePlayer,
      updateAppSettings,
      deleteLocation,
      charactersOf,
      postsOf,
      character,
      player,
      playerByUsername,
      quotesOf,
      locationsOf,
      location,
      playable,
      npcs,
      saveError,
      clearSaveError,
      onlineIds,
      idleIds,
      mobileIds,
      loginProblem,
      canEditLocation,
      canEditCharacter,
      myNpcs,
      isSubscribed,
      addPost,
      updatePost,
      deletePost,
      addQuote,
      removeQuote,
      touchPresence,
      setLocation,
      addLocation,
      updateLocation,
      addNpc,
      addPlot,
      updatePlot,
      deletePlot,
      canEditPlot,
      updateCharacter,
      addCharacter,
      deleteCharacter,
      trashCharacter,
      restoreCharacter,
      trashedCharacters,
      deleteScene,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
      isSceneNew,
      markSceneSeen,
      markAllScenesSeen,
      markSceneUnread,
      messagesOf,
      canWriteAs,
      openChat,
      addMessage,
      deleteMessage,
      updateMessage,
      deleteChat,
      leaveOnRead,
      archiveChat,
      toggleReaction,
      isChatNew,
      markChatSeen,
      markChatUnread,
      unreadChatCount,
      isChatFresh,
      addCall,
      updateCall,
      incomingCalls,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Wer ist in einer Szene als Nächstes "dran"? (der/die andere als der letzte Post)
export function whoseTurn(scene: Scene, posts: Post[]): string | null {
  if (scene.participant_ids.length === 0) return null;
  // Manuelle Zug-Übergabe überschreibt die automatische Reihenfolge
  if (scene.next_up && scene.participant_ids.includes(scene.next_up)) {
    return scene.next_up;
  }
  if (posts.length === 0) return scene.participant_ids[0];
  const last = posts[posts.length - 1].character_id;
  const others = scene.participant_ids.filter((id) => id !== last);
  return others[0] ?? scene.participant_ids[0];
}
