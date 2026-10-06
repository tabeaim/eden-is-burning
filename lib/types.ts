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
  last_seen: string; // ISO timestamp – "zuletzt online"
  current_location?: PlayerLocation | null;
  dashboard_header_url?: string | null; // eigener Banner fürs Dashboard
  // Gelöschtes Konto: nur noch eine Hülle (Username), Charaktere und Szenen bleiben
  deleted_at?: string | null;
  // Spieler*innen-Profil: eigenes Header-Bild und dieselben frei gestaltbaren
  // Abschnitte wie bei Charakteren (Skills, Slider, Likes/Dislikes)
  profile?: PlayerProfile | null;
  // --- Backend/Login (Supabase) ---
  auth_user_id?: string | null; // verknüpfter Supabase-Auth-User
  approved?: boolean; // von Admin freigeschaltet
  is_admin?: boolean; // darf andere freischalten
}

export interface PlayerProfile {
  header_url?: string | null;
  quote?: string | null;
  skills?: { name: string; value: number }[];
  sliders?: { left: string; right: string; value: number }[];
  likes?: string[];
  dislikes?: string[];
  // Wie oft Beziehungen im Relations-Reiter schon eingetragen/geleert wurden –
  // danach verschwindet dort der erklärende Hinweis
  relation_uses?: number;
}

export interface Character {
  id: string;
  player_id: string;
  name: string;
  faceclaim: string | null; // "FACE" – Schauspieler/Model
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
  relationships?: Record<
    string,
    { label?: string | null; note?: string | null; category?: RelationCategory | null }
  >;
  // NPC: Nebenfigur mit optional ausfüllbarem Profil; gehört (player_id) dem/der
  // Ersteller*in, zählt aber nicht zu deren spielbaren Charakteren.
  is_npc?: boolean;
  // NPCs: weitere Spieler*innen (IDs), denen der NPC zugeordnet ist – sie dürfen
  // ihn wie die Person, die ihn angelegt hat, bearbeiten und für ihn schreiben
  co_owner_ids?: string[] | null;
  // Stufe einer Nebenfigur (is_npc): "extra" = Statist*in (noch nicht bespielt,
  // im Pool), "supporting" = Supporting Character (zugeordnet und bespielt).
  // Ohne Angabe gilt eine Nebenfigur als Supporting Character (Altbestand).
  npc_tier?: "extra" | "supporting" | null;
  vibes?: string[] | null; // Inspo-Bilder im Profil (SCs und Statist*innen)
  // Erweitertes Profil (siehe CharacterProfile)
  profile?: CharacterProfile | null;
  // Im Papierkorb seit … (aus allen Listen verschwunden, aber wiederherstellbar)
  deleted_at?: string | null;
  // Look des Handys im Messenger (Modell, Abnutzung, Hintergrund, Apps)
  phone?: PhoneSettings | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string; // z.B. „Mutter", „Stiefbruder"
  generation: number;
  // Seitenlinie: Geschwister der Großeltern (-2), Onkel/Tanten (-1), Cousinen/Cousins (0)
  side?: boolean;
  // Angeheiratet / Partner*in: id eines anderen Eintrags oder "self" (der
  // Charakter selbst). Steht im Stammbaum dann direkt neben dieser Person.
  partner_of?: string | null;
  // Nur bei Partner*innen: ist die Beziehung beendet? (leer = zusammen/verheiratet)
  partner_status?: "separated" | "divorced" | null;
  deceased?: boolean; // verstorben (kleines Kreuz an der Karte)
  // „Kind von": ids der Eltern (andere Einträge, oder „self" = der Charakter selbst)
  parent_ids?: string[];
  character_id?: string | null;
}

// Ausschnitt eines Whiteboard-Bilds: x/y/w/h als Anteile (0–1) des Originals,
// ar = Seitenverhältnis des Originals (Breite / Höhe)
export interface ThingCrop {
  x: number;
  y: number;
  w: number;
  h: number;
  ar: number;
}

export interface ThingItem {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  r: number;
  crop?: ThingCrop | null;
  // Querformat-Fläche (4:3). Ältere Collagen entstanden auf einer Hochformat-Fläche
  // und werden beim Anzeigen umgerechnet (siehe fitBoard in ThingsBoard).
  l?: boolean;
}

