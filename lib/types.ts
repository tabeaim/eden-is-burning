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
  vibes?: string[] | null; // Inspo-Bilder fürs Moodboard im Profil (Statist*innen)
  // Erweitertes Profil (siehe CharacterProfile)
  profile?: CharacterProfile | null;
  // Im Papierkorb seit … (aus allen Listen verschwunden, aber wiederherstellbar)
  deleted_at?: string | null;
  // Endgültig gelöscht, Inhalte behalten: nur noch eine Hülle, damit Posts, SMS
  // usw. bestehen bleiben (durchgestrichener Name). Nicht wiederherstellbar.
  purged_at?: string | null;
  // Look des Handys im Messenger (Modell, Abnutzung, Hintergrund, Apps)
  phone?: PhoneSettings | null;
  // nur zur Anzeige, nie gespeichert: der Charakter tritt hier in einer anderen
  // Version auf (AU oder Szene, siehe lib/versions.ts)
  version_label?: string;
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
  // Pockets: Fläche im Handy-Format (16:15, so hoch wie das Handy). Ältere Pockets
  // lagen auf der 4:3-Fläche und werden beim Anzeigen umgerechnet (fitBoard).
  p?: boolean;
}

// Erweitertes Charakterprofil (JSON-Spalte `profile`). Grunddaten pflegt man in
// den Einstellungen, die beschreibenden Teile direkt im Profil.
export interface CharacterProfile {
  // Pausiert (nur Main Characters): Karte ausgegraut, Name in Szenen kursiv, keine
  // Gruppe auf dem Dashboard – siehe isPaused
  paused?: boolean;
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
  gpa?: string | null; // Notenschnitt, nur bei Student*innen
  spotify_url?: string | null; // Link zu Playlist/Profil, steht bei den Facts
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
  // Text-Signatur (reiner Text oder HTML, siehe signatureHtml): steht ebenfalls am
  // Ende jedes Posts (zusätzlich zum oder statt des Bilds)
  signature_text?: string | null;
  // Ausrichtung von Text- und Bild-Signatur; ohne Angabe zentriert
  signature_align?: "left" | "center" | "right" | null;
  // GIF, das in Szenen unter dem Avatar steht (höchstens so breit wie der Avatar,
  // halb so hoch)
  scene_gif_url?: string | null;
  // Optionaler Hochkant-Banner (250 px breit, so hoch wie die Facts) links im Reiter General des Profils;
  // ohne ihn stehen dort nur Beschreibung und Facts
  side_banner_url?: string | null;
  // Stammbaum: Verwandte nach Generation (-2 Großeltern, -1 Eltern, 0 gleiche
  // Generation, 1 Kinder, 2 Enkel); optional mit einem Charakter verknüpft
  family?: FamilyMember[];
  // Eltern des Charakters selbst (ids von Stammbaum-Einträgen); bei den Einträgen
  // steht dasselbe als `parent_ids`
  family_parents?: string[];
  // Versionen für AUs (Schlüssel: AU-Name) und einzelne Szenen (Schlüssel: Szenen-ID)
  versions?: { au?: Record<string, CharacterVersion>; scene?: Record<string, CharacterVersion> } | null;
}

// Alle Felder optional – Fehlendes füllt `resolvePhone` (lib/phone.ts) mit Standards.
// Abweichende Angaben eines Charakters in einem AU oder einer Szene (lib/versions.ts)
export interface CharacterVersion {
  image?: string | null;
  name?: string | null;
  age?: number | null;
  role?: string | null;
  tagline?: string | null;
  bio?: string | null;
  scene_gif_url?: string | null;
  signature_url?: string | null;
}

