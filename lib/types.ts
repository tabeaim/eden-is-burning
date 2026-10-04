import type { AreaKey } from "./world";

// Aktueller Aufenthaltsort eines Spielers in der App ("Wer ist wo?").
// Im Prototyp simuliert/lokal; mit Backend würde dies per Heartbeat serverseitig
// gepflegt und für alle sichtbar.
export interface PlayerLocation {
  path: string; // Route, z.B. "/szenen/s_cafe"
  label: string; // lesbar, z.B. "Szene: Das Café…"
  at: string; // ISO timestamp des letzten Seitenwechsels
}

export interface Player {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  last_seen: string; // ISO timestamp — "zuletzt online"
  current_location?: PlayerLocation | null;
  dashboard_header_url?: string | null; // eigener Banner fürs Dashboard
  // --- Backend/Login (Supabase) ---
  auth_user_id?: string | null; // verknüpfter Supabase-Auth-User
  approved?: boolean; // von Admin freigeschaltet
  is_admin?: boolean; // darf andere freischalten
}

export interface Character {
  id: string;
  player_id: string;
  name: string;
  faceclaim: string | null; // "FACE" — Schauspieler/Model
  faceclaim_image_url: string | null;
  banner_url?: string | null; // eigens hochladbarer Profil-Banner (Seitenbild)
  tagline: string | null;
  role: string | null;
  age: number | null;
  area: AreaKey | string; // "RESIDENCE"
  bio: string | null;
  pinterest_url: string | null;
  created_at: string; // "registered on"
  // --- LOOKS ---
  height: string | null; // z.B. "183cm"
  figure: string | null; // z.B. "lean"
  hair: string | null;
  eyes: string | null;
  // --- FACTS ---
  full_name: string | null; // z.B. 'Nikolai "Kolya" Petrow'
  sexuality: string | null;
  status: string | null; // z.B. "cat dad"
  origin: string | null;
  // --- OCCUPATION ---
  job: string | null;
  company: string | null;
  // --- sonstiges ---
  quote: string | null; // Zitat unter dem Bild
  personality: string | null; // CHARACTER-Tab
  // Beziehungen zu anderen Charakteren (RELATIONS-Tab), keyed by Charakter-ID
  relationships?: Record<string, { label?: string | null; note?: string | null }>;
  // NPC: Nebenfigur mit optional ausfüllbarem Profil; gehört (player_id) dem/der
  // Ersteller*in, zählt aber nicht zu deren spielbaren Charakteren.
  is_npc?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  location_area: AreaKey | string;
  location_name: string;
  inplay_date: string; // ISO date
  inplay_time: string;
  status: "active" | "closed";
  trigger_warning: boolean;
  au?: boolean; // "Alternate Universe" — Szene in einem Nicht-Canon-Plot
  au_name?: string | null; // Name des AUs (mehrere Szenen können dasselbe AU teilen)
  next_up?: string | null; // manuelle Zug-Übergabe (Charakter-ID); sonst Reihenfolge
  paused?: boolean; // pausiert -> nicht im Dashboard-Tracker
  created_at: string;
  participant_ids: string[]; // character ids, in turn order
  // Ein-Satz-Zusammenfassung — bei Erstellung oder beim Schließen ergänzbar
  summary?: string | null;
  // Gewähltes Header-/Titelbild der Szene (sonst Seed-Platzhalter)
  header_url?: string | null;
}

export interface Post {
  id: string;
  scene_id: string;
  character_id: string;
  content: string;
  post_number: number;
  created_at: string;
}

// Ein benannter Ort innerhalb einer Area (z.B. "Café Marlowe").
// "bespielt" wird daraus abgeleitet, ob eine Szene diesen Ort referenziert.
export interface Location {
  id: string;
  area: AreaKey | string;
  name: string;
  description: string | null;
  created_at: string;
  // --- Ortsprofil ---
  created_by?: string | null; // Spieler-ID; darf den Ort (neben Admins) bearbeiten
  image_url?: string | null; // eigener Banner (sonst der der Karte)
  images?: string[] | null; // Vibes-Fotos (URLs bzw. Data-URLs)
  pinterest_url?: string | null;
  people?: LocationPerson[] | null; // „Characters & NPCs" am Ort
}

// Ein am Ort hinterlegter Charakter oder NPC samt Bezug zum Ort.
export interface LocationPerson {
  kind: "character" | "npc";
  id: string; // Charakter-ID (NPCs sind Charaktere mit is_npc)
  note: string | null; // warum die Person für den Ort relevant ist
}

// Plot-Punkt, der nicht ausgespielt wurde („im Off") — erscheint nur in der
// Timeline des jeweiligen Plots.
export interface OffScene {
  id: string;
  title: string;
  inplay_date: string; // ISO date
  inplay_time: string;
  location_name: string | null;
  summary: string | null; // Beschreibungssatz
  participant_ids: string[];
}

// Ein Plot: gespeicherte Timeline-Filter plus von Hand ergänzte/entfernte Szenen
// und Off-Szenen. Für alle sichtbar; bearbeiten dürfen Ersteller*in und Admins.
export interface Plot {
  id: string;
  name: string;
  tokens: string[]; // "char:<id>" | "player:<id>"
  aus: string[]; // AU-Namen (leer = Canon)
  areas?: string[]; // Gegend-Filter (AreaKey | "rest")
  include_ids: string[]; // zusätzlich aufgenommene Szenen
  exclude_ids: string[]; // herausgenommene Szenen
  off_scenes: OffScene[];
  created_by?: string | null;
  created_at: string;
}

// Ein aus einem Post markiertes Zitat — speist die rotierenden Dashboard-Zitate
export interface SceneQuote {
  id: string;
  scene_id: string;
  post_id: string;
  character_id: string;
  text: string;
  created_at: string;
}

// --- Messenger („Handy") -----------------------------------------------------
// Ein Chat zwischen Charakteren (aktuell zwei; das Modell trägt auch Gruppen).
export interface Chat {
  id: string;
  participant_ids: string[]; // Charakter-IDs (auch NPCs)
  created_by?: string | null; // Spieler-ID
  created_at: string;
}

// text: `content` ist der Nachrichtentext · gif/image: Bild-Adresse ·
// date: Tagestrenner mit Inplay-Datum, „2021-11-23" oder „2021-11-23|spät nachts"
export type ChatMessageKind = "text" | "gif" | "image" | "date";

export interface ChatMessage {
  id: string;
  chat_id: string;
  character_id: string; // Absender*in
  kind: ChatMessageKind;
  content: string;
  reply_to?: string | null; // zitierte Nachricht
  reactions?: Record<string, string[]> | null; // Emoji -> Charakter-IDs
  created_at: string;
}