// Erweitertes Charakterprofil (JSON-Spalte `profile`). Grunddaten pflegt man in
// den Einstellungen, die beschreibenden Teile direkt im Profil.
export interface CharacterProfile {
  // --- Grunddaten ---
  birthdate?: string | null; // ISO-Datum; daraus wird das Alter berechnet
  gender?: string | null; // "weiblich" | "männlich" | "divers" | frei
  hidden?: string[]; // Angaben, die im Profil nicht gezeigt werden (Feld-Schlüssel)
  looks_note?: string | null; // kurzer Beschreibungstext zum Aussehen
  // Student*in und/oder arbeitstätig (beides zugleich möglich)
  is_student?: boolean;
  is_working?: boolean;
  occupation_kind?: "student" | "working" | null; // Altbestand, siehe isStudent/isWorking
  university?: string | null;
  major?: string | null; // Studiengang
  degree?: "undergraduate" | "graduate" | "phd" | "mba" | null;
  study_start?: string | null; // ISO-Datum; daraus das Studienjahr
  employer?: string | null; // Arbeitgeber (freier Text oder Name eines Orts)
  employer_location_id?: string | null; // … falls ein Ort gewählt wurde („works here")
  // --- Beschreibung ---
  skills?: { name: string; value: number }[]; // 0–100 %
  traits_plus?: string[];
  traits_minus?: string[];
  sliders?: { left: string; right: string; value: number }[]; // 0–100 von links
  likes?: string[];
  dislikes?: string[];
  timeline?: { year: string; title: string; text: string }[];
  // „Personal Things": Collage der Gegenstände, die der Charakter bei sich hat.
  // x/y = Mitte in % der Fläche, w = Breite in % der Flächenbreite, r = Drehung
  // in Grad; die Reihenfolge ist die Stapelfolge (letztes liegt oben).
  things?: ThingItem[];
  // Outfit-Whiteboard im Reiter „Look" (gleiche Collage wie die Gegenstände)
  outfit?: ThingItem[];
  // Signatur: Bild, das am Ende jedes Posts des Charakters steht (sonst nirgends)
  signature_url?: string | null;
  // GIF, das in Szenen unter dem Avatar steht (höchstens so breit wie der Avatar,
  // halb so hoch)
  scene_gif_url?: string | null;
  // Stammbaum: Verwandte nach Generation (-2 Großeltern, -1 Eltern, 0 gleiche
  // Generation, 1 Kinder, 2 Enkel); optional mit einem Charakter verknüpft
  family?: FamilyMember[];
  // Eltern des Charakters selbst (ids von Stammbaum-Einträgen); bei den Einträgen
  // steht dasselbe als `parent_ids`
  family_parents?: string[];
}

// Alle Felder optional – Fehlendes füllt `resolvePhone` (lib/phone.ts) mit Standards.
export interface PhoneSettings {
  disabled?: boolean; // der Charakter hat kein Handy
  avatar?: string | null; // eigenes Profilbild im Messenger (sonst das Charakterbild)
  model?: string; // Schlüssel aus PHONE_MODELS
  color?: string; // Schlüssel aus PHONE_COLORS
  wear?: number; // 0 wie neu … 3 Display gesprungen
  wallpaper?: string | null; // "preset:<key>" oder Bild-Adresse
  apps?: string[]; // zusätzlich gewählte Apps (OPTIONAL_APPS); Standard-Apps sind immer da
  custom_apps?: CustomPhoneApp[]; // selbst erstellte Apps (Name + Icon)
  // Eigene Kontakt-Einträge dieses Handys: Charakter-ID -> abweichender Name und
  // Foto. Der Name gilt überall auf diesem Handy, das Foto nur bei Kontakten und
  // Anrufen (nicht im Messenger).
  contacts?: Record<string, { name?: string; photo?: string }> | null;
  hidden_calls?: string[] | null; // aus der Anrufliste dieses Handys gelöschte Anrufe
  // Von Hand gesetzte Favoriten (ohne Angabe: ein zufälliger) und zusätzlich als
  // „relevant" markierte Kontakte
  favorites?: string[] | null;
  relevant?: string[] | null;
  // Captic ist optional: erst nach dem Aktivieren liegt die App auf dem Handy.
  // Profilangaben werden in der App selbst bearbeitet.
  captic?: CapticProfile | null;
}

// Captic-Profil eines Charakters. Follower-Zahlen sind frei gesetzt (wie viele
// dem Charakter „in der Welt" folgen); `follows` sind die Charaktere, denen er
// in der App wirklich folgt (Reiter „Gefolgt" im Feed).
export interface CapticProfile {
  enabled?: boolean;
  handle?: string;
  bio?: string;
  avatar?: string | null; // eigenes Profilbild nur für Captic
  followers?: number | null;
  following?: number | null;
  follows?: string[] | null; // Charakter-IDs
}

export interface CustomPhoneApp {
  id: string;
  name: string;
  icon: string; // Bild-Adresse
}

export type RelationCategory = "love" | "family" | "acquainted";

