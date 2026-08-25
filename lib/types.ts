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
