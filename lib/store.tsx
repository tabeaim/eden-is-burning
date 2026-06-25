"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Character,
  Location,
  Player,
  Post,
  Scene,
  SceneQuote,
} from "./types";
import {
  seedCharacters,
  seedLocations,
  seedPlayers,
  seedPosts,
  seedQuotes,
  seedScenes,
} from "./mock-data";

const STORAGE_KEY = "eden-is-burning-v5";
const SESSION_KEY = "eden-is-burning-session";

interface PersistedState {
  players: Player[];
  characters: Character[];
  scenes: Scene[];
  posts: Post[];
  quotes: SceneQuote[];
  locations: Location[];
}

interface StoreValue extends PersistedState {
  ready: boolean;
  currentPlayerId: string | null;
  currentPlayer: Player | null;
  login: (playerId: string) => void;
  logout: () => void;
  // selectors
  charactersOf: (playerId: string) => Character[];
  postsOf: (sceneId: string) => Post[];
  character: (id: string) => Character | undefined;
  player: (id: string) => Player | undefined;
  playerByUsername: (username: string) => Player | undefined;
  quotesOf: (sceneId: string) => SceneQuote[];
  locationsOf: (area: string) => Location[];
  // mutations
  addPost: (sceneId: string, characterId: string, content: string) => void;
  addQuote: (postId: string, text: string) => void;
  removeQuote: (quoteId: string) => void;
  touchPresence: (playerId: string) => void;
  // Aktuellen Aufenthaltsort setzen ("Wer ist wo?"). Prototyp: lokal/simuliert.
  setLocation: (playerId: string, path: string, label: string) => void;
  // legt einen Ort an, falls in dieser Area noch nicht vorhanden; gibt Name zurück
  addLocation: (area: string, name: string, description?: string | null) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  addCharacter: (playerId: string) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  addScene: (scene: Omit<Scene, "id" | "created_at">) => string;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function freshState(): PersistedState {
  return {
    players: seedPlayers(),
    characters: seedCharacters(),
    scenes: seedScenes(),
    posts: seedPosts(),
    quotes: seedQuotes(),
    locations: seedLocations(),
  };
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(freshState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Laden aus localStorage (clientseitig)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          players: parsed.players ?? seedPlayers(),
          characters: parsed.characters ?? seedCharacters(),
          scenes: parsed.scenes ?? seedScenes(),
          posts: parsed.posts ?? seedPosts(),
          quotes: parsed.quotes ?? seedQuotes(),
          locations: parsed.locations ?? seedLocations(),
        });
      }
      const session = localStorage.getItem(SESSION_KEY);
      if (session) setCurrentPlayerId(session);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Persistieren
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (currentPlayerId) localStorage.setItem(SESSION_KEY, currentPlayerId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [currentPlayerId, ready]);

  const login = useCallback((playerId: string) => {
    setCurrentPlayerId(playerId);
    // Anwesenheit aktualisieren
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === playerId ? { ...p, last_seen: new Date().toISOString() } : p,
      ),
    }));
  }, []);
  const logout = useCallback(() => setCurrentPlayerId(null), []);

  const charactersOf = useCallback(
    (playerId: string) => state.characters.filter((c) => c.player_id === playerId),
    [state.characters],
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

  const addQuote = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setState((s) => {
        const post = s.posts.find((p) => p.id === postId);
        if (!post) return s;
        // Doppelte (gleicher Post + Text) vermeiden
        if (
          s.quotes.some((q) => q.post_id === postId && q.text === trimmed)
        )
          return s;
        const quote: SceneQuote = {
          id: uid("q"),
          scene_id: post.scene_id,
          post_id: postId,
          character_id: post.character_id,
          text: trimmed,
          created_at: new Date().toISOString(),
        };
        return { ...s, quotes: [...s.quotes, quote] };
      });
    },
    [],
  );

  const locationsOf = useCallback(
    (area: string) => state.locations.filter((l) => l.area === area),
    [state.locations],
  );

  const addLocation = useCallback(
    (area: string, name: string, description: string | null = null) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setState((s) => {
        // Schon vorhanden (gleiche Area + Name)? Dann nichts/ggf. Beschreibung ergänzen.
        const existing = s.locations.find(
          (l) => l.area === area && l.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) {
          if (description && !existing.description) {
            return {
              ...s,
              locations: s.locations.map((l) =>
                l.id === existing.id ? { ...l, description } : l,
              ),
            };
          }
          return s;
        }
        const loc: Location = {
          id: uid("loc"),
          area,
          name: trimmed,
          description: description ?? null,
          created_at: new Date().toISOString(),
        };
        return { ...s, locations: [...s.locations, loc] };
      });
    },
    [],
  );

  const removeQuote = useCallback((quoteId: string) => {
    setState((s) => ({
      ...s,
      quotes: s.quotes.filter((q) => q.id !== quoteId),
    }));
  }, []);

  const touchPresence = useCallback((playerId: string) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === playerId ? { ...p, last_seen: new Date().toISOString() } : p,
      ),
    }));
  }, []);

  const setLocation = useCallback(
    (playerId: string, path: string, label: string) => {
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        players: s.players.map((p) =>
          p.id === playerId
            ? { ...p, last_seen: now, current_location: { path, label, at: now } }
            : p,
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
        return { ...s, posts: [...s.posts, post] };
      });
    },
    [],
  );

  const updateCharacter = useCallback(
    (id: string, patch: Partial<Character>) => {
      setState((s) => ({
        ...s,
        characters: s.characters.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      }));
    },
    [],
  );

  const addCharacter = useCallback((playerId: string) => {
    const id = uid("c");
    setState((s) => ({
      ...s,
      characters: [
        ...s.characters,
        {
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
        },
      ],
    }));
    return id;
  }, []);

  const updatePlayer = useCallback((id: string, patch: Partial<Player>) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const addScene = useCallback((scene: Omit<Scene, "id" | "created_at">) => {
    const id = uid("s");
    setState((s) => ({
      ...s,
      scenes: [
        ...s.scenes,
        { ...scene, id, created_at: new Date().toISOString() },
      ],
    }));
    return id;
  }, []);

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
    }));
  }, []);

  const resetData = useCallback(() => {
    setState(freshState());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ready,
      currentPlayerId,
      currentPlayer: currentPlayerId
        ? state.players.find((p) => p.id === currentPlayerId) ?? null
        : null,
      login,
      logout,
      charactersOf,
      postsOf,
      character,
      player,
      playerByUsername,
      quotesOf,
      locationsOf,
      addPost,
      addQuote,
      removeQuote,
      touchPresence,
      setLocation,
      addLocation,
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
    }),
    [
      state,
      ready,
      currentPlayerId,
      login,
      logout,
      charactersOf,
      postsOf,
      character,
      player,
      playerByUsername,
      quotesOf,
      locationsOf,
      addPost,
      addQuote,
      removeQuote,
      touchPresence,
      setLocation,
      addLocation,
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
      updateScene,
      resetData,
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
  if (posts.length === 0) return scene.participant_ids[0];
  const last = posts[posts.length - 1].character_id;
  const others = scene.participant_ids.filter((id) => id !== last);
  return others[0] ?? scene.participant_ids[0];
}
