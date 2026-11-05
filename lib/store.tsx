"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  AppSettings,
  Character,
  Chat,
  ChatMessage,
  ChatMessageKind,
  ChatScene,
  CapticComment,
  CapticEvent,
  CapticHighlight,
  CapticPost,
  CapticStory,
  Location,
  PhoneCall,
  Player,
  Plot,
  Post,
  PostDraft,
  Scene,
  SceneQuote,
} from "./types";
import { withinHours } from "./format";
import { setDefaultAvatars } from "./avatar";
import { setAreaTexts } from "./world";
import { openedFromRecoveryLink, supabase, supabaseConfigured } from "./supabase";
import { rememberPhone } from "./phone";
import { mentionedIds, postNotices, replaceHandle, requestId } from "./captic";
import { orderMessages, smsAsScene, type DatedMessage } from "./chats";
import { visiblePlots } from "./plots";
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
  chatScenes: ChatScene[];
  calls: PhoneCall[];
  capticPosts: CapticPost[];
  capticComments: CapticComment[];
  capticStories: CapticStory[];
  capticEvents: CapticEvent[];
  capticHighlights: CapticHighlight[];
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
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Konto: neues Passwort bzw. neue E-Mail-Adresse für die Anmeldung
  changePassword: (password: string) => Promise<{ error: string | null }>;
  changeEmail: (email: string) => Promise<{ error: string | null }>;
  // Passwort vergessen: Link per Mail anfordern (Username oder E-Mail) …
  requestPasswordReset: (identifier: string) => Promise<{ error: string | null }>;
  // … und nach dem Klick auf den Link ein neues Passwort setzen
  passwordRecovery: boolean;
  endPasswordRecovery: () => void;
  logout: () => Promise<void>; // Alias für signOut (bestehende Aufrufe)
  refresh: () => Promise<void>;
  // selectors
  charactersOf: (playerId: string) => Character[];
  postsOf: (sceneId: string) => Post[];
  loadScenePosts: (sceneId: string) => Promise<void>;
  postsEpoch: number;
  searchPosts: (term: string) => Promise<Map<string, string>>;
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
  // Szene von Hand abonnieren / abbestellen (Glocke im Szenenkopf)
  setSubscribed: (itemId: string, on: boolean) => void;
  // mutations
  addPost: (sceneId: string, characterId: string, content: string) => void;
  updatePost: (postId: string, content: string) => void;
  deletePost: (postId: string) => void;
  // Entwürfe für Antworten: nur für die Person sichtbar, die sie geschrieben hat
  drafts: PostDraft[];
  saveDraft: (sceneId: string, characterId: string, content: string, draftId?: string) => void;
  deleteDraft: (draftId: string) => void;
  addQuote: (postId: string, text: string) => void;
  removeQuote: (quoteId: string) => void;
  touchPresence: (playerId: string) => void;
  setLocation: (playerId: string, path: string, label: string) => void;
  // Legt den Ort an (oder findet den bestehenden) und gibt seine ID zurück.
  addLocation: (area: string, name: string, description?: string | null, category?: string | null) => string | null;
  updateLocation: (id: string, patch: Partial<Location>) => void;
  // Löscht den Ort (Szenen behalten ihren Ortsnamen als Text)
  // Mit `moveTo` ziehen die Szenen des Orts vorher an einen anderen Ort um.
  deleteLocation: (id: string, moveTo?: { area: string; name: string }) => void;
  // App-weite Einstellungen (Akzentfarbe, Header-Bilder); ändern nur Admins
  appSettings: AppSettings;
  updateAppSettings: (patch: Partial<AppSettings>) => void;
  addNpc: (npc: Pick<Character, "name" | "role" | "age">, tier?: "extra" | "supporting") => string;
  addPlot: (name: string, tokens: string[], aus: string[], areas?: string[], isPrivate?: boolean) => string;
  updatePlot: (id: string, patch: Partial<Plot>) => void;
  deletePlot: (id: string) => void;
  canEditPlot: (plot: Plot) => boolean; // Ersteller*in, Admins und Betroffene
  ownsPlot: (plot: Plot) => boolean; // löschen, privat stellen: Ersteller*in und Admins
  // AUs umbenennen/löschen (Admins und Beteiligte, siehe supabase/schema-au-manage.sql).
  // Umbenennen auf einen vorhandenen Namen legt die AUs zusammen; Löschen lässt die
  // Szenen als AU ohne Namen stehen.
  canManageAu: (name: string) => boolean;
  renameAu: (oldName: string, newName: string) => Promise<{ error: string | null }>;
  deleteAu: (name: string) => Promise<{ error: string | null }>;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  addCharacter: (playerId: string, name: string, more?: Partial<Character>) => string;
  // Papierkorb: Charakter verschwindet aus allen Listen, bleibt aber erhalten
  trashCharacter: (id: string) => void;
  restoreCharacter: (id: string) => void;
  trashedCharacters: Character[];
  // Löscht den Charakter ENDGÜLTIG samt seiner Posts, Zitate, SMS, Anrufe …
  deleteCharacter: (id: string) => void;
  // Endgültig löschen, Inhalte behalten: Der Charakter verlässt den Papierkorb und
  // bleibt nur als Hülle (durchgestrichener Name an Posts, SMS usw.)
  retireCharacter: (id: string) => void;
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
  // Nachrichten eines Chats in Lesereihenfolge (nach Inplay-Tag, siehe `orderMessages`)
  messagesOf: (chatId: string) => DatedMessage[];
  // SMS-Szenen in der Form von Szenen – für Szenenübersicht, Timeline und Plots
  smsScenes: Scene[];
  addChatScene: (
    chatId: string,
    data: Pick<ChatScene, "title" | "inplay_date" | "summary" | "au" | "au_name">,
  ) => string;
  updateChatScene: (id: string, patch: Partial<ChatScene>) => void;
  // Löst die Szene auf – ihre Nachrichten bleiben lose im Chat
  deleteChatScene: (id: string) => void;
  // Mehrere Nachrichten einer Szene zuordnen (null: lösen) oder auf einen anderen Tag legen
  patchMessages: (ids: string[], patch: Partial<Pick<ChatMessage, "scene_id" | "inplay_date">>) => void;
  // Darf ich als dieser Charakter schreiben? (eigene Charaktere und eigene NPCs)
  canWriteAs: (characterId: string) => boolean;
  // Findet den Chat dieser Charaktere oder legt ihn an; gibt die ID zurück.
  openChat: (participantIds: string[], name?: string | null) => string;
  // Gruppe umbenennen oder jemanden hinzufügen
  updateChat: (id: string, patch: Partial<Pick<Chat, "name" | "participant_ids">>) => void;
  addMessage: (
    chatId: string,
    characterId: string,
    kind: ChatMessageKind,
    content: string,
    opts?: { replyTo?: string | null; time?: string | null; date?: string | null; sceneId?: string | null },
  ) => void;
  deleteMessage: (messageId: string) => void;
  updateMessage: (
    messageId: string,
    patch: Partial<Pick<ChatMessage, "content" | "inplay_time" | "inplay_date" | "character_id">>,
  ) => void;
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
  // Mit `sceneId` nur für diese SMS-Szene (null: nur die losen Nachrichten).
  isChatFresh: (chatId: string, sceneId?: string | null) => boolean;
  // --- Telefon ---
  addCall: (call: Omit<PhoneCall, "id" | "created_at">) => string;
  updateCall: (id: string, patch: Partial<PhoneCall>) => void;
  // Klingelnde Anrufe an eigene Charaktere
  incomingCalls: PhoneCall[];
  // Mailbox-Hinweise fürs Dashboard: „leave" – mein Anruf wurde abgelehnt, ich kann
  // auf die Mailbox sprechen · „new" – jemand hat mir auf die Mailbox gesprochen
  mailboxAlerts: { kind: "leave" | "new"; call: PhoneCall }[];
  dismissMailboxAlert: (kind: "leave" | "new", callId: string) => void;
  // --- Captic ---
  addCapticPost: (post: Omit<CapticPost, "id" | "created_at" | "liked_by">) => string;
  updateCapticPost: (id: string, patch: Partial<CapticPost>) => void;
  // Löscht den Beitrag samt Kommentaren
  deleteCapticPost: (id: string) => void;
  toggleCapticLike: (postId: string, characterId: string) => void;
  toggleCapticCommentLike: (commentId: string, characterId: string) => void;
  addCapticComment: (postId: string, characterId: string, content: string) => void;
  deleteCapticComment: (id: string) => void;
  // Captic-Name geändert: alle Verlinkungen („@alt") in Beiträgen und Kommentaren mitziehen
  renameCapticHandle: (from: string, to: string) => void;
  addCapticStory: (story: Omit<CapticStory, "id" | "created_at">) => string;
  deleteCapticStory: (id: string) => void;
  addCapticHighlight: (highlight: Omit<CapticHighlight, "id" | "created_at">) => string;
  updateCapticHighlight: (id: string, patch: Partial<CapticHighlight>) => void;
  deleteCapticHighlight: (id: string) => void;
  // `characterId` folgt `otherId` (oder nicht mehr). Ist das Profil von `otherId`
  // privat, wird daraus eine Folgeanfrage (bzw. sie wird zurückgezogen).
  toggleCapticFollow: (characterId: string, otherId: string) => void;
  // Folgeanfrage annehmen oder ablehnen
  answerCapticRequest: (request: CapticEvent, accept: boolean) => void;
  // Alle offenen Anfragen an diesen Charakter annehmen (Profil wird öffentlich)
  acceptCapticRequests: (characterId: string) => void;
  // Ungelesene Aktivität (Likes, Kommentare, Follower) für diesen Charakter –
  // ohne das, was ich selbst ausgelöst habe. Ungelesen bleibt sie, bis sie
  // angeklickt wurde (`markCapticEventRead`) oder „Alle gelesen" gedrückt ist.
  capticNews: (characterId: string) => CapticEvent[];
  // Eigene Charaktere mit ungelesener Aktivität (Zähler an Menü und Handy)
  capticUnread: { characterId: string; count: number }[];
  // … und davon jene, deren Aktivitäten man seither noch nicht geöffnet hat
  // (Hinweis im Dashboard – verschwindet beim ersten Öffnen)
  capticAlerts: { characterId: string; count: number }[];
  markCapticEventRead: (event: CapticEvent) => void;
  markCapticAllRead: (characterId: string) => void;
  markCapticNoticed: (characterId: string) => void;
  // Story-Ring: keine Story, noch nicht (ganz) angesehen, angesehen
  capticStoryState: (characterId: string) => "none" | "new" | "seen";
  markCapticStorySeen: (story: CapticStory) => void;
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
  chatScenes: [],
  calls: [],
  capticPosts: [],
  capticComments: [],
  capticStories: [],
  capticEvents: [],
  capticHighlights: [],
};