export interface PhoneSettings {
  disabled?: boolean; // der Charakter hat kein Handy
  avatar?: string | null; // eigenes Profilbild im Messenger (sonst das Charakterbild)
  model?: string; // Schlüssel aus PHONE_MODELS
  color?: string; // Schlüssel aus PHONE_COLORS
  wear?: number; // 0 wie neu … 3 Display gesprungen
  wallpaper?: string | null; // "preset:<key>" oder Bild-Adresse
  apps?: string[]; // zusätzlich gewählte Apps (OPTIONAL_APPS)
  battery?: number | null; // Akkustand 0–100 (fehlt: 75); ändert sich nur von Hand
  hidden_apps?: string[] | null; // abgewählte Deko-Standard-Apps (DECOR_APPS); echte Apps sind immer da
  custom_apps?: CustomPhoneApp[]; // selbst erstellte Apps (Name + Icon)
  // Eigene Kontakt-Einträge dieses Handys: Charakter-ID -> abweichender Name und
  // Foto. Der Name gilt überall auf diesem Handy, das Foto nur bei Kontakten und
  // Anrufen (nicht im Messenger).
  contacts?: Record<string, { name?: string; photo?: string }> | null;
  hidden_calls?: string[] | null; // aus der Anrufliste dieses Handys gelöschte Anrufe
  // Von Hand gesetzte Favoriten (ohne Angabe: ein zufälliger) und zusätzlich als
  // „relevant" markierte Kontakte; `not_relevant`: von Hand aus „Relevante"
  // entfernt, obwohl es schon Kontakt gab (z. B. Nummer noch nicht bekannt)
  favorites?: string[] | null;
  relevant?: string[] | null;
  not_relevant?: string[] | null;
  // Captic ist optional: erst nach dem Aktivieren liegt die App auf dem Handy.
  // Profilangaben werden in der App selbst bearbeitet.
  captic?: CapticProfile | null;
  // Notizen- und Fotos-App: in der App selbst angelegt, in dieser Reihenfolge angezeigt
  notes?: PhoneNote[] | null;
  photos?: PhonePhoto[] | null;
}

export interface PhoneNote {
  id: string;
  title: string;
  text: string;
}

export interface PhonePhoto {
  id: string;
  url: string;
  caption?: string;
}

// Captic-Profil eines Charakters. Follower-Zahlen sind frei gesetzt (wie viele
// dem Charakter „in der Welt" folgen); `follows` sind die Charaktere, denen er
// in der App wirklich folgt (Reiter „Gefolgt" im Feed).
export interface CapticProfile {
  enabled?: boolean;
  handle?: string;
  display_name?: string | null; // Anzeigename im Profil (sonst der Charaktername)
  bio?: string;
  avatar?: string | null; // eigenes Profilbild nur für Captic
  followers?: number | null;
  following?: number | null;
  follows?: string[] | null; // Charakter-IDs
  // Privates Profil: Beiträge, Stories und Highlights sehen nur, wer folgt (und die
  // eigene Spielerin); folgen geht dann nur über eine Anfrage (`captic_events`).
  private?: boolean;
}

export interface CustomPhoneApp {
  id: string;
  name: string;
  icon: string; // Bild-Adresse
}

export type RelationCategory = "love" | "family" | "friends" | "acquainted" | "foes" | "past";

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
  // Entwurf: der erste Post liegt nur als Entwurf vor. Sichtbar nur für die Person
  // mit diesem Entwurf, bis der erste Post veröffentlicht ist (schema-scene-drafts.sql)
  draft?: boolean;
  // Darstellung der Posts: "script" = Drehbuch-Format (Regie + Dialog, siehe
  // lib/script.ts); sonst normaler Fließtext. Umstellbar, solange kein Post existiert.
  format?: "script" | null;
  // Beteiligte dürfen für diese Szene eine eigene Version ihres Charakters anlegen
  // (Szenen-Einstellungen → Versionen, schema-scene-versions.sql)
  versions?: boolean;
  created_at: string;
  participant_ids: string[]; // character ids, in turn order
  // Ein-Satz-Zusammenfassung – bei Erstellung oder beim Schließen ergänzbar
  summary?: string | null;
  // Gewähltes Header-/Titelbild der Szene (sonst Seed-Platzhalter)
  header_url?: string | null;
  // Nur bei SMS-Szenen (aus `ChatScene` abgeleitet, keine Zeile in `scenes`): der
  // Chat, in dem sie liegt. Führt aufs Handy statt auf die Szenenseite.
  chat_id?: string | null;
}

