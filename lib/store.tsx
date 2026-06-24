"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Character, Player, Post, Scene, SceneQuote } from "./types";
import {
  seedCharacters,
  seedPlayers,
  seedPosts,
  seedQuotes,
  seedScenes,
} from "./mock-data";

const STORAGE_KEY = "eden-is-burning-v3";
const SESSION_KEY = "eden-is-burning-session";

interface PersistedState {
  players: Player[];
  characters: Character[];
  scenes: Scene[];
  posts: Post[];
  quotes: SceneQuote[];
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
  // mutations
  addPost: (sceneId: string, characterId: string, content: string) => void;
  addQuote: (postId: string, text: string) => void;
  removeQuote: (quoteId: string) => void;
  touchPresence: (playerId: string) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  addCharacter: (playerId: string) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  addScene: (scene: Omit<Scene, "id" | "created_at">) => string;
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
        setState({
          players: parsed.players ?? seedPlayers(),
          characters: parsed.characters ?? seedCharacters(),
          scenes: parsed.scenes ?? seedScenes(),
          posts: parsed.posts ?? seedPosts(),
          quotes: parsed.quotes ?? seedQuotes(),
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
      addPost,
      addQuote,
      removeQuote,
      touchPresence,
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
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
      addPost,
      addQuote,
      removeQuote,
      touchPresence,
      updateCharacter,
      addCharacter,
      updatePlayer,
      addScene,
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