export interface Scene {
  id: string;
  title: string;
  location_area: AreaKey | string;
  location_name: string;
  inplay_date: string; // ISO date
  inplay_time: string;
  status: "active" | "closed";
  trigger_warning: boolean;
  au?: boolean; // "Alternate Universe" – Szene in einem Nicht-Canon-Plot
  au_name?: string | null; // Name des AUs (mehrere Szenen können dasselbe AU teilen)
  next_up?: string | null; // manuelle Zug-Übergabe (Charakter-ID); sonst Reihenfolge
  paused?: boolean; // pausiert -> nicht im Dashboard-Tracker
  created_at: string;
  participant_ids: string[]; // character ids, in turn order
  // Ein-Satz-Zusammenfassung – bei Erstellung oder beim Schließen ergänzbar
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

// Entwurf einer Antwort in einer Szene: hängt unter der Szene, ist aber nur für
// die Person sichtbar, die ihn geschrieben hat – bis sie ihn veröffentlicht.
export interface PostDraft {
  id: string;
  scene_id: string;
  character_id: string;
  player_id: string;
  content: string;
  created_at: string;
  updated_at: string;
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

// Plot-Punkt, der nicht ausgespielt wurde („im Off") – erscheint nur in der
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

// Ein aus einem Post markiertes Zitat – speist die rotierenden Dashboard-Zitate
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
  // „Left on read": Charakter-ID -> ID der Nachricht, die unbeantwortet stehen
  // bleibt. Gilt nur, solange das die neueste Nachricht ist (Chat pausiert).
  left_on_read?: Record<string, string> | null;
  // Archiviert (für alle), sobald nicht leer; enthält den Charakter, der es getan hat
  archived_by?: string[] | null;
}

// Anruf zwischen zwei Charakteren. „ringing": klingelt noch beim Angerufenen.
export interface PhoneCall {
  id: string;
  caller_id: string;
  callee_id: string;
  inplay_date: string; // ISO-Datum
  inplay_time: string | null; // „22:10"
  status: "ringing" | "accepted" | "declined" | "cancelled"; // cancelled: vom Anrufenden abgebrochen
  scene_id?: string | null; // Telefonszene, falls eine erstellt wurde
  created_at: string;
}

// text: `content` ist der Nachrichtentext · gif/image: Bild-Adresse ·
// date: Tagestrenner mit Inplay-Datum, „2021-11-23"
export type ChatMessageKind = "text" | "gif" | "image" | "date";

export interface ChatMessage {
  id: string;
  chat_id: string;
  character_id: string; // Absender*in
  kind: ChatMessageKind;
  content: string;
  reply_to?: string | null; // zitierte Nachricht
  reactions?: Record<string, string[]> | null; // Emoji -> Charakter-IDs
  inplay_time?: string | null; // Inplay-Uhrzeit „23:41" (nie die echte)
  created_at: string; // echte Zeit – bestimmt nur die Reihenfolge
}

// --- Captic -------------------------------------------------------------------
// Beitrag auf Captic: ein Bild, GIF oder kurzes Video mit Bildunterschrift.
export type CapticKind = "image" | "gif" | "video";

export interface CapticPost {
  id: string;
  character_id: string;
  kind: CapticKind;
  url: string;
  poster_url?: string | null; // Standbild fürs Raster (Video, hochgeladenes GIF)
  ar?: number | null; // Seitenverhältnis Breite/Höhe
  caption: string;
  likes: number; // von Hand gesetzte Like-Zahl
  liked_by?: string[] | null; // Charaktere, die zusätzlich geliket haben
  inplay_date?: string | null; // ISO-Datum (optional)
  created_at: string; // echte Zeit – bestimmt nur die Reihenfolge
}

// Story: liegt bildschirmfüllend hinter dem Profilbild (ohne Likes/Kommentare)
export interface CapticStory {
  id: string;
  character_id: string;
  kind: CapticKind;
  url: string;
  ar?: number | null;
  caption: string;
  created_at: string;
}

// Aktivität für `target_id`: jemand hat geliket, kommentiert oder folgt jetzt.
export interface CapticEvent {
  id: string;
  kind: "like" | "comment" | "follow";
  actor_id: string;
  target_id: string;
  post_id?: string | null;
  comment_id?: string | null;
  created_at: string;
}

export interface CapticComment {
  id: string;
  post_id: string;
  character_id: string;
  content: string;
  created_at: string;
}

// Farbmodus der App: dunkel (Standard) oder hell (Creme, angelehnt an klassische Foren)
export type Theme = "dark" | "light";

// App-weite Einstellungen (Einstellungen → Admin → Design). Liegen als eine Zeile
// (key "app") in der Tabelle app_settings; schreiben dürfen nur Admins.
export interface AppSettings {
  // Modus für alle, die keinen eigenen gewählt haben
  defaultTheme?: Theme | null;
  // Eigene Header-Bilder je Stil und Seite (erstes Pfadstück: dashboard, szenen,
  // orte …), Bildadresse ggf. mit Ausschnitt-Anhang „#y=…" (siehe lib/headers.ts)
  headers?: { dark?: Record<string, string>; light?: Record<string, string> };
  // Eigene Bilder der Gegenden (AreaKey bzw. „rest"/„industrial" -> Bildadresse,
  // ggf. mit Ausschnitt-Anhang) – Gegend-Panel der Karte und Ortskarten ohne Bild
  areaImages?: Record<string, string>;
}