export interface Post {
  id: string;
  scene_id: string;
  character_id: string;
  content: string;
  post_number: number;
  created_at: string;
  // Nur im Browser: Der Text ist noch nicht geladen (`content` ist leer). Beim Start
  // kommen von allen Posts nur die Eckdaten, der Text erst beim Öffnen der Szene.
  partial?: boolean;
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
  category?: string | null; // Orts-Kategorie (siehe lib/places.ts); leer = aus dem Namen erraten
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
// und Off-Szenen. Sichtbar für Betroffene (oder privat); bearbeiten dürfen sie auch,
// löschen nur Ersteller*in und Admins.
export interface Plot {
  id: string;
  name: string;
  tokens: string[]; // "char:<id>" | "player:<id>"
  aus: string[]; // AU-Namen (leer = Canon)
  areas?: string[]; // Gegend-Filter (AreaKey | "rest")
  include_ids: string[]; // zusätzlich aufgenommene Szenen
  exclude_ids: string[]; // herausgenommene Szenen
  off_scenes: OffScene[];
  // privat: nur für die Person sichtbar, die ihn angelegt hat; sonst für sie,
  // Admins und alle betroffenen Spieler*innen (schema-plots-private.sql)
  private?: boolean;
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
// Ein Chat zwischen Charakteren: zu zweit oder als Gruppe (ab drei Beteiligten).
// Je Zusammensetzung gibt es genau einen Chat.
export interface Chat {
  id: string;
  participant_ids: string[]; // Charakter-IDs (auch NPCs)
  name?: string | null; // Gruppenname (optional; sonst die Vornamen)
  created_by?: string | null; // Spieler-ID
  created_at: string;
  // „Left on read": Charakter-ID -> ID der Nachricht, die unbeantwortet stehen
  // bleibt. Gilt nur, solange das die neueste Nachricht ist (Chat pausiert).
  left_on_read?: Record<string, string> | null;
  // Archiviert (für alle), sobald nicht leer; enthält den Charakter, der es getan hat
  archived_by?: string[] | null;
}

// SMS-Szene: ein benannter Abschnitt im fortlaufenden Chat – die Nachrichten, die
// per `scene_id` dazugehören. Steht mit Titel in Szenenübersicht, Dashboard und
// Timeline; Nachrichten ohne Szene bleiben „lose".
export interface ChatScene {
  id: string;
  chat_id: string;
  title: string;
  inplay_date: string; // ISO-Datum (wann die Szene spielt bzw. beginnt)
  summary?: string | null;
  au?: boolean;
  au_name?: string | null;
  status: "active" | "closed";
  created_by?: string | null; // Spieler-ID
  created_at: string;
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
  // Abgelehnter Anruf: was der/die Anrufende auf die Mailbox gesprochen hat
  voicemail?: string | null;
  created_at: string;
}

// text: `content` ist der Nachrichtentext · gif/image: Bild-Adresse ·
// date: Altbestand – Tagestrenner mit Inplay-Datum, „2021-11-23". Neue Nachrichten
// tragen ihr Datum selbst (`inplay_date`); Trenner entstehen beim Anzeigen.
// voice: Sprachnachricht – textbasiert, `content` ist das Gesprochene
export type ChatMessageKind = "text" | "gif" | "image" | "voice" | "date";

export interface ChatMessage {
  id: string;
  chat_id: string;
  character_id: string; // Absender*in
  kind: ChatMessageKind;
  content: string;
  reply_to?: string | null; // zitierte Nachricht
  reactions?: Record<string, string[]> | null; // Emoji -> Charakter-IDs
  inplay_time?: string | null; // Inplay-Uhrzeit „23:41" (nie die echte)
  inplay_date?: string | null; // Inplay-Tag – danach sortiert der Chat
  scene_id?: string | null; // SMS-Szene, zu der die Nachricht gehört (sonst lose)
  created_at: string; // echte Zeit – Reihenfolge innerhalb eines Tages
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
  location?: string | null; // Ortsangabe über dem Bild (optional)
  tags?: CapticTag[] | null; // auf dem Bild markierte Profile
  created_at: string; // echte Zeit – bestimmt nur die Reihenfolge
}

// Markierung auf dem Bild: wer, und wo (Anteil der Bildbreite/-höhe, 0–1)
export interface CapticTag {
  character_id: string;
  x: number;
  y: number;
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

// Story-Highlight: Kreis unter der Bio mit dauerhaft abgelegten Stories. Die
// Stories liegen als Kopie darin – sie bleiben, auch wenn die Story gelöscht wird.
export interface CapticHighlightItem {
  id: string; // ID der Story, aus der das Bild stammt
  kind: CapticKind;
  url: string;
  ar?: number | null;
  caption: string;
  inplay_date?: string | null; // ISO-Datum (optional)
}

export interface CapticHighlight {
  id: string;
  character_id: string;
  name: string;
  cover_url?: string | null; // Titelbild (sonst das erste Bild)
  items: CapticHighlightItem[];
  created_at: string;
}

// Aktivität für `target_id`: jemand hat geliket, kommentiert, folgt jetzt, möchte
// folgen (`request`, privates Profil) oder hat die Anfrage angenommen (`accept`);
// hat einen in Bildunterschrift oder Kommentar verlinkt (`mention`), auf dem Bild
// markiert (`tag`) oder einen Kommentar geliket (`comment_like`).
export interface CapticEvent {
  id: string;
  kind: "like" | "comment" | "follow" | "request" | "accept" | "mention" | "tag" | "comment_like";
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
  liked_by?: string[] | null; // Charaktere, die den Kommentar geliket haben
  created_at: string;
}

// Farbmodus der App: dunkel (Standard) oder hell (Creme, angelehnt an klassische Foren)
export type Theme = "dark" | "light";

// App-weite Einstellungen (Einstellungen → Admin → Design). Liegen als eine Zeile
// (key "app") in der Tabelle app_settings; schreiben dürfen nur Admins.
// Unterseite unter „Info" (siehe lib/info.ts)
export interface InfoPage {
  id: string; // steht in der Adresse: /info/<id>
  title: string;
  text: string; // Kurztext auf der Karte der Übersicht
  icon: string; // IconName
  content: string; // Inhalt: reiner Text oder HTML (wie Profiltexte)
}

export interface PageBackground {
  url?: string | null;
  opacity?: number | null; // 0–100
}

export interface AppSettings {
  // Modus für alle, die keinen eigenen gewählt haben
  defaultTheme?: Theme | null;
  // Eigene Header-Bilder je Stil und Seite (erstes Pfadstück: dashboard, szenen,
  // orte …), Bildadresse ggf. mit Ausschnitt-Anhang „#y=…" (siehe lib/headers.ts)
  headers?: { dark?: Record<string, string>; light?: Record<string, string> };
  // Standard-Banner je Stil: gilt überall, wo weder die Seite noch der Inhalt ein
  // eigenes Bild hat (sonst das mitgelieferte Standardbild)
  standardHeader?: { dark?: string | null; light?: string | null };
  // Noch nicht übernommener Entwurf des Standard-Banners (Admin → Design); gilt
  // erst nach „Überschreiben"
  standardHeaderDraft?: { dark?: string | null; light?: string | null };
  // Eigene Bilder der Gegenden (AreaKey bzw. „rest"/„industrial" -> Bildadresse,
  // ggf. mit Ausschnitt-Anhang) – Gegend-Panel der Karte und Ortskarten ohne Bild
  areaImages?: Record<string, string>;
  // Standardbilder für Charaktere bzw. Spieler*innen ohne eigenes Bild (sonst die
  // anonyme Silhouette, siehe lib/avatar.ts)
  defaultAvatars?: { character?: string | null; player?: string | null };
  // Info-Seiten in ihrer Reihenfolge (ohne Angabe die fest eingetragenen)
  infoPages?: InfoPage[] | null;
  // Hintergrundbild der Seiten je Stil: eigenes Bild (sonst der Standard des Stils –
  // dunkel das Wellenbild, hell keins) und Deckkraft in Prozent (ohne Angabe 100)
  background?: { dark?: PageBackground; light?: PageBackground };
  // Geänderte Texte der Bezirke (AreaKey bzw. „rest"/„industrial"/„eden" -> nur die
  // abweichenden Felder; sonst gelten die festen Angaben aus lib/world.ts)
  areas?: Record<string, { name?: string; character?: string; priceLevel?: string; residents?: string }>;
}
