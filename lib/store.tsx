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
  Character,
  Location,
  Player,
  Post,
  Scene,
  SceneQuote,
} from "./types";
import { supabase, supabaseConfigured } from "./supabase";

interface PersistedState {
  players: Player[];
  characters: Character[];
  scenes: Scene[];
  posts: Post[];
  quotes: SceneQuote[];
  locations: Location[];
}

// `characters` enthält nach außen nur spielbare Charaktere; NPCs (Charaktere mit
// is_npc) stehen getrennt in `npcs`. `character(id)` findet beide.
interface StoreValue extends PersistedState {
  npcs: Character[];
  ready: boolean;
  configured: boolean;
  // Auth / Login
  currentPlayerId: string | null;
  currentPlayer: Player | null;
  isApproved: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
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
  addNpc: (npc: Pick<Character, "name" | "role" | "age">) => string;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  addCharacter: (playerId: string) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  addScene: (scene: Omit<Scene, "id" | "created_at">) => string;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  resetData: () => void;
  // Ungelesene Posts ("neu"-Tag) — pro Gerät/Nutzer in localStorage
  isSceneNew: (sceneId: string) => boolean;
  markSceneSeen: (sceneId: string) => void;
  markAllScenesSeen: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: PersistedState = {
  players: [],
  characters: [],
  scenes: [],
  posts: [],
  quotes: [],
  locations: [],
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Schreibt asynchron in Supabase; Fehler werden geloggt, ohne die UI zu blockieren
// (die Änderung ist lokal bereits sichtbar — "optimistic update").
function persist(label: string, p: unknown) {
  Promise.resolve(p as PromiseLike<{ error: unknown }>).then(({ error }) => {
    if (error) console.warn(`[store] ${label}:`, error);
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ready, setReady] = useState(false);
  // Lese-Status pro Szene (wann zuletzt geöffnet). Eine Szene gilt als "neu",
  // wenn ihr jüngster Post neuer ist als der letzte Besuch (oder nie geöffnet).
  const [reads, setReads] = useState<Record<string, string>>({});

  const isApproved = Boolean(currentPlayer?.approved);
  const isAdmin = Boolean(currentPlayer?.is_admin);

  // Lädt alle Welt-Daten (nur für freigeschaltete Nutzer*innen sichtbar; RLS).
  const loadWorld = useCallback(async () => {
    const [pl, ch, sc, po, lo, qu] = await Promise.all([
      supabase.from("players").select("*"),
      supabase.from("characters").select("*"),
      supabase.from("scenes").select("*"),
      supabase.from("posts").select("*"),
      supabase.from("locations").select("*"),
      supabase.from("quotes").select("*"),
    ]);
    setState({
      players: (pl.data as Player[]) ?? [],
      characters: (ch.data as Character[]) ?? [],
      scenes: (sc.data as Scene[]) ?? [],
      posts: (po.data as Post[]) ?? [],
      locations: (lo.data as Location[]) ?? [],
      quotes: (qu.data as SceneQuote[]) ?? [],
    });
  }, []);

  // Reagiert auf eine (geänderte) Auth-Session: eigenen Spieler laden,
  // bei Freischaltung die ganze Welt.
  const loadForSession = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setCurrentPlayer(null);
        setState(EMPTY);
        setReady(true);
        return;
      }
      const { data: me } = await supabase
        .from("players")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      const player = (me as Player | null) ?? null;
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

  // Lese-Status des aktuellen Nutzers laden (localStorage, pro Gerät)
  useEffect(() => {
    if (!currentPlayer) {
      setReads({});
      return;
    }
    try {
      const raw = localStorage.getItem(`eden:reads:${currentPlayer.id}`);
      setReads(raw ? (JSON.parse(raw) as Record<string, string>) : {});
    } catch {
      setReads({});
    }
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

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadForSession(data.session);
  }, [loadForSession]);

  // --- Selektoren -----------------------------------------------------------
  // state.characters hält alle Zeilen; nach außen getrennt in spielbare und NPCs.
  const playable = useMemo(
    () => state.characters.filter((c) => !c.is_npc),
    [state.characters],
  );
  const npcs = useMemo(
    () => state.characters.filter((c) => c.is_npc),
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
        (p) => p.username.toLowerCase() === username.toLowerCase(),
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
  // Charaktere/NPCs bearbeiten dürfen Admins und wer sie angelegt hat.
  const canEditCharacter = useCallback(
    (c: Character) =>
      !!currentPlayer &&
      (Boolean(currentPlayer.is_admin) || c.player_id === currentPlayer.id),
    [currentPlayer],
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
        const post: Post = {
          id: uid("post"),
          scene_id: sceneId,
          character_id: characterId,
          content: content.trim(),
          post_number: nextNumber,
          created_at: new Date().toISOString(),
        };
        persist("addPost", supabase.from("posts").insert(post));
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
    [],
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
      // eingespielt ist — sonst ließen sich keine Orte/Szenen mehr anlegen.
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

  const updateLocation = useCallback((id: string, patch: Partial<Location>) => {
    persist("updateLocation", supabase.from("locations").update(patch).eq("id", id));
    setState((s) => {
      const old = s.locations.find((l) => l.id === id);
      if (!old) return s;
      let scenes = s.scenes;
      // Szenen hängen per Name am Ort — beim Umbenennen mitziehen.
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

  const addCharacter = useCallback((playerId: string) => {
    const id = uid("c");
    const newChar: Character = {
      id,
      player_id: playerId,
      name: "Neuer Charakter",
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
    persist("addCharacter", supabase.from("characters").insert(newChar));
    setState((s) => ({ ...s, characters: [...s.characters, newChar] }));
    return id;
  }, []);

  // NPC = Charakter mit is_npc; Profil ist optional ausfüllbar.
  const addNpc = useCallback(
    (input: Pick<Character, "name" | "role" | "age">) => {
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
      };
      persist("addNpc", supabase.from("characters").insert(newNpc));
      setState((s) => ({ ...s, characters: [...s.characters, newNpc] }));
      return id;
    },
    [currentPlayer?.id],
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
    persist("addScene", supabase.from("scenes").insert(newScene));
    setState((s) => ({ ...s, scenes: [...s.scenes, newScene] }));
    return id;
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
      if (!currentPlayer) return;
      const pid = currentPlayer.id;
      setReads((r) => {
        const next = { ...r, [sceneId]: new Date().toISOString() };
        try {
          localStorage.setItem(`eden:reads:${pid}`, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [currentPlayer?.id],
  );

  const markAllScenesSeen = useCallback(() => {
    if (!currentPlayer) return;
    const pid = currentPlayer.id;
    const now = new Date().toISOString();
    setReads((r) => {
      const next = { ...r };
      for (const s of state.scenes) next[s.id] = now;
      try {
        localStorage.setItem(`eden:reads:${pid}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer?.id, state.scenes]);

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

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      characters: playable,
      npcs,
      ready,
      configured: supabaseConfigured,
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayer,
      isApproved,
      isAdmin,
      signIn,
      signUp,
      signOut,
      logout: signOut,
      refresh,
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
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
      isSceneNew,
      markSceneSeen,
      markAllScenesSeen,
    }),
    [
      state,
      ready,
      currentPlayer,
      isApproved,
      isAdmin,
      signIn,
      signUp,
      signOut,
      refresh,
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
      canEditLocation,
      canEditCharacter,
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
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
      isSceneNew,
      markSceneSeen,
      markAllScenesSeen,
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
