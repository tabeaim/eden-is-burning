import type { AreaKey } from "./world";

export interface Player {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Character {
  id: string;
  player_id: string;
  name: string;
  faceclaim: string | null;
  faceclaim_image_url: string | null;
  tagline: string | null;
  role: string | null;
  age: number | null;
  area: AreaKey | string;
  bio: string | null;
  pinterest_url: string | null;
  created_at: string;
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
}

export interface Post {
  id: string;
  scene_id: string;
  character_id: string;
  content: string;
  post_number: number;
  created_at: string;
}