// Supabase liefert höchstens 1000 Zeilen pro Abfrage – Nachrichten werden schnell
// mehr, daher seitenweise laden. Fehlt die Tabelle noch, bleibt die Liste leer.
// Die erste Seite liefert die Gesamtzahl mit, die übrigen Seiten laden gleichzeitig.
async function fetchAll<T>(table: string, columns = "*"): Promise<T[]> {
  const PAGE = 1000;
  const page = (from: number, count?: "exact") =>
    supabase
      .from(table)
      .select(columns, count ? { count } : undefined)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
  const first = await page(0, "exact");
  if (first.error || !first.data) return [];
  const rows = [...(first.data as unknown as T[])];
  const total = first.count ?? rows.length;
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(total / PAGE) - 1) }, (_, i) => page((i + 1) * PAGE)),
  );
  for (const r of rest) if (!r.error && r.data) rows.push(...(r.data as unknown as T[]));
  return rows;
}

const NO_POSTS: Post[] = [];

// Posts ohne Text: genug für Zähler, „wer ist dran" und „zuletzt aktiv"
const POST_HEAD = "id,scene_id,character_id,post_number,created_at";

// Gerade angelegte Chats, deren Zeile noch unterwegs ist – die erste Nachricht
// wartet darauf, sonst käme sie vor ihrem Chat an (Fremdschlüssel).
const pendingChats = new Map<string, Promise<unknown>>();
// Dasselbe für gerade angelegte Szenen (erster Post, Anruf mit Telefonszene)
const pendingScenes = new Map<string, Promise<unknown>>();
function afterScene<T>(sceneId: string | null | undefined, run: () => PromiseLike<T>): PromiseLike<T> {
  const pending = sceneId ? pendingScenes.get(sceneId) : undefined;
  return pending ? pending.then(run, run) : run();
}

// … und für gerade angelegte SMS-Szenen (die erste Nachricht verweist auf sie)
const pendingChatScenes = new Map<string, Promise<unknown>>();

let lastMessageAt = 0;
const NO_EVENTS: CapticEvent[] = [];

// Angenommene Folgeanfragen: die Anfragenden folgen jetzt (`follows` in ihrem
// Profil), aus der Anfrage wird „folgt dir jetzt", und sie erfahren es („accept").
function grantCapticFollows<S extends { characters: Character[]; capticEvents: CapticEvent[] }>(
  s: S,
  requests: CapticEvent[],
): S {
  if (requests.length === 0) return s;
  const now = new Date().toISOString();
  let characters = s.characters;
  const added: CapticEvent[] = [];
  for (const r of requests) {
    const asker = characters.find((c) => c.id === r.actor_id);
    if (!asker) continue;
    const before = asker.phone?.captic?.follows ?? [];
    if (!before.includes(r.target_id)) {
      const phone = { ...asker.phone, captic: { ...asker.phone?.captic, follows: [...before, r.target_id] } };
      persist("answerCapticRequest", supabase.from("characters").update({ phone }).eq("id", asker.id));
      characters = characters.map((c) => (c.id === asker.id ? { ...c, phone } : c));
    }
    added.push(
      { id: `cape_follow_${r.target_id}_${r.actor_id}`, kind: "follow", actor_id: r.actor_id, target_id: r.target_id, created_at: now },
      { id: `cape_accept_${r.actor_id}_${r.target_id}`, kind: "accept", actor_id: r.target_id, target_id: r.actor_id, created_at: now },
    );
  }
  const gone = new Set([...requests.map((r) => r.id), ...added.map((e) => e.id)]);
  persist("capticEvent", supabase.from("captic_events").delete().in("id", requests.map((r) => r.id)));
  if (added.length) persist("capticEvent", supabase.from("captic_events").upsert(added));
  return { ...s, characters, capticEvents: [...s.capticEvents.filter((e) => !gone.has(e.id)), ...added] };
}

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

// So lange gilt man nach dem letzten Lebenszeichen noch als online
const ONLINE_GRACE = 5 * 60_000;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(openedFromRecoveryLink);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  // Standard-Avatare gelten überall, wo `characterImage`/`playerImage` rechnen
  setDefaultAvatars(appSettings.defaultAvatars);
  // ebenso die von Admins geänderten Bezirks-Texte (`areaName`/`areaInfo`)
  setAreaTexts(appSettings.areas);
  // Lese-Status pro Szene (wann zuletzt geöffnet). Eine Szene gilt als "neu",
  // wenn ihr jüngster Post neuer ist als der letzte Besuch (oder nie geöffnet).
  const [reads, setReads] = useState<Record<string, string>>({});
  // Lokale Änderungen am Lese-Status mit Zeitpunkt – damit ein gerade laufender
  // Abgleich mit der Datenbank sie nicht wieder überschreibt (null = ungelesen).
  const readEdits = useRef(new Map<string, { at: number; value: string | null }>());

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

  // Szenen, deren Post-Texte schon geladen sind; `postsEpoch` zählt hoch, wenn die
  // Welt neu geladen wurde (offene Szenen laden ihre Texte dann frisch nach)
  const loadedScenes = useRef(new Set<string>());
  const [postsEpoch, setPostsEpoch] = useState(0);

  // Lädt alle Welt-Daten (nur für freigeschaltete Nutzer*innen sichtbar; RLS).
  const loadWorld = useCallback(async () => {
    const [pl, ch, sc, po, lo, qu, pt, chats, chatMessages, chatScenes, calls, capticPosts, capticComments, capticStories, capticEvents, capticHighlights, as] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("characters").select("*"),
      // Szenen, Posts und Zitate seitenweise: seit dem Forum-Import sind es mehr als
      // die 1000 Zeilen, die eine einzelne Abfrage liefert
      fetchAll<Scene>("scenes"),
      // Posts zunächst ohne Text (seit dem Forum-Import wären das rund 16 MB) – den
      // Text holt loadScenePosts beim Öffnen der Szene
      fetchAll<Omit<Post, "content">>("posts", POST_HEAD),
      supabase.from("locations").select("*"),
      fetchAll<SceneQuote>("quotes"),
      supabase.from("plots").select("*"),
      fetchAll<Chat>("chats"),
      fetchAll<ChatMessage>("chat_messages"),
      fetchAll<ChatScene>("chat_scenes"),
      fetchAll<PhoneCall>("calls"),
      fetchAll<CapticPost>("captic_posts"),
      fetchAll<CapticComment>("captic_comments"),
      fetchAll<CapticStory>("captic_stories"),
      fetchAll<CapticEvent>("captic_events"),
      fetchAll<CapticHighlight>("captic_highlights"),
      // Tabelle evtl. noch nicht angelegt (schema-app-settings.sql) – dann Standard
      supabase.from("app_settings").select("*"),
    ]);
    const appRow = (as.data as { key: string; value: AppSettings }[] | null)?.find((r) => r.key === "app");
    if (!as.error) setAppSettings(appRow?.value ?? {});
    loadedScenes.current.clear();
    setPostsEpoch((e) => e + 1);
    setState((prev) => {
      // schon geladene Texte bleiben stehen, bis die Szene sie frisch nachlädt
      const full = new Map(prev.posts.filter((p) => !p.partial).map((p) => [p.id, p]));
      return {
      players: (pl.data as Player[]) ?? [],
      characters: (ch.data as Character[]) ?? [],
      scenes: sc,
      posts: po.map((p) => full.get(p.id) ?? { ...p, content: "", partial: true }),
      locations: (lo.data as Location[]) ?? [],
      quotes: qu,
      plots: (pt.data as Plot[]) ?? [],
      chats,
      chatMessages,
      chatScenes,
      calls,
      capticPosts,
      capticComments,
      capticStories,
      capticEvents,
      capticHighlights,
      };
    });
  }, []);

  // Text der Posts einer Szene nachladen (einmal je Szene und Weltstand)
  const loadScenePosts = useCallback(async (sceneId: string) => {
    if (loadedScenes.current.has(sceneId)) return;
    loadedScenes.current.add(sceneId);
    const { data, error } = await supabase.from("posts").select("*").eq("scene_id", sceneId).order("post_number").range(0, 1999);
    if (error || !data) {
      loadedScenes.current.delete(sceneId);
      return;
    }
    const fresh = new Map((data as Post[]).map((p) => [p.id, p]));
    setState((s) => ({
      ...s,
      posts: [
        ...s.posts.filter((p) => !fresh.has(p.id)),
        ...fresh.values(),
      ],
    }));
  }, []);

  // Volltextsuche in Posts (läuft in der Datenbank, weil die Texte nicht alle im
  // Browser liegen): Szenen-ID -> erster passender Post
  const searchPosts = useCallback(async (term: string) => {
    const hits = new Map<string, string>();
    const q = term.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    if (!q) return hits;
    const { data } = await supabase
      .from("posts")
      .select("id,scene_id,post_number")
      .ilike("content", `%${q}%`)
      .order("post_number", { ascending: true })
      .range(0, 4999);
    for (const p of (data as { id: string; scene_id: string }[] | null) ?? []) {
      if (!hits.has(p.scene_id)) hits.set(p.scene_id, p.id);
    }
    return hits;
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
      // Die Welt gleich mitladen statt erst nach dem eigenen Eintrag – ohne
      // Freischaltung liefert die Datenbank ohnehin nichts (RLS)
      const world = loadWorld();
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
      await world.catch(() => {});
      if (!player?.approved) setState(EMPTY);
      setReady(true);
    },
    [loadWorld],
  );

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    // Supabase meldet auch beim Erneuern des Tokens und bei jedem Zurückkehren in
    // den Tab eine „Anmeldung" – neu geladen wird nur, wenn die Person wechselt.
    let sessionUser: string | null | undefined;
    const onSession = (session: Session | null) => {
      const uid = session?.user.id ?? null;
      if (uid === sessionUser) return;
      sessionUser = uid;
      void loadForSession(session);
    };
    supabase.auth.getSession().then(({ data }) => onSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      onSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadForSession]);

  // --- Live-Abgleich ---------------------------------------------------------
  // Neue/aktualisierte Posts, Szenen, Zitate und Spieler kommen per Supabase
  // Realtime herein; wer gerade online ist, läuft über einen Presence-Kanal.
  // Zusätzlich wird beim Zurückkehren in den Tab alles frisch geladen.
  const [presenceIds, setPresenceIds] = useState<string[]>([]);
  const [presenceIdleIds, setPresenceIdleIds] = useState<string[]>([]);
  // Wer die App bewusst geschlossen hat (letzter Tab zu) – zählt sofort als offline,
  // auch wenn last_seen noch frisch ist. Erneutes Auftauchen hebt das auf.
  const [goneIds, setGoneIds] = useState<string[]>([]);
  const [mobileIds, setMobileIds] = useState<string[]>([]);
  const approvedId = currentPlayer?.approved ? currentPlayer.id : null;
  useEffect(() => {
    if (!approvedId) {
      setPresenceIds([]);
      setPresenceIdleIds([]);
      setGoneIds([]);
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
    // Eigener Kanal: fehlt die Tabelle (noch), bleiben die Chats trotzdem live.
    const smsScenesChannel = supabase
      .channel("eden-sms-scenes")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_scenes" }, (p) =>
        setState((s) => ({ ...s, chatScenes: applyChange(s.chatScenes, p) })),
      )
      .subscribe();
    const phoneCalls = supabase
      .channel("eden-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (p) =>
        setState((s) => ({ ...s, calls: applyChange(s.calls, p) })),
      )
      .subscribe();

    // Eigener Kanal: fehlen die Captic-Tabellen (noch), bleibt der Rest live.
    const captic = supabase
      .channel("eden-captic")
      .on("postgres_changes", { event: "*", schema: "public", table: "captic_posts" }, (p) =>
        setState((s) => ({ ...s, capticPosts: applyChange(s.capticPosts, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "captic_comments" }, (p) =>
        setState((s) => ({ ...s, capticComments: applyChange(s.capticComments, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "captic_stories" }, (p) =>
        setState((s) => ({ ...s, capticStories: applyChange(s.capticStories, p) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "captic_events" }, (p) =>
        setState((s) => ({ ...s, capticEvents: applyChange(s.capticEvents, p) })),
      )
      .subscribe();

    // … und noch einer für die später ergänzten Highlights
    const highlights = supabase
      .channel("eden-captic-highlights")
      .on("postgres_changes", { event: "*", schema: "public", table: "captic_highlights" }, (p) =>
        setState((s) => ({ ...s, capticHighlights: applyChange(s.capticHighlights, p) })),
      )
      .subscribe();

    const presence = supabase.channel("eden-online", {
      config: { presence: { key: approvedId }, broadcast: { self: false } },
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
    // Lebenszeichen: solange jemand aktiv ist, alle 2 Minuten last_seen setzen.
    // Reißt die Live-Verbindung ab (Tab-/App-Wechsel am Handy, Ruhezustand),
    // gilt man darüber noch ONLINE_GRACE lang als online (siehe unten).
    let lastBeat = 0;
    const beat = () => {
      if (!isActive() || Date.now() - lastBeat < 2 * 60_000) return;
      lastBeat = Date.now();
      persist(
        "touchPresence",
        supabase.from("players").update({ last_seen: new Date().toISOString() }).eq("id", approvedId),
      );
    };
    lastBeat = Date.now(); // beim Laden setzt die AppShell last_seen schon
    const idleTimer = window.setInterval(() => {
      if (sentActive === true && !isActive()) trackNow();
      beat();
    }, 60_000);
    presence
      .on("presence", { event: "sync" }, () => {
        const st = presence.presenceState() as Record<
          string,
          { active?: boolean; mobile?: boolean }[]
        >;
        const ids = Object.keys(st);
        setPresenceIds(ids);
        setGoneIds((g) => (g.some((id) => ids.includes(id)) ? g.filter((id) => !ids.includes(id)) : g));
        setPresenceIdleIds(ids.filter((id) => !st[id].some((m) => m.active)));
        setMobileIds(
          ids.filter((id) => {
            const act = st[id].filter((m) => m.active);
            return (act.length ? act : st[id]).every((m) => m.mobile);
          }),
        );
      })
      // Tab geschlossen: der andere Tab meldet „tschüss" – ist danach kein Tab
      // dieser Person mehr live, gilt sie sofort als offline (ohne Nachlaufzeit).
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        const id = (payload as { id?: string } | undefined)?.id;
        if (id) setGoneIds((g) => (g.includes(id) ? g : [...g, id]));
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
      beat();
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad < 30_000) return;
      lastLoad = Date.now();
      void loadWorld();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Echtes Schließen/Verlassen (nicht bloß Tab-Wechsel oder App im Hintergrund)
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted || !subscribed) return;
      void presence.send({ type: "broadcast", event: "bye", payload: { id: approvedId } });
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      for (const ev of ACTIVITY) window.removeEventListener(ev, onActivity, { capture: true });
      window.clearInterval(idleTimer);
      window.removeEventListener("focus", trackNow);
      window.removeEventListener("blur", trackNow);
      void supabase.removeChannel(world);
      void supabase.removeChannel(phone);
      void supabase.removeChannel(smsScenesChannel);
      void supabase.removeChannel(phoneCalls);
      void supabase.removeChannel(captic);
      void supabase.removeChannel(highlights);
      void supabase.removeChannel(presence);
    };
  }, [approvedId, loadWorld]);

  // Lese-Status ändern: sofort im Browser (auch als Rückfall, falls die Tabelle
  // read_marks fehlt) und in der Datenbank, damit er Geräte und Deployments übersteht.
  const applyReads = useCallback(
    (pid: string, set: Record<string, string>, remove: string[] = []) => {
      const at = Date.now();
      for (const [id, v] of Object.entries(set)) readEdits.current.set(id, { at, value: v });
      for (const id of remove) readEdits.current.set(id, { at, value: null });
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

  // Entwürfe (Tabelle post_drafts; per RLS sieht jede*r nur die eigenen)
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts([]);
    if (!myPlayerId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from("post_drafts").select("*").eq("player_id", myPlayerId);
      if (!cancelled && !error && data) setDrafts(data as PostDraft[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [myPlayerId]);
  const saveDraft = useCallback(
    (sceneId: string, characterId: string, content: string, draftId?: string) => {
      if (!myPlayerId) return;
      const now = new Date().toISOString();
      const patch = { character_id: characterId, content: content.trim(), updated_at: now };
      if (draftId) {
        persist("saveDraft", supabase.from("post_drafts").update(patch).eq("id", draftId));
        setDrafts((d) => d.map((x) => (x.id === draftId ? { ...x, ...patch } : x)));
        return;
      }
      const draft: PostDraft = { id: uid("draft"), scene_id: sceneId, player_id: myPlayerId, created_at: now, ...patch };
      persist("saveDraft", afterScene(sceneId, () => supabase.from("post_drafts").insert(draft)));
      setDrafts((d) => [...d, draft]);
    },
    [myPlayerId],
  );
  const deleteDraft = useCallback((draftId: string) => {
    persist("deleteDraft", supabase.from("post_drafts").delete().eq("id", draftId));
    setDrafts((d) => d.filter((x) => x.id !== draftId));
  }, []);
  const subscribe = useCallback(
    (itemId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [`sub:${itemId}`]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );
  const isSubscribed = useCallback((itemId: string) => !!reads[`sub:${itemId}`], [reads]);
  const setSubscribed = useCallback(
    (itemId: string, on: boolean) => {
      if (!myPlayerId) return;
      if (on) subscribe(itemId);
      else applyReads(myPlayerId, {}, [`sub:${itemId}`]);
    },
    [myPlayerId, subscribe, applyReads],
  );

  // Lese-Status laden und auf allen Geräten gleich halten: Der Browser-Speicher
  // ist nur ein schneller Zwischenstand, maßgeblich ist die Datenbank. Änderungen
  // von anderen Geräten kommen live herein (Realtime auf read_marks); zusätzlich
  // wird beim Zurückkehren in die App neu abgeglichen. (Jede Vercel-Preview hat
  // eine eigene Adresse und damit einen leeren Browser-Speicher.)
  useEffect(() => {
    if (!currentPlayer) {
      setReads({});
      return;
    }
    const pid = currentPlayer.id;
    const cacheKey = `eden:reads:${pid}`;
    const writeCache = (r: Record<string, string>) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(r));
      } catch {
        /* ignore */
      }
    };
    let local: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(cacheKey);
      local = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      /* ignore */
    }
    setReads(local);
    readEdits.current.clear();
    // Einmalig pro Gerät: was bisher nur im Browser stand, hochladen. Danach nie
    // wieder – sonst würde ein alter Browser-Stand „ungelesen" auf einem anderen
    // Gerät rückgängig machen.
    const migrateKey = `eden:reads-synced:${pid}`;
    let migrate = false;
    try {
      migrate = !localStorage.getItem(migrateKey);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      const started = Date.now();
      try {
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
        if (migrate) {
          migrate = false;
          const newer: Record<string, string> = {};
          for (const [id, at] of Object.entries(local)) {
            if (!server[id] || new Date(at).getTime() > new Date(server[id]).getTime()) newer[id] = at;
          }
          Object.assign(server, newer);
          const rows = Object.entries(newer).map(([item_id, seen_at]) => ({ player_id: pid, item_id, seen_at }));
          if (rows.length) persist("markSeen", supabase.from("read_marks").upsert(rows));
          try {
            localStorage.setItem(migrateKey, "1");
          } catch {
            /* ignore */
          }
        }
        // Was hier während des Ladens geändert wurde, gewinnt (Speichern läuft noch).
        for (const [id, e] of readEdits.current) {
          if (e.at < started - 10_000) {
            readEdits.current.delete(id);
            continue;
          }
          if (e.at < started) continue;
          if (e.value === null) delete server[id];
          else server[id] = e.value;
        }
        setReads(server);
        writeCache(server);
      } finally {
        loading = false;
      }
    };
    void load();

    // Live: eigene Einträge, die ein anderes Gerät setzt oder löscht.
    // (Lösch-Ereignisse lassen sich in Supabase nicht filtern – daher selbst prüfen.)
    const update = (fn: (r: Record<string, string>) => Record<string, string>) =>
      setReads((r) => {
        const next = fn(r);
        writeCache(next);
        return next;
      });
    let joined = false;
    const channel = supabase
      .channel(`eden-reads-${pid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "read_marks", filter: `player_id=eq.${pid}` },
        (p) => {
          const row = p.new as { item_id: string; seen_at: string };
          update((r) => ({ ...r, [row.item_id]: row.seen_at }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "read_marks", filter: `player_id=eq.${pid}` },
        (p) => {
          const row = p.new as { item_id: string; seen_at: string };
          update((r) => ({ ...r, [row.item_id]: row.seen_at }));
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "read_marks" }, (p) => {
        const row = p.old as { player_id?: string; item_id?: string };
        if (row.player_id !== pid || !row.item_id) return;
        const id = row.item_id;
        update((r) => {
          if (!(id in r)) return r;
          const next = { ...r };
          delete next[id];
          return next;
        });
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // Nach einem Verbindungsabbruch (z. B. Handy im Standby) neu abgleichen
        if (joined) void load();
        joined = true;
      });

    let lastLoad = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad < 5_000) return;
      lastLoad = Date.now();
      void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void supabase.removeChannel(channel);
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

  // Registrierung mit E-Mail, Passwort und Username. Der Username reist in den
  // Metadaten mit; der Trigger handle_new_user legt damit den Spieler-Eintrag an
  // (schema-signup-username.sql).
  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const name = username.trim();
    // for_email: Der Name der eigenen, vorab importierten Zeile gilt als frei
    // (schema-import-players.sql); der Trigger behält dort ohnehin den alten Namen.
    const free = await supabase.rpc("username_available", { name, for_email: email.trim() });
    if (!free.error && free.data === false) return { error: "username taken" };
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: name } },
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

  const requestPasswordReset = useCallback(async (identifier: string) => {
    const id = identifier.trim();
    let email = id;
    const { data } = await supabase.rpc("email_for_login", { identifier: id });
    if (typeof data === "string" && data) email = data;
    if (!email.includes("@")) return { error: "unknown user" };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error?.message ?? null };
  }, []);

  const endPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

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
    () => state.characters.filter((c) => !!c.deleted_at && !c.purged_at),
    [state.characters],
  );
  const charactersOf = useCallback(
    (playerId: string) => playable.filter((c) => c.player_id === playerId),
    [playable],
  );
  // Posts je Szene (sortiert) und jüngster Post je Szene – einmal pro Postsstand
  // berechnet, statt bei jedem Aufruf alle Posts zu durchsuchen (seit dem
  // Forum-Import sind das Tausende, und Dashboard & Co. fragen jede Szene ab)
  const postIndex = useMemo(() => {
    const byScene = new Map<string, Post[]>();
    const newest = new Map<string, string>();
    for (const p of state.posts) {
      const list = byScene.get(p.scene_id);
      if (list) list.push(p);
      else byScene.set(p.scene_id, [p]);
      const n = newest.get(p.scene_id);
      if (!n || new Date(p.created_at).getTime() > new Date(n).getTime()) newest.set(p.scene_id, p.created_at);
    }
    for (const list of byScene.values()) list.sort((a, b) => a.post_number - b.post_number);
    return { byScene, newest };
  }, [state.posts]);
  const postsOf = useCallback(
    (sceneId: string) => postIndex.byScene.get(sceneId) ?? NO_POSTS,
    [postIndex],
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
      !c.deleted_at && // im Papierkorb: nur noch über Admin → Papierkorb wiederherstellen
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
        // Der erste veröffentlichte Post macht aus einer Entwurfs-Szene eine echte
        if (sc?.draft) {
          persist(
            "publishScene",
            afterScene(sceneId, () => supabase.from("scenes").update({ draft: false }).eq("id", sceneId)),
          );
          scenes = scenes.map((x) => (x.id === sceneId ? { ...x, draft: false } : x));
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
    (area: string, name: string, description: string | null = null, category: string | null = null) => {
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
      const loc: Location = {
        ...base,
        created_by: currentPlayer?.id ?? null,
        ...(category ? { category } : {}),
      };
      // Fallback ohne created_by/category, falls schema-locations-profile.sql bzw.
      // schema-location-category.sql noch nicht eingespielt ist – sonst ließen sich
      // keine Orte/Szenen mehr anlegen.
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

  const deleteLocation = useCallback((id: string, moveTo?: { area: string; name: string }) => {
    setState((s) => {
      const old = s.locations.find((l) => l.id === id);
      let scenes = s.scenes;
      // Szenen hängen per Gegend + Name am Ort – in der Datenbank umziehen, damit
      // auch die hier nicht geladenen (fremde Entwürfe) mitkommen.
      if (old && moveTo) {
        const target = { location_area: moveTo.area, location_name: moveTo.name };
        persist(
          "deleteLocation/scenes",
          supabase.from("scenes").update(target).eq("location_area", old.area).eq("location_name", old.name),
        );
        scenes = s.scenes.map((sc) =>
          sc.location_area === old.area && sc.location_name === old.name ? { ...sc, ...target } : sc,
        );
      }
      persist("deleteLocation", supabase.from("locations").delete().eq("id", id));
      return { ...s, scenes, locations: s.locations.filter((l) => l.id !== id) };
    });
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
  const retireCharacter = useCallback((id: string) => {
    const now = new Date().toISOString();
    setState((s) => {
      const c = s.characters.find((x) => x.id === id);
      if (!c) return s;
      const patch = { purged_at: now, deleted_at: c.deleted_at ?? now };
      persist("retireCharacter", supabase.from("characters").update(patch).eq("id", id));
      return { ...s, characters: s.characters.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
    });
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
      // aus Szenen und Chats muss er von Hand heraus (beide bleiben bestehen).
      const scenes = s.scenes.map((sc) => {
        if (!sc.participant_ids.includes(id)) return sc;
        const participant_ids = sc.participant_ids.filter((x) => x !== id);
        const patch = { participant_ids, ...(sc.next_up === id ? { next_up: null } : {}) };
        persist("deleteCharacter/scene", supabase.from("scenes").update(patch).eq("id", sc.id));
        return { ...sc, ...patch };
      });
      // Chats bleiben wie Szenen bestehen (mit den Nachrichten der anderen); der
      // Charakter fällt nur heraus.
      for (const c of s.chats.filter((c) => c.participant_ids.includes(id))) {
        persist(
          "deleteCharacter/chat",
          supabase
            .from("chats")
            .update({ participant_ids: c.participant_ids.filter((p) => p !== id) })
            .eq("id", c.id),
        );
      }
      persist("deleteCharacter", supabase.from("characters").delete().eq("id", id));
      return {
        ...s,
        scenes,
        characters: s.characters.filter((c) => c.id !== id),
        posts: s.posts.filter((p) => p.character_id !== id),
        quotes: s.quotes.filter((q) => q.character_id !== id),
        chats: s.chats.map((c) =>
            c.participant_ids.includes(id)
              ? { ...c, participant_ids: c.participant_ids.filter((p) => p !== id) }
              : c,
        ),
        chatMessages: s.chatMessages.filter((m) => m.character_id !== id),
        calls: s.calls.filter((c) => c.caller_id !== id && c.callee_id !== id),
        capticPosts: s.capticPosts.filter((p) => p.character_id !== id),
        capticComments: s.capticComments.filter((c) => c.character_id !== id),
        capticStories: s.capticStories.filter((c) => c.character_id !== id),
        capticEvents: s.capticEvents.filter((e) => e.actor_id !== id && e.target_id !== id),
        capticHighlights: s.capticHighlights.filter((h) => h.character_id !== id),
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
  const addPlot = useCallback(
    (name: string, tokens: string[], aus: string[], areas: string[] = [], isPrivate = false) => {
      const plot: Plot = {
        id: uid("plot"),
        name: name.trim(),
        tokens,
        aus,
        // nur mitschicken, wenn gesetzt (Spalte kommt aus schema-plots-areas.sql)
        ...(areas.length > 0 ? { areas } : {}),
        // ebenso (Spalte aus schema-plots-private.sql)
        ...(isPrivate ? { private: true } : {}),
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

  // --- AUs -------------------------------------------------------------------
  // Darf: Admin, wer einen Charakter in einer (SMS-)Szene des AUs hat oder eine
  // SMS-Szene des AUs angelegt hat. Die Datenbank prüft das noch einmal.
  const canManageAu = useCallback(
    (name: string) => {
      if (!currentPlayer || !name) return false;
      if (currentPlayer.is_admin) return true;
      const mine = new Set(
        state.characters
          .filter((c) => c.player_id === currentPlayer.id || (c.co_owner_ids ?? []).includes(currentPlayer.id))
          .map((c) => c.id),
      );
      const inScene = state.scenes.some(
        (s) => s.au && s.au_name === name && s.participant_ids.some((id) => mine.has(id)),
      );
      if (inScene) return true;
      return state.chatScenes.some((cs) => {
        if (!cs.au || cs.au_name !== name) return false;
        if (cs.created_by === currentPlayer.id) return true;
        const chat = state.chats.find((c) => c.id === cs.chat_id);
        return !!chat && chat.participant_ids.some((id) => mine.has(id));
      });
    },
    [currentPlayer, state.characters, state.scenes, state.chatScenes, state.chats],
  );
  const renameAu = useCallback(
    async (oldName: string, newName: string) => {
      const { error } = await supabase.rpc("rename_au", { old_name: oldName, new_name: newName.trim() });
      if (error) return { error: error.message };
      await loadWorld();
      return { error: null };
    },
    [loadWorld],
  );
  const deleteAu = useCallback(
    async (name: string) => {
      const { error } = await supabase.rpc("delete_au", { p_name: name });
      if (error) return { error: error.message };
      await loadWorld();
      return { error: null };
    },
    [loadWorld],
  );

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

  // Gelesen-Zeitpunkt nie vor dem neuesten Post: Posts tragen die Uhrzeit des
  // schreibenden Geräts, „gelesen" die des lesenden. Geht eine Uhr ein paar
  // Sekunden nach, bliebe eine gerade gelesene Szene sonst (auf allen Geräten) neu.
  const seenStamp = useCallback(
    (sceneId: string) => {
      const now = Date.now();
      const last = postIndex.newest.get(sceneId);
      const lastAt = last ? new Date(last).getTime() : 0;
      return new Date(Math.max(now, lastAt)).toISOString();
    },
    [postIndex],
  );

  const markSceneSeen = useCallback(
    (sceneId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [sceneId]: seenStamp(sceneId) });
    },
    [myPlayerId, applyReads, seenStamp],
  );

  const markSceneUnread = useCallback(
    (sceneId: string) => {
      if (myPlayerId) applyReads(myPlayerId, {}, [sceneId]);
    },
    [myPlayerId, applyReads],
  );

  const markAllScenesSeen = useCallback(() => {
    if (!myPlayerId) return;
    applyReads(myPlayerId, Object.fromEntries(state.scenes.map((s) => [s.id, seenStamp(s.id)])));
  }, [myPlayerId, applyReads, state.scenes, seenStamp]);

  // Jüngster Post je Szene, der nicht von mir stammt (eigene Charaktere und
  // Nebenfiguren, die ich bespiele): Eigene Posts machen eine Szene nicht „neu" –
  // sonst klingelte es beim Posten, v. a. auf dem jeweils anderen Gerät.
  const newestForeign = useMemo(() => {
    const mine = new Set<string>();
    if (currentPlayer) {
      for (const c of playable) if (c.player_id === currentPlayer.id) mine.add(c.id);
      for (const c of myNpcs) mine.add(c.id);
    }
    const out = new Map<string, number>();
    for (const p of state.posts) {
      if (mine.has(p.character_id)) continue;
      const t = new Date(p.created_at).getTime();
      if (t > (out.get(p.scene_id) ?? 0)) out.set(p.scene_id, t);
    }
    return out;
  }, [state.posts, playable, myNpcs, currentPlayer]);

  const isSceneNew = useCallback(
    (sceneId: string) => {
      if (!currentPlayer) return false;
      const last = newestForeign.get(sceneId);
      if (!last) return false;
      const ref = reads[sceneId] ? new Date(reads[sceneId]).getTime() : 0;
      return last > ref;
    },
    [newestForeign, reads, currentPlayer?.id],
  );

  // --- Messenger -------------------------------------------------------------
  const messagesOf = useCallback(
    (chatId: string) => orderMessages(state.chatMessages.filter((m) => m.chat_id === chatId)),
    [state.chatMessages],
  );

  const smsScenes = useMemo(() => {
    const out: Scene[] = [];
    for (const sc of state.chatScenes) {
      const chat = state.chats.find((c) => c.id === sc.chat_id);
      if (chat) out.push(smsAsScene(sc, chat, state.chatMessages));
    }
    return out;
  }, [state.chatScenes, state.chats, state.chatMessages]);

  // Plot bearbeiten: wer ihn sehen darf – Ersteller*in, Admins und alle
  // Betroffenen (private Plots nur Ersteller*in). Löschen und Privat-Stellen
  // bleiben bei Ersteller*in und Admins (`ownsPlot`).
  const canEditPlot = useCallback(
    (plot: Plot) => {
      if (!currentPlayer) return false;
      const charIds = new Set(charactersOf(currentPlayer.id).map((c) => c.id));
      return (
        visiblePlots(
          [plot],
          [...state.scenes, ...smsScenes],
          { playerId: currentPlayer.id, isAdmin: Boolean(currentPlayer.is_admin), charIds },
          character,
        ).length > 0
      );
    },
    [currentPlayer, charactersOf, state.scenes, smsScenes, character],
  );
  const ownsPlot = useCallback(
    (plot: Plot) =>
      !!currentPlayer &&
      (Boolean(currentPlayer.is_admin) || plot.created_by === currentPlayer.id),
    [currentPlayer],
  );

  const addChatScene = useCallback(
    (chatId: string, data: Pick<ChatScene, "title" | "inplay_date" | "summary" | "au" | "au_name">) => {
      const row: ChatScene = {
        ...data,
        id: uid("sms"),
        chat_id: chatId,
        status: "active",
        created_by: currentPlayer?.id ?? null,
        created_at: new Date().toISOString(),
      };
      const insert = () => supabase.from("chat_scenes").insert(row);
      const chatPending = pendingChats.get(chatId);
      const req = Promise.resolve(chatPending ? chatPending.then(insert, insert) : insert());
      pendingChatScenes.set(row.id, req);
      void req.finally(() => pendingChatScenes.delete(row.id));
      persist("addChatScene", req);
      setState((s) => ({ ...s, chatScenes: [...s.chatScenes, row] }));
      return row.id;
    },
    [currentPlayer?.id],
  );

  const updateChatScene = useCallback((id: string, patch: Partial<ChatScene>) => {
    persist("updateChatScene", supabase.from("chat_scenes").update(patch).eq("id", id));
    setState((s) => ({
      ...s,
      chatScenes: s.chatScenes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteChatScene = useCallback((id: string) => {
    // die Nachrichten bleiben: `scene_id` fällt per „on delete set null" weg
    persist("deleteChatScene", supabase.from("chat_scenes").delete().eq("id", id));
    setState((s) => ({
      ...s,
      chatScenes: s.chatScenes.filter((c) => c.id !== id),
      chatMessages: s.chatMessages.map((m) => (m.scene_id === id ? { ...m, scene_id: null } : m)),
    }));
  }, []);

  const patchMessages = useCallback(
    (ids: string[], patch: Partial<Pick<ChatMessage, "scene_id" | "inplay_date">>) => {
      if (ids.length === 0) return;
      const update = () => supabase.from("chat_messages").update(patch).in("id", ids);
      const pending = patch.scene_id ? pendingChatScenes.get(patch.scene_id) : undefined;
      persist("patchMessages", pending ? pending.then(update, update) : update());
      const set = new Set(ids);
      setState((s) => ({
        ...s,
        chatMessages: s.chatMessages.map((m) => (set.has(m.id) ? { ...m, ...patch } : m)),
      }));
    },
    [],
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
    (participantIds: string[], name?: string | null) => {
      const key = [...participantIds].sort().join("|");
      const existing = state.chats.find(
        (c) => [...c.participant_ids].sort().join("|") === key,
      );
      if (existing) return existing.id;
      const chat: Chat = {
        id: uid("chat"),
        participant_ids: participantIds,
        // nur mitschicken, wenn gesetzt – die Spalte gibt es erst mit schema-sms-scenes.sql
        ...(name?.trim() ? { name: name.trim() } : {}),
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

  const updateChat = useCallback(
    (id: string, patch: Partial<Pick<Chat, "name" | "participant_ids">>) => {
      persist("updateChat", supabase.from("chats").update(patch).eq("id", id));
      setState((s) => ({ ...s, chats: s.chats.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    },
    [],
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
      opts: { replyTo?: string | null; time?: string | null; date?: string | null; sceneId?: string | null } = {},
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
        inplay_date: opts.date ?? null,
        scene_id: opts.sceneId ?? null,
        // Mehrere Nachrichten im selben Augenblick (Tagestrenner + erste SMS)
        // behalten ihre Reihenfolge
        created_at: new Date(Math.max(Date.now(), lastMessageAt + 1)).toISOString(),
      };
      lastMessageAt = new Date(message.created_at).getTime();
      const send = () => supabase.from("chat_messages").insert(message);
      // erst der Chat, dann (falls neu) die SMS-Szene, dann die Nachricht
      const waits = [pendingChats.get(chatId), opts.sceneId ? pendingChatScenes.get(opts.sceneId) : undefined]
        .filter((p): p is Promise<unknown> => !!p)
        .map((p) => p.catch(() => {}));
      persist("addMessage", waits.length ? Promise.all(waits).then(send) : send());
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
    (
      messageId: string,
      patch: Partial<Pick<ChatMessage, "content" | "inplay_time" | "inplay_date" | "character_id">>,
    ) => {
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
      chatScenes: s.chatScenes.filter((c) => c.chat_id !== chatId),
    }));
  }, []);

  const leaveOnRead = useCallback(
    (chatId: string, characterId: string, messageId: string | null) => {
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId);
        if (!chat) return s;
        const left_on_read = { ...(chat.left_on_read ?? {}) };
        // je Strang eine Nachricht (mit Komma getrennt); null hebt alle auf
        if (messageId) {
          const ids = (left_on_read[characterId] ?? "").split(",").filter((x) => x && x !== messageId);
          left_on_read[characterId] = [...ids.slice(-9), messageId].join(",");
        } else delete left_on_read[characterId];
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
    (chatId: string, sceneId?: string | null) => {
      let newest = "";
      for (const m of state.chatMessages) {
        if (m.chat_id !== chatId || m.kind === "date") continue;
        if (sceneId !== undefined && (m.scene_id ?? null) !== sceneId) continue;
        if (m.created_at > newest) newest = m.created_at;
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
  // --- Captic ----------------------------------------------------------------
  // Abgelehnte Anrufe der letzten Woche: der/die Anrufende darf auf die Mailbox
  // sprechen, der/die Angerufene erfährt von der Nachricht. Erledigt per Lese-Marke.
  const mailboxAlerts = useMemo(() => {
    if (!currentPlayer) return [];
    const mine = new Set(
      state.characters.filter((c) => !c.deleted_at && playsAs(c, currentPlayer.id)).map((c) => c.id),
    );
    const out: { kind: "leave" | "new"; call: PhoneCall }[] = [];
    for (const call of state.calls) {
      if (call.status !== "declined" || !withinHours(call.created_at, 7 * 24)) continue;
      if (!call.voicemail && mine.has(call.caller_id) && !reads[`vm-out:${call.id}`])
        out.push({ kind: "leave", call });
      if (call.voicemail && mine.has(call.callee_id) && !reads[`vm-in:${call.id}`])
        out.push({ kind: "new", call });
    }
    return out;
  }, [state.calls, state.characters, reads, currentPlayer]);
  const dismissMailboxAlert = useCallback(
    (kind: "leave" | "new", callId: string) => {
      const key = `${kind === "leave" ? "vm-out" : "vm-in"}:${callId}`;
      if (myPlayerId) applyReads(myPlayerId, { [key]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );

  const addCapticPost = useCallback((post: Omit<CapticPost, "id" | "created_at" | "liked_by">) => {
    const row: CapticPost = {
      ...post,
      id: uid("cap"),
      liked_by: [],
      created_at: new Date().toISOString(),
    };
    rememberPhone(post.character_id);
    const saved = Promise.resolve(supabase.from("captic_posts").insert(row));
    persist("addCapticPost", saved);
    setState((s) => {
      // wer markiert oder verlinkt ist, erfährt davon – erst nach dem Beitrag,
      // die Aktivität verweist auf ihn
      const notices = postNotices(row, s.characters);
      if (notices.length) persist("capticEvent", saved.then(() => supabase.from("captic_events").upsert(notices)));
      return { ...s, capticPosts: [...s.capticPosts, row], capticEvents: [...s.capticEvents, ...notices] };
    });
    return row.id;
  }, []);

  const updateCapticPost = useCallback((id: string, patch: Partial<CapticPost>) => {
    persist("updateCapticPost", supabase.from("captic_posts").update(patch).eq("id", id));
    setState((s) => {
      const before = s.capticPosts.find((p) => p.id === id);
      if (!before) return s;
      const post = { ...before, ...patch };
      const capticPosts = s.capticPosts.map((p) => (p.id === id ? post : p));
      if (!("caption" in patch) && !("tags" in patch)) return { ...s, capticPosts };
      // neu Markierte/Verlinkte benachrichtigen, Entfernte nicht länger
      const was = postNotices(before, s.characters);
      const now = postNotices(post, s.characters);
      const added = now.filter((e) => !was.some((w) => w.id === e.id));
      const gone = was.filter((w) => !now.some((e) => e.id === w.id)).map((w) => w.id);
      if (added.length) persist("capticEvent", supabase.from("captic_events").upsert(added));
      if (gone.length) persist("capticEvent", supabase.from("captic_events").delete().in("id", gone));
      return {
        ...s,
        capticPosts,
        capticEvents: [...s.capticEvents.filter((e) => !gone.includes(e.id)), ...added],
      };
    });
  }, []);

  const deleteCapticPost = useCallback((id: string) => {
    persist("deleteCapticPost", supabase.from("captic_posts").delete().eq("id", id));
    setState((s) => ({
      ...s,
      capticPosts: s.capticPosts.filter((p) => p.id !== id),
      capticComments: s.capticComments.filter((c) => c.post_id !== id),
      capticEvents: s.capticEvents.filter((e) => e.post_id !== id),
    }));
  }, []);

  const toggleCapticLike = useCallback((postId: string, characterId: string) => {
    setState((s) => {
      const post = s.capticPosts.find((p) => p.id === postId);
      if (!post) return s;
      const before = post.liked_by ?? [];
      const had = before.includes(characterId);
      const liked_by = had ? before.filter((x) => x !== characterId) : [...before, characterId];
      persist(
        "toggleCapticLike",
        supabase.from("captic_posts").update({ liked_by }).eq("id", postId),
      );
      // Aktivität für die Person, der der Beitrag gehört (nicht fürs eigene Herz)
      const event: CapticEvent = {
        id: `cape_like_${postId}_${characterId}`,
        kind: "like",
        actor_id: characterId,
        target_id: post.character_id,
        post_id: postId,
        created_at: new Date().toISOString(),
      };
      const notify = post.character_id !== characterId;
      if (notify) {
        persist(
          "capticEvent",
          had
            ? supabase.from("captic_events").delete().eq("id", event.id)
            : supabase.from("captic_events").upsert(event),
        );
      }
      const rest = s.capticEvents.filter((e) => e.id !== event.id);
      return {
        ...s,
        capticPosts: s.capticPosts.map((p) => (p.id === postId ? { ...p, liked_by } : p)),
        capticEvents: notify && !had ? [...rest, event] : rest,
      };
    });
  }, []);

  const addCapticComment = useCallback((postId: string, characterId: string, content: string) => {
    const text = content.trim();
    if (!text) return;
    const row: CapticComment = {
      id: uid("capc"),
      post_id: postId,
      character_id: characterId,
      content: text,
      created_at: new Date().toISOString(),
    };
    rememberPhone(characterId);
    const saved = Promise.resolve(supabase.from("captic_comments").insert(row));
    persist("addCapticComment", saved);
    setState((s) => {
      const target = s.capticPosts.find((p) => p.id === postId)?.character_id;
      const event = (kind: "comment" | "mention", id: string, to: string): CapticEvent => ({
        id,
        kind,
        actor_id: characterId,
        target_id: to,
        post_id: postId,
        comment_id: row.id,
        created_at: row.created_at,
      });
      const events: CapticEvent[] = [];
      if (target && target !== characterId) events.push(event("comment", `cape_c_${row.id}`, target));
      // im Kommentar Verlinkte – wem der Beitrag gehört, erfährt es schon als Kommentar
      for (const id of mentionedIds(text, s.characters)) {
        if (id !== characterId && id !== target) events.push(event("mention", `cape_cm_${row.id}_${id}`, id));
      }
      // erst nach dem Kommentar – die Aktivität verweist auf ihn
      if (events.length) persist("capticEvent", saved.then(() => supabase.from("captic_events").upsert(events)));
      return {
        ...s,
        capticComments: [...s.capticComments, row],
        capticEvents: [...s.capticEvents.filter((e) => !events.some((n) => n.id === e.id)), ...events],
      };
    });
  }, []);

  const toggleCapticCommentLike = useCallback((commentId: string, characterId: string) => {
    setState((s) => {
      const comment = s.capticComments.find((c) => c.id === commentId);
      if (!comment) return s;
      const before = comment.liked_by ?? [];
      const had = before.includes(characterId);
      const liked_by = had ? before.filter((x) => x !== characterId) : [...before, characterId];
      persist(
        "toggleCapticCommentLike",
        supabase.from("captic_comments").update({ liked_by }).eq("id", commentId),
      );
      // Aktivität für die Person, die kommentiert hat (nicht fürs eigene Herz)
      const event: CapticEvent = {
        id: `cape_cl_${commentId}_${characterId}`,
        kind: "comment_like",
        actor_id: characterId,
        target_id: comment.character_id,
        post_id: comment.post_id,
        comment_id: commentId,
        created_at: new Date().toISOString(),
      };
      const notify = comment.character_id !== characterId;
      if (notify) {
        persist(
          "capticEvent",
          had
            ? supabase.from("captic_events").delete().eq("id", event.id)
            : supabase.from("captic_events").upsert(event),
        );
      }
      const rest = s.capticEvents.filter((e) => e.id !== event.id);
      return {
        ...s,
        capticComments: s.capticComments.map((c) => (c.id === commentId ? { ...c, liked_by } : c)),
        capticEvents: notify && !had ? [...rest, event] : rest,
      };
    });
  }, []);

  const deleteCapticComment = useCallback((id: string) => {
    persist("deleteCapticComment", supabase.from("captic_comments").delete().eq("id", id));
    setState((s) => ({
      ...s,
      capticComments: s.capticComments.filter((c) => c.id !== id),
      capticEvents: s.capticEvents.filter((e) => e.comment_id !== id),
    }));
  }, []);

  const renameCapticHandle = useCallback((from: string, to: string) => {
    setState((s) => {
      const capticPosts = s.capticPosts.map((p) => {
        const caption = replaceHandle(p.caption, from, to);
        if (caption === p.caption) return p;
        persist("renameCapticHandle", supabase.from("captic_posts").update({ caption }).eq("id", p.id));
        return { ...p, caption };
      });
      const capticComments = s.capticComments.map((c) => {
        const content = replaceHandle(c.content, from, to);
        if (content === c.content) return c;
        persist("renameCapticHandle", supabase.from("captic_comments").update({ content }).eq("id", c.id));
        return { ...c, content };
      });
      return { ...s, capticPosts, capticComments };
    });
  }, []);

  const addCapticStory = useCallback((story: Omit<CapticStory, "id" | "created_at">) => {
    const row: CapticStory = { ...story, id: uid("caps"), created_at: new Date().toISOString() };
    rememberPhone(story.character_id);
    persist("addCapticStory", supabase.from("captic_stories").insert(row));
    setState((s) => ({ ...s, capticStories: [...s.capticStories, row] }));
    return row.id;
  }, []);

  const deleteCapticStory = useCallback((id: string) => {
    persist("deleteCapticStory", supabase.from("captic_stories").delete().eq("id", id));
    setState((s) => ({ ...s, capticStories: s.capticStories.filter((x) => x.id !== id) }));
  }, []);

  const addCapticHighlight = useCallback((highlight: Omit<CapticHighlight, "id" | "created_at">) => {
    const row: CapticHighlight = { ...highlight, id: uid("caph"), created_at: new Date().toISOString() };
    persist("addCapticHighlight", supabase.from("captic_highlights").insert(row));
    setState((s) => ({ ...s, capticHighlights: [...s.capticHighlights, row] }));
    return row.id;
  }, []);

  const updateCapticHighlight = useCallback((id: string, patch: Partial<CapticHighlight>) => {
    persist("updateCapticHighlight", supabase.from("captic_highlights").update(patch).eq("id", id));
    setState((s) => ({
      ...s,
      capticHighlights: s.capticHighlights.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  }, []);

  const deleteCapticHighlight = useCallback((id: string) => {
    persist("deleteCapticHighlight", supabase.from("captic_highlights").delete().eq("id", id));
    setState((s) => ({ ...s, capticHighlights: s.capticHighlights.filter((h) => h.id !== id) }));
  }, []);

  const toggleCapticFollow = useCallback((characterId: string, otherId: string) => {
    setState((s) => {
      const me = s.characters.find((c) => c.id === characterId);
      if (!me || characterId === otherId) return s;
      const before = me.phone?.captic?.follows ?? [];
      const had = before.includes(otherId);
      const request: CapticEvent = {
        id: requestId(otherId, characterId),
        kind: "request",
        actor_id: characterId,
        target_id: otherId,
        created_at: new Date().toISOString(),
      };
      const asked = s.capticEvents.some((e) => e.id === request.id);
      // privates Profil: nur anfragen bzw. die Anfrage zurückziehen
      if (!had && s.characters.find((c) => c.id === otherId)?.phone?.captic?.private) {
        persist(
          "capticEvent",
          asked
            ? supabase.from("captic_events").delete().eq("id", request.id)
            : supabase.from("captic_events").upsert(request),
        );
        const others = s.capticEvents.filter((e) => e.id !== request.id);
        return { ...s, capticEvents: asked ? others : [...others, request] };
      }
      const phone = {
        ...me.phone,
        captic: {
          ...me.phone?.captic,
          follows: had ? before.filter((x) => x !== otherId) : [...before, otherId],
        },
      };
      persist("toggleCapticFollow", supabase.from("characters").update({ phone }).eq("id", characterId));
      const event: CapticEvent = {
        id: `cape_follow_${otherId}_${characterId}`,
        kind: "follow",
        actor_id: characterId,
        target_id: otherId,
        created_at: new Date().toISOString(),
      };
      // entfolgt: auch „hat deine Anfrage angenommen" verschwindet; gefolgt: eine
      // alte Anfrage (Profil war damals privat) ist erledigt
      const stale = had ? `cape_accept_${characterId}_${otherId}` : request.id;
      persist(
        "capticEvent",
        had
          ? supabase.from("captic_events").delete().in("id", [event.id, stale])
          : supabase.from("captic_events").upsert(event),
      );
      if (!had && asked) persist("capticEvent", supabase.from("captic_events").delete().eq("id", stale));
      const rest = s.capticEvents.filter((e) => e.id !== event.id && e.id !== stale);
      return {
        ...s,
        characters: s.characters.map((c) => (c.id === characterId ? { ...c, phone } : c)),
        capticEvents: had ? rest : [...rest, event],
      };
    });
  }, []);

  const answerCapticRequest = useCallback((request: CapticEvent, accept: boolean) => {
    setState((s) => {
      if (accept) return grantCapticFollows(s, [request]);
      persist("capticEvent", supabase.from("captic_events").delete().eq("id", request.id));
      return { ...s, capticEvents: s.capticEvents.filter((e) => e.id !== request.id) };
    });
  }, []);

  const acceptCapticRequests = useCallback((characterId: string) => {
    setState((s) =>
      grantCapticFollows(
        s,
        s.capticEvents.filter((e) => e.kind === "request" && e.target_id === characterId),
      ),
    );
  }, []);

  // Neue Aktivität je eigenem Charakter. Was ich selbst (mit einem anderen meiner
  // Charaktere) ausgelöst habe, zählt nicht.
  const capticNewsByChar = useMemo(() => {
    const out = new Map<string, CapticEvent[]>();
    if (!currentPlayer) return out;
    const mine = new Set(
      state.characters.filter((c) => !c.deleted_at && playsAs(c, currentPlayer.id)).map((c) => c.id),
    );
    const after = (iso: string, mark: string | undefined) =>
      !mark || new Date(iso).getTime() > new Date(mark).getTime();
    for (const e of state.capticEvents) {
      // Aktionen der eigenen Charaktere untereinander zählen nie
      if (!mine.has(e.target_id) || mine.has(e.actor_id)) continue;
      // gelesen: einzeln angeklickt oder vor dem letzten „Alle gelesen"
      if (!after(e.created_at, reads[`captic:${e.target_id}`]) || !after(e.created_at, reads[e.id])) continue;
      out.set(e.target_id, [...(out.get(e.target_id) ?? []), e]);
    }
    return out;
  }, [state.capticEvents, state.characters, reads, currentPlayer]);
  const capticNews = useCallback(
    (characterId: string) => capticNewsByChar.get(characterId) ?? NO_EVENTS,
    [capticNewsByChar],
  );
  // Nur Charaktere, bei denen Captic auch auf dem Handy liegt
  const capticUnread = useMemo(
    () =>
      [...capticNewsByChar.entries()]
        .filter(([id]) => {
          const p = state.characters.find((c) => c.id === id)?.phone;
          return !p?.disabled && p?.model !== "burner" && !!p?.captic?.enabled;
        })
        .map(([characterId, events]) => ({ characterId, count: events.length })),
    [capticNewsByChar, state.characters],
  );
  const capticAlerts = useMemo(
    () =>
      capticUnread.flatMap(({ characterId }) => {
        const opened = reads[`captic-open:${characterId}`];
        const count = (capticNewsByChar.get(characterId) ?? []).filter(
          (e) => !opened || new Date(e.created_at).getTime() > new Date(opened).getTime(),
        ).length;
        return count ? [{ characterId, count }] : [];
      }),
    [capticUnread, capticNewsByChar, reads],
  );
  const markCapticEventRead = useCallback(
    (event: CapticEvent) => {
      if (myPlayerId) applyReads(myPlayerId, { [event.id]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );
  const markCapticAllRead = useCallback(
    (characterId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [`captic:${characterId}`]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );
  const markCapticNoticed = useCallback(
    (characterId: string) => {
      if (myPlayerId) applyReads(myPlayerId, { [`captic-open:${characterId}`]: new Date().toISOString() });
    },
    [myPlayerId, applyReads],
  );

  // Story-Ring: angesehen ist eine Story-Reihe, sobald ihr neuestes Bild gezeigt wurde
  const newestStory = useMemo(() => {
    const m = new Map<string, string>();
    for (const st of state.capticStories) {
      if ((m.get(st.character_id) ?? "") < st.created_at) m.set(st.character_id, st.created_at);
    }
    return m;
  }, [state.capticStories]);
  const capticStoryState = useCallback(
    (characterId: string) => {
      const newest = newestStory.get(characterId);
      if (!newest) return "none" as const;
      const seen = reads[`caps:${characterId}`];
      return seen && new Date(seen).getTime() >= new Date(newest).getTime() ? ("seen" as const) : ("new" as const);
    },
    [newestStory, reads],
  );
  const markCapticStorySeen = useCallback(
    (story: CapticStory) => {
      const key = `caps:${story.character_id}`;
      const seen = reads[key];
      if (!myPlayerId || (seen && new Date(seen).getTime() >= new Date(story.created_at).getTime())) return;
      applyReads(myPlayerId, { [key]: story.created_at });
    },
    [myPlayerId, applyReads, reads],
  );

  const unreadChatCount = unreadChatIds.size;

  const activePlayers = useMemo(() => state.players.filter((p) => !p.deleted_at), [state.players]);
  const deletedPlayers = useMemo(() => state.players.filter((p) => p.deleted_at), [state.players]);
  // Entwurfs-Szenen sieht nur, wer darin einen eigenen Entwurf liegen hat
  const visibleScenes = useMemo(
    () => state.scenes.filter((s) => !s.draft || drafts.some((d) => d.scene_id === s.id)),
    [state.scenes, drafts],
  );
  // Online = live im Presence-Kanal ODER in den letzten ONLINE_GRACE Minuten
  // aktiv gewesen (last_seen). So fliegt niemand sofort raus, nur weil kurz der
  // Tab gewechselt wurde oder die Verbindung kurz weg war.
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setPresenceNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const { onlineIds, idleIds } = useMemo(() => {
    if (!approvedId) return { onlineIds: [] as string[], idleIds: [] as string[] };
    const cutoff = presenceNow - ONLINE_GRACE;
    const recent = activePlayers
      .filter((p) => p.approved && !goneIds.includes(p.id) && new Date(p.last_seen).getTime() > cutoff)
      .map((p) => p.id);
    const ids = [...new Set([...presenceIds, ...recent])];
    return { onlineIds: ids, idleIds: presenceIdleIds };
  }, [approvedId, activePlayers, presenceIds, presenceIdleIds, goneIds, presenceNow]);
  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      scenes: visibleScenes,
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
      requestPasswordReset,
      passwordRecovery,
      endPasswordRecovery,
      refresh,
      appSettings,
      deletePlayer,
      purgePlayer,
      updateAppSettings,
      deleteLocation,
      charactersOf,
      postsOf,
      loadScenePosts,
      postsEpoch,
      searchPosts,
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
      setSubscribed,
      addPost,
      updatePost,
      deletePost,
      drafts,
      saveDraft,
      deleteDraft,
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
      ownsPlot,
      canManageAu,
      renameAu,
      deleteAu,
      updateCharacter,
      addCharacter,
      deleteCharacter,
      retireCharacter,
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
      smsScenes,
      addChatScene,
      updateChatScene,
      deleteChatScene,
      patchMessages,
      canWriteAs,
      openChat,
      updateChat,
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
      mailboxAlerts,
      dismissMailboxAlert,
      addCapticPost,
      updateCapticPost,
      deleteCapticPost,
      toggleCapticLike,
      toggleCapticCommentLike,
      addCapticComment,
      deleteCapticComment,
      renameCapticHandle,
      addCapticStory,
      deleteCapticStory,
      addCapticHighlight,
      updateCapticHighlight,
      deleteCapticHighlight,
      toggleCapticFollow,
      answerCapticRequest,
      acceptCapticRequests,
      capticNews,
      capticUnread,
      capticAlerts,
      markCapticEventRead,
      markCapticAllRead,
      markCapticNoticed,
      capticStoryState,
      markCapticStorySeen,
    }),
    [
      state,
      visibleScenes,
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
      requestPasswordReset,
      passwordRecovery,
      endPasswordRecovery,
      refresh,
      appSettings,
      deletePlayer,
      purgePlayer,
      updateAppSettings,
      deleteLocation,
      charactersOf,
      postsOf,
      loadScenePosts,
      postsEpoch,
      searchPosts,
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
      setSubscribed,
      addPost,
      updatePost,
      deletePost,
      drafts,
      saveDraft,
      deleteDraft,
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
      ownsPlot,
      canManageAu,
      renameAu,
      deleteAu,
      updateCharacter,
      addCharacter,
      deleteCharacter,
      retireCharacter,
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
      smsScenes,
      addChatScene,
      updateChatScene,
      deleteChatScene,
      patchMessages,
      canWriteAs,
      openChat,
      updateChat,
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
      mailboxAlerts,
      dismissMailboxAlert,
      addCapticPost,
      updateCapticPost,
      deleteCapticPost,
      toggleCapticLike,
      toggleCapticCommentLike,
      addCapticComment,
      deleteCapticComment,
      renameCapticHandle,
      addCapticStory,
      deleteCapticStory,
      addCapticHighlight,
      updateCapticHighlight,
      deleteCapticHighlight,
      toggleCapticFollow,
      answerCapticRequest,
      acceptCapticRequests,
      capticNews,
      capticUnread,
      capticAlerts,
      markCapticEventRead,
      markCapticAllRead,
      markCapticNoticed,
      capticStoryState,
      markCapticStorySeen,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Wer ist in einer Szene als Nächstes "dran"? Reihum nach der Teilnehmer*innen-
// Liste: dran ist, wer nach dem letzten Post kommt. Postet jemand außer der
// Reihe, geht es von dort aus weiter (nicht bei der übersprungenen Person).
export function whoseTurn(scene: Scene, posts: Post[]): string | null {
  const ids = scene.participant_ids;
  if (ids.length === 0) return null;
  // Manuelle Zug-Übergabe überschreibt die automatische Reihenfolge
  if (scene.next_up && ids.includes(scene.next_up)) {
    return scene.next_up;
  }
  // Letzter Post von jemandem, der noch in der Szene ist
  for (let i = posts.length - 1; i >= 0; i--) {
    const idx = ids.indexOf(posts[i].character_id);
    if (idx !== -1) return ids[(idx + 1) % ids.length];
  }
  return ids[0];
}
