/**
 * Import aus dem alten MyBB-Forum (Datenbank-Backup als .sql).
 *
 *   npm run import-mybb -- --dump="/pfad/zum/backup.sql"            Probelauf
 *   npm run import-mybb -- --dump="/pfad/zum/backup.sql" --apply    schreibt in die Datenbank
 *
 *   … --richtext [--apply]   nur das HTML der freien Profiltexte nachziehen (siehe unten)
 *
 * Der Probelauf schreibt nichts in die Datenbank: Er zeigt Zahlen und Hinweise und
 * legt das Ergebnis zum Ansehen unter backups/import-preview_<Datum>_<Projekt>/ ab.
 * --apply verlangt eine vollständige, höchstens 24 Stunden alte Sicherung
 * (npm run backup-db) und eine eingetippte Bestätigung. Wiederholbar: Alle Zeilen
 * tragen feste IDs aus dem Forum (…_f<Nummer>) und werden beim erneuten Lauf ersetzt.
 *
 * Was woraus wird:
 *   Konten (ein Konto je Charakter, über den Accountswitcher gebündelt)
 *                          -> players (je Spieler*in) + characters
 *   Profilfelder           -> Charakterprofil (Facts, Looks, Skills, Slider, Likes, Timeline …)
 *   Inplay- und Archiv-Threads mit Szeneninfos -> scenes + posts
 *   Forum „messengers"     -> chats + SMS-Szenen (chat_scenes) + chat_messages
 *   Forum „phone calls"    -> Telefonszene (scenes, Bereich „phone") + calls
 *   Inplayzitate           -> quotes
 *   Relationen             -> characters.relationships (NPCs als Statist*innen)
 *   Instaroid              -> Captic (Beiträge, Kommentare, Highlights, Profil)
 *
 * Nicht übernommen: Regeln/Support/Spielbereich, private Nachrichten, Post-Likes,
 * Forum-Passwörter (alle registrieren sich neu, siehe schema-import-players.sql).
 *
 * GESCHÜTZT: Charaktere aus PROTECTED_CHARACTER_IDS (env.ts, derzeit c_irina) werden
 * nie geschrieben – ihr in der App neu ausgefülltes Profil bleibt, wie es ist.
 * Einzige Ausnahme: Ihre Relationen aus dem Forum werden in `relationships` ergänzt
 * (vorhandene Einträge des neuen Profils gehen vor), ebenso der Captic-Anzeigename,
 * sofern dort noch keiner steht.
 * Szenen, Posts, Chats und Relationen anderer verweisen trotzdem auf sie.
 */
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { ADMIN_EMAIL, BACKUP_ROOT, PROTECTED_CHARACTER_IDS, db, envFile, fetchAll, flag, isMissingTable, option, projectRef, stamp, url } from "./env";
import { readDump, type DumpRow } from "./mybb-dump";

const OLD_SITE = "https://edenisburning.de";
type Row = Record<string, unknown>;
const warnings: string[] = [];
const warn = (w: string) => warnings.push(w);

// ---------------------------------------------------------------------------
// Feste Zuordnungen
// ---------------------------------------------------------------------------

// Spieler*innen: Profilfeld „Dein Name" (klein) -> Eintrag in players. Die IDs sind
// die der bisherigen Test-Spieler*innen, damit vorhandene Zeilen übernommen werden.
const PLAYERS: Record<string, { id: string; username: string }> = {
  tabs: { id: "p_tabs", username: "tabs" },
  kat: { id: "p_kat", username: "kat" },
  abby: { id: "p_abby", username: "abby" },
  v: { id: "p_vera", username: "V" },
  envy: { id: "p_liz", username: "envy" },
  jule: { id: "p_jule", username: "jule" },
  granny: { id: "p_granny", username: "Granny" },
};
// Gemeinsames NPC-Konto („Abbys und Jules NPCs"): Nebenfigur mit zwei Zuständigen
const SHARED_NPC_OWNER = /^abbys und jules npcs$/i;

const WOHNORT: Record<string, string> = {
  "belle view": "belle_view",
  "oak hill": "oak_hill",
  "orchid valley": "orchid_valley",
  "rivers edge": "rivers_edge",
  westridge: "westridge",
  "washington d.c.": "washington",
};

// Forum -> Gegend, wenn der Ort selbst nichts Genaueres sagt
const FORUM_AREA: Record<string, string> = {
  "rivers edge": "rivers_edge",
  "belle view": "belle_view",
  "oak hill": "oak_hill",
  westridge: "westridge",
  "orchid valley": "orchid_valley",
  "byron university": "byron",
  "sutton academy": "sutton",
  "washington d.c.": "washington",
  "the whole world": "rest",
};

// Neu gemappte Orte (Liste von Tabea, 2026-10-08): Muster auf die Ortsangabe der
// Szene -> einheitlicher Name und Gegend. `place`: als Ort (locations) anlegen;
// `auOnly`/`forum`: gilt nur für AU-Szenen bzw. nur in diesem Forum.
const PLACES: { match: RegExp; name: string; area: string; place?: boolean; auOnly?: boolean; forum?: string }[] = [
  { match: /st\.? ?jude'?s|^hospital$/, name: "St. Jude's Hospital", area: "downtown", place: true },
  { match: /pandora/, name: "Pandora", area: "industrial", place: true },
  { match: /ron'?s diner/, name: "Ron's Diner", area: "rivers_edge", place: true },
  { match: /rusty pelican/, name: "Rusty Pelican", area: "westridge", place: true },
  { match: /lou'?s trailer/, name: "Lou's Trailer", area: "westridge" },
  { match: /lou'?s apartment/, name: "Lou's Apartment", area: "eden" },
  { match: /marilyn'?s mansion/, name: "Marilyn's Mansion", area: "westridge", place: true },
  { match: /virginia yacht club/, name: "Virginia Yacht Club", area: "belle_view", place: true },
  { match: /warehouse rave|rave im warenlager/, name: "Warehouse Rave", area: "industrial", place: true },
  { match: /hilton hotel eden/, name: "Hilton Hotel Eden", area: "belle_view", place: true },
  { match: /eden town hall/, name: "Eden Town Hall", area: "downtown", place: true },
  { match: /^flughafen$/, name: "Flughafen", area: "umland", place: true },
  { match: /^harbour$/, name: "Harbour", area: "industrial", place: true },
  { match: /^kino$/, name: "Kino", area: "downtown", place: true },
  { match: /^tankstelle$/, name: "Tankstelle", area: "eden", place: true },
  { match: /chez giuseppe/, name: "Chez Giuseppe", area: "downtown", place: true },
  { match: /^asado$/, name: "Asado", area: "downtown", place: true },
  { match: /^diner$/, name: "Diner", area: "eden" },
  { match: /dicey'?s|cesar'?s/, name: "Dicey's", area: "eden", place: true },
  { match: /slau[gh]+t?h?erhouse/, name: "Slaughterhouse", area: "westridge", place: true },
  { match: /eden mall/, name: "Eden Mall", area: "downtown", place: true },
  { match: /halloween store/, name: "Halloween Store", area: "downtown", place: true },
  { match: /waldhütte/, name: "Waldhütte", area: "umland", place: true },
  { match: /^airbnb$/, name: "Airbnb", area: "umland", forum: "parks & outdoor" },
  { match: /elementary school/, name: "Elementary School, Schwimmhalle", area: "downtown", place: true },
  { match: /sam'?s house/, name: "Sam's House", area: "rivers_edge", auOnly: true },
  { match: /diego.?s apartment/, name: "Diego's Apartment", area: "rivers_edge", auOnly: true },
  { match: /mariana'?s trailer/, name: "Mariana's Trailer", area: "westridge", auOnly: true },
  { match: /bar in rivers edge/, name: "Bar in Rivers Edge", area: "rivers_edge", auOnly: true },
  { match: /^rivers edge$/, name: "", area: "rivers_edge", auOnly: true },
  { match: /^paris$/, name: "Paris", area: "rest", auOnly: true },
];

const RELATION_KAT: Record<string, string> = {
  "love life": "love",
  family: "family",
  friends: "friends",
  acquainted: "acquainted",
  foes: "foes",
  past: "past",
};

// ---------------------------------------------------------------------------
// Text-Helfer
// ---------------------------------------------------------------------------

const str = (v: string | null | undefined) => (v ?? "").trim();
const orNull = (v: string | null | undefined) => str(v) || null;
const iso = (sec: string | number | null | undefined) => new Date(Number(sec || 0) * 1000).toISOString();
const berlinDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", hellip: "…", ndash: "–", mdash: "—" };
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

// Emoji, die im Forum als Bild eingebunden waren (…/sweat-droplets_1f4a6.png), wieder
// als echte Emoji
const emojiImages = (s: string) =>
  s.replace(/<img[^>]*src=["']https?:\/\/(?:em-content\.zobj\.net|images\.emojiterra\.com)\/[^"']*?_((?:[0-9a-f]{2,6})(?:-[0-9a-f]{2,6})*)\.(?:png|gif|webp)["'][^>]*>/gi, (m, hex) => {
    try {
      return String.fromCodePoint(...String(hex).split("-").map((h: string) => parseInt(h, 16)));
    } catch {
      return m;
    }
  });

const attr = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
const KNOWN_BB = "b|i|u|s|align|color|size|font|url|img|list|\\*|quote|hr|center|picture";

// Forum-Text (MyCode, HTML und Zeilenumbrüche gemischt) -> HTML für Posts
export function toHtml(input: string | null | undefined): string {
  let s = emojiImages((input ?? "").replace(/\r\n?/g, "\n"));
  s = s
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|body|html|head|meta|link)\b[^>]*>/gi, "");
  s = s
    .replace(/\[(\/?)(b|i|u|s)\]/gi, (_, c, t) => `<${c}${t.toLowerCase()}>`)
    .replace(/\[align=([a-z]+)\]/gi, (_, a) => `<div style="text-align:${attr(a)}">`)
    .replace(/\[\/align\]/gi, "</div>")
    .replace(/\[center\]/gi, '<div style="text-align:center">')
    .replace(/\[\/center\]/gi, "</div>")
    .replace(/\[color=([^\]]+)\]/gi, (_, c) => `<span style="color:${attr(c)}">`)
    .replace(/\[size=([^\]]+)\]/gi, (_, z) => `<span style="font-size:${/^\d+$/.test(z) ? `${z}pt` : attr(z)}">`)
    .replace(/\[font=([^\]]+)\]/gi, (_, f) => `<span style="font-family:${attr(f)}">`)
    .replace(/\[\/(color|size|font)\]/gi, "</span>")
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_, u, t) => `<a href="${attr(u)}" target="_blank" rel="noreferrer noopener">${t}</a>`)
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_, u) => `<a href="${attr(u)}" target="_blank" rel="noreferrer noopener">${u}</a>`)
    .replace(/\[img[^\]]*\]([\s\S]*?)\[\/img\]/gi, (_, u) => `<img src="${attr(u.trim())}">`)
    .replace(/\[quote[^\]]*\]/gi, "<blockquote>")
    .replace(/\[\/quote\]/gi, "</blockquote>")
    .replace(/\[hr\]/gi, "<hr>")
    .replace(/\[list(=[^\]]*)?\]([\s\S]*?)\[\/list\]/gi, (_, kind, body) => {
      const items = String(body).split(/\[\*\]/).map((x: string) => x.trim()).filter(Boolean);
      const tag = kind ? "ol" : "ul";
      return `<${tag}>${items.map((x: string) => `<li>${x}</li>`).join("")}</${tag}>`;
    });
  // Bilder des alten Forums mit vollständiger Adresse (für den Bilder-Umzug)
  s = s.replace(/(src=["']?)\.?\/?(uploads\/|images\/)/gi, `$1${OLD_SITE}/$2`);
  // Sternchen blieben im Forum Sternchen; renderPost würde daraus Kursivschrift machen
  s = s.replace(/\*/g, "&#42;");
  // Zeilenumbrüche -> <br>, außer im Tabellengerüst (dort verrutschen sie nach oben)
  const STRUCT = "(?:table|thead|tbody|tr|td|th|ul|ol|li)";
  s = s
    .replace(new RegExp(`\\n+(?=\\s*</?${STRUCT}\\b)`, "gi"), "")
    .replace(new RegExp(`(</?${STRUCT}\\b[^>]*>)\\s*\\n+`, "gi"), "$1");
  return s.trim().replace(/\n/g, "<br>");
}

// Forum-Text -> reiner Text (Bio, Messenger-Nachrichten, Bildunterschriften)
export function toText(input: string | null | undefined): string {
  return decode(
    emojiImages(input ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/<br\s*\/?>\n?/gi, "\n")
      .replace(/<\/(div|p|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(new RegExp(`\\[\\/?(?:${KNOWN_BB})(?:=[^\\]]*)?\\]`, "gi"), ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Forum-Text -> Profiltext für RichText (Kurzbeschreibung, About, Looks, Zitat,
// Timeline, Relationen): HTML und MyCode bleiben als HTML erhalten. Ohne jede
// Formatierung bleibt es reiner Text. Ein Zeilenumbruch direkt an einem <br> oder
// Block-Tag zählt nicht doppelt.
export function toRich(input: string | null | undefined): string {
  const raw = (input ?? "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return "";
  if (!/<[a-z!/][^>]*>/i.test(raw) && !new RegExp(`\\[\\/?(?:${KNOWN_BB})(?:=[^\\]]*)?\\]`, "i").test(raw)) return toText(raw);
  const BLOCK = "(?:div|p|h[1-6]|center|ul|ol|li|blockquote|hr|table|tr|td)";
  return toHtml(
    raw
      .replace(/(<br\s*\/?>)[ \t]*\n/gi, "$1")
      .replace(/\n[ \t]*(<br\s*\/?>)/gi, "$1")
      .replace(new RegExp(`(</?${BLOCK}\\b[^>]*>)[ \\t]*\\n`, "gi"), "$1")
      .replace(new RegExp(`\\n[ \\t]*(</?${BLOCK}\\b[^>]*>)`, "gi"), "$1"),
  );
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// „11:23 PM" -> „23:23"
function time24(t: string | null | undefined): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(t ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]) {
    if (/pm/i.test(m[3]) && h < 12) h += 12;
    if (/am/i.test(m[3]) && h === 12) h = 0;
  }
  return h > 23 ? null : `${String(h).padStart(2, "0")}:${m[2]}`;
}

// „07.11.2021" -> „2021-11-07"
function deDate(d: string | null | undefined): string | null {
  const m = /^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/.exec(str(d));
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function height(v: string | null | undefined): string | null {
  const raw = str(v);
  const n = Number(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!raw || !Number.isFinite(n) || n <= 0) return raw || null;
  return `${Math.round(n < 3 ? n * 100 : n)} cm`;
}

const traits = (s: string) => [...s.matchAll(/\[trait="([\s\S]*?)"\]/g)].map((m) => decode(m[1]).trim()).filter(Boolean);
const section = (s: string | null | undefined, tag: string) => new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i").exec(s ?? "")?.[1] ?? "";
const mediaKind = (u: string) => (/\.gif(\?|#|$)/i.test(u) ? "gif" : /\.(mp4|webm|mov)(\?|#|$)/i.test(u) ? "video" : "image");

// ---------------------------------------------------------------------------
// Umwandlung (rein rechnerisch, ohne Datenbank)
// ---------------------------------------------------------------------------

interface Plain {
  bio: string | null;
  quote: string | null;
  personality: string | null;
  looks_note: string | null;
  timeline: string[];
  notes: Record<string, string | null>;
}

interface Existing {
  players: Row[];
  characters: Row[];
  locations: Row[];
}

function build(dump: Record<string, DumpRow[]>, existing: Existing) {
  const users = dump.users;
  const fields = new Map(dump.userfields.map((f) => [f.ufid, f]));
  const userById = new Map(users.map((u) => [u.uid, u]));
  const admin = existing.players.find((p) => String(p.email).toLowerCase() === ADMIN_EMAIL);

  // --- Spieler*innen ----------------------------------------------------------
  // Hauptkonto = as_uid (Accountswitcher), sonst das Konto selbst. Zusammengeführt
  // wird über „Dein Name", denn manche Spieler*innen haben zwei Hauptkonten.
  const playerOfUid = new Map<string, string>();
  const players = new Map<string, Row>();
  const sharedNpcUids = new Set<string>();
  const nameOf = (u: DumpRow) => str(fields.get(u.uid)?.fid28);
  for (const u of users) {
    const master = userById.get(u.as_uid && u.as_uid !== "0" ? u.as_uid : u.uid) ?? u;
    let label = nameOf(u) || nameOf(master);
    if (SHARED_NPC_OWNER.test(label)) {
      sharedNpcUids.add(u.uid!);
      label = "jule";
    }
    let def = PLAYERS[label.toLowerCase()];
    if (!def) def = PLAYERS[nameOf(master).toLowerCase()];
    if (!def) {
      // gleiche E-Mail wie ein bekanntes Konto?
      const twin = users.find((x) => x.email === u.email && PLAYERS[nameOf(x).toLowerCase()]);
      if (twin) def = PLAYERS[nameOf(twin).toLowerCase()];
    }
    if (!def) {
      warn(`Konto „${u.username}" (uid ${u.uid}, „Dein Name": „${label}") keiner Spieler*in zuordenbar – dem Admin zugeordnet.`);
      def = PLAYERS.tabs;
    }
    playerOfUid.set(u.uid!, def.id);
    const p = players.get(def.id) ?? { id: def.id, username: def.username, email: null, created_at: iso(u.regdate), _uids: [] as string[] };
    (p._uids as string[]).push(u.uid!);
    if (iso(u.regdate) < String(p.created_at)) p.created_at = iso(u.regdate);
    // E-Mail des Hauptkontos; die Admin-Zeile behält ihre Adresse
    if (master.uid === u.uid && !p.email) p.email = str(u.email).toLowerCase();
    players.set(def.id, p);
  }
  for (const p of players.values()) {
    if (admin && p.id === admin.id) p.email = admin.email;
    if (!p.email) p.email = `${p.username}@import.invalid`.toLowerCase();
    if (/@(email\.(de|com)|import\.invalid)$/.test(String(p.email))) {
      warn(`Spieler*in „${p.username}": E-Mail „${p.email}" ist ein Platzhalter – vor der Registrierung in players.email die echte Adresse eintragen.`);
    }
  }

  // --- Charaktere -------------------------------------------------------------
  const charId = new Map<string, string>(); // uid -> Charakter-ID
  const taken = new Set<string>();
  for (const u of [...users].sort((a, b) => Number(a.uid) - Number(b.uid))) {
    const parts = slug(u.username ?? "").split("_").filter(Boolean);
    let id = `c_${parts[0] ?? `f${u.uid}`}`;
    if (taken.has(id)) id = `c_${parts.join("_")}`;
    if (taken.has(id)) id = `c_f${u.uid}`;
    taken.add(id);
    charId.set(u.uid!, id);
  }
  const characters: Row[] = [];
  const protectedSkipped: string[] = [];
  const protectedDisplayNames = new Map<string, string>(); // Captic-Anzeigename aus dem Forum
  // So sah der erste Import aus (reiner Text, noch ohne HTML) – daran erkennt
  // --richtext, welche Felder seither niemand angefasst hat
  const plainOf = new Map<string, Plain>();
  const playerArea = new Map<string, string>();
  for (const u of users) {
    const f = fields.get(u.uid) ?? {};
    const id = charId.get(u.uid!)!;
    const groups = [u.usergroup, ...str(u.additionalgroups).split(",")].map((g) => str(g));
    const isStudent = groups.includes("8") || groups.includes("9");
    const isWorking = groups.includes("10");
    const area = WOHNORT[str(f.fid9).toLowerCase()] ?? "eden";
    playerArea.set(id, area);
    const avatar = str(u.avatar).replace(/\?.*$/, "");
    const likesRaw = str(f.fid42);
    const traitsRaw = str(f.fid43);
    const degreeRaw = str(f.fid36).toLowerCase();
    const bday = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(str(u.birthday));

    // Signatur: ein einzelnes Bild -> Signaturbild, sonst Text-Signatur
    const sig = str(u.signature);
    const sigImg = /^(?:\s|<br\s*\/?>|<\/?center>|\[\/?align[^\]]*\])*<img[^>]*src=["']([^"']+)["'][^>]*>(?:\s|<br\s*\/?>|<\/?center>|\[\/?align[^\]]*\])*$/i.exec(sig);

    const profile: Row = {
      gender: orNull(f.fid46),
      looks_note: toRich(f.fid25) || null,
      is_student: isStudent,
      is_working: isWorking,
      major: orNull(f.fid17),
      gpa: orNull(f.fid19),
      spotify_url: orNull(f.fid29),
      employer: orNull(f.fid35),
      degree: /ph\.?d/.test(degreeRaw) ? "phd" : /mba/.test(degreeRaw) ? "mba" : null,
      birthdate: bday ? `${bday[3]}-${bday[2].padStart(2, "0")}-${bday[1].padStart(2, "0")}` : null,
      skills: [...str(f.fid32).matchAll(/\[skill="([\s\S]*?)" percent="(\d+)[^"]*"\]/g)].map((m) => ({ name: decode(m[1]).trim(), value: Math.min(100, Number(m[2])) })),
      sliders: [...str(f.fid33).matchAll(/\[slider left="([\s\S]*?)" right="([\s\S]*?)" percent="(\d+)[^"]*"\]/g)].map((m) => ({
        left: decode(m[1]).trim(),
        right: decode(m[2]).trim(),
        value: Math.min(100, Number(m[3])),
      })),
      likes: traits(section(likesRaw, "likes")),
      dislikes: traits(section(likesRaw, "dislikes")),
      traits_plus: traits(section(traitsRaw, "plus")),
      traits_minus: traits(section(traitsRaw, "minus")),
      timeline: [...str(f.fid44).matchAll(/\[year="([\s\S]*?)" heading="([\s\S]*?)" text="([\s\S]*?)"\]/g)].map((m) => ({
        year: decode(m[1]).trim(),
        title: decode(m[2]).trim(),
        text: toRich(m[3]),
      })),
      scene_gif_url: /^https?:\/\//.test(str(f.fid26)) ? str(f.fid26) : null,
      signature_url: sigImg ? sigImg[1] : null,
      signature_text: !sigImg && toText(sig) ? toHtml(sig) : null,
    };
    for (const k of Object.keys(profile)) {
      const v = profile[k];
      if (v === null || (Array.isArray(v) && v.length === 0)) delete profile[k];
    }

    // Captic-Profil (früher Instaroid)
    const hasCaptic = !!str(f.fid4) || dump.instaroid_img.some((i) => i.uid === u.uid);
    const link = str(f.fid40);
    const captic = hasCaptic
      ? {
          enabled: true,
          handle: str(f.fid4) || slug(u.username ?? ""),
          display_name: orNull(f.fid38),
          bio: [toText(f.fid39), link].filter(Boolean).join("\n"),
          avatar: /^https?:\/\//.test(str(f.fid37)) ? str(f.fid37) : null,
          private: str(f.fid41).toLowerCase() === "ja",
        }
      : null;

    const age = Number.parseInt(str(f.fid7), 10);
    const shared = sharedNpcUids.has(u.uid!);
    const row: Row = {
      id,
      player_id: playerOfUid.get(u.uid!),
      name: str(u.username),
      faceclaim: orNull(f.fid30),
      faceclaim_image_url: avatar ? `${OLD_SITE}/${avatar.replace(/^\.?\//, "")}` : null,
      banner_url: /^https?:\/\//.test(str(f.fid6)) ? str(f.fid6) : null,
      tagline: orNull(u.usertitle),
      role: orNull(f.fid12),
      age: Number.isFinite(age) ? age : null,
      area,
      bio: toRich(f.fid13) || null,
      pinterest_url: orNull(f.fid16),
      created_at: iso(u.regdate),
      height: height(f.fid21),
      figure: orNull(f.fid22),
      hair: orNull(f.fid23),
      eyes: orNull(f.fid24),
      full_name: orNull(f.fid5),
      sexuality: orNull(f.fid11),
      status: orNull(f.fid10),
      origin: orNull(f.fid8),
      job: orNull(f.fid34) ?? orNull(f.fid12),
      company: orNull(f.fid35),
      quote: toRich(f.fid27) || null,
      personality: toRich(f.fid14) || null,
      relationships: {},
      is_npc: shared,
      npc_tier: shared ? "supporting" : null,
      co_owner_ids: shared ? ["p_abby"] : [],
      profile,
      phone: captic ? { captic } : null,
    };
    plainOf.set(id, {
      bio: toText(f.fid13) || null,
      quote: toText(f.fid27) || null,
      personality: toText(f.fid14) || null,
      looks_note: toText(f.fid25) || null,
      timeline: [...str(f.fid44).matchAll(/\[year="([\s\S]*?)" heading="([\s\S]*?)" text="([\s\S]*?)"\]/g)].map((m) => toText(m[3])),
      notes: {},
    });
    if (PROTECTED_CHARACTER_IDS.includes(id)) {
      protectedSkipped.push(`${u.username} [${id}]`);
      if (captic?.display_name) protectedDisplayNames.set(id, captic.display_name);
      if (!existing.characters.some((c) => c.id === id)) {
        warn(`Geschützter Charakter ${id} fehlt in der Datenbank – er wird trotzdem NICHT importiert; Verweise auf ihn würden scheitern.`);
      }
      continue;
    }
    characters.push(row);
  }
  const charRow = new Map(characters.map((c) => [c.id as string, c]));

  // Konten, die es nicht mehr gibt, aber Posts hinterlassen haben: Hüllen
  const ghostId = (uid: string | null, username: string | null): string => {
    const key = `ghost:${uid}:${username}`;
    if (charId.has(key)) return charId.get(key)!;
    const id = `c_gone_${slug(username ?? "") || `f${uid}`}`;
    charId.set(key, id);
    if (!charRow.has(id)) {
      const row: Row = {
        id,
        player_id: admin?.id ?? "p_tabs",
        name: str(username) || "Gelöschter Charakter",
        area: "eden",
        relationships: {},
        is_npc: false,
        co_owner_ids: [],
        created_at: iso(0),
        purged_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      };
      characters.push(row);
      charRow.set(id, row);
      warn(`Posts von nicht mehr vorhandenem Konto „${username}" (uid ${uid}) – als gelöschte Hülle ${id} angelegt.`);
    }
    return id;
  };
  const cid = (uid: string | null, username: string | null = null) => charId.get(uid ?? "") ?? ghostId(uid, username);

  // --- Relationen -------------------------------------------------------------
  let npcCount = 0;
  const protectedRelations = new Map<string, Row>();
  for (const r of dump.relationen) {
    if (r.ok !== "1") continue;
    const from = charId.get(r.anfrager ?? "");
    if (!from) continue;
    // Geschützte Charaktere: Ihre Zeile wird nicht geschrieben, die Relationen aus dem
    // Forum kommen aber dazu (nur die Spalte relationships, siehe unten beim Schreiben).
    let owner = charRow.get(from);
    if (!owner && PROTECTED_CHARACTER_IDS.includes(from)) {
      const live = existing.characters.find((c) => c.id === from);
      if (!live) continue;
      owner = protectedRelations.get(from) ?? { id: from, player_id: live.player_id, area: live.area, created_at: live.created_at, relationships: {} };
      protectedRelations.set(from, owner);
    }
    if (!owner) continue;
    let target = charId.get(r.angefragte ?? "");
    // als NPC eingetragen, aber inzwischen ein eigenes Konto
    if (!target) target = charId.get(users.find((u) => str(u.username).toLowerCase() === str(r.username).toLowerCase())?.uid ?? "");
    if (!target) {
      if (!str(r.username)) continue;
      target = `c_npc_f${r.rid}`;
      characters.push({
        id: target,
        player_id: owner.player_id,
        name: str(r.username),
        faceclaim_image_url: /^https?:\/\//.test(str(r.npc_wanted)) ? str(r.npc_wanted) : null,
        tagline: orNull(r.shortfacts),
        area: owner.area,
        relationships: {},
        is_npc: true,
        npc_tier: "extra",
        co_owner_ids: [],
        created_at: owner.created_at,
      });
      npcCount++;
    }
    const rel = owner.relationships as Record<string, { label?: string | null; note?: string | null; category?: string | null }>;
    const prev = rel[target];
    const note = toRich(r.description_wanted);
    const plain = plainOf.get(from) ?? { bio: null, quote: null, personality: null, looks_note: null, timeline: [], notes: {} };
    plain.notes[target] = [plain.notes[target], toText(r.description_wanted)].filter(Boolean).join("\n\n") || null;
    plainOf.set(from, plain);
    rel[target] = {
      label: [prev?.label, orNull(r.art)].filter(Boolean).join(" · ") || null,
      note: [prev?.note, note].filter(Boolean).join("\n\n") || null,
      category: RELATION_KAT[str(r.kat).toLowerCase()] ?? prev?.category ?? "acquainted",
    };
  }

  // --- Szenen, Posts, Chats, Anrufe -------------------------------------------
  const forums = new Map(dump.forums.map((f) => [f.fid, f]));
  const forumPath = (fid: string | null): string[] => {
    const out: string[] = [];
    let f = forums.get(fid);
    while (f) {
      out.unshift(str(f.name).toLowerCase());
      f = forums.get(f.pid);
    }
    return out;
  };
  const postsByThread = new Map<string, DumpRow[]>();
  for (const p of dump.posts) {
    if (p.visible !== "1") continue;
    (postsByThread.get(p.tid!) ?? postsByThread.set(p.tid!, []).get(p.tid!)!).push(p);
  }
  for (const list of postsByThread.values()) list.sort((a, b) => Number(a.dateline) - Number(b.dateline) || Number(a.pid) - Number(b.pid));
  const sceneInfo = new Map(dump.ipt_scenes.map((s) => [s.tid, s]));
  const partners = new Map<string, string[]>();
  for (const p of [...dump.ipt_scenes_partners].sort((a, b) => Number(a.spid) - Number(b.spid))) {
    (partners.get(p.tid!) ?? partners.set(p.tid!, []).get(p.tid!)!).push(p.uid!);
  }

  const existingLocName = new Map(existing.locations.map((l) => [String(l.name).toLowerCase(), l]));
  const locations = new Map<string, Row>();
  const scenes: Row[] = [];
  const posts: Row[] = [];
  const chats = new Map<string, Row>();
  const chatScenes: Row[] = [];
  const chatMessages: Row[] = [];
  const calls: Row[] = [];
  const postScene = new Map<string, string>(); // pid -> Szenen-ID (für Zitate)
  const skippedThreads: string[] = [];
  const noDate: string[] = [];

  for (const t of [...dump.threads].sort((a, b) => Number(a.tid) - Number(b.tid))) {
    const fp = forumPath(t.fid);
    const label = `„${t.subject}" (tid ${t.tid}, ${fp.join(" > ")})`;
    if (fp[0] !== "inplay" && fp[0] !== "archive") {
      skippedThreads.push(label);
      continue;
    }
    if (/ideen für spielorte/i.test(str(t.subject))) {
      skippedThreads.push(`${label} – Ideensammlung, keine Szene`);
      continue;
    }
    if (str(t.closed).startsWith("moved|")) continue; // nur ein Verweis auf den verschobenen Thread
    const tposts = postsByThread.get(t.tid!) ?? [];
    if (tposts.length === 0) {
      skippedThreads.push(`${label} – ohne Posts`);
      continue;
    }
    const archived = fp[0] === "archive";
    const inner = fp.filter((x) => x !== "inplay" && x !== "archive" && x !== "archiv");
    const info = sceneInfo.get(t.tid);
    const au = inner[0] === "alternate universe" || /alternate universe/i.test(str(info?.location));
    const status = archived || t.closed === "1" ? "closed" : "active";

    // Beteiligte: eingetragene Szenenpartner*innen, dann alle, die gepostet haben
    const people: string[] = [];
    for (const uid of partners.get(t.tid!) ?? []) {
      const id = charId.get(uid);
      if (id && !people.includes(id)) people.push(id);
    }
    for (const p of tposts) {
      const id = cid(p.uid, p.username);
      if (!people.includes(id)) people.push(id);
    }

    // Inplay-Datum (Mitternacht deutscher Zeit als Unix-Zeit)
    const sec = Number(info?.date ?? 0);
    let inplayDate: string;
    if (sec > 86400 || sec < -86400) inplayDate = berlinDate(new Date(sec * 1000));
    else {
      inplayDate = berlinDate(new Date(Number(t.dateline) * 1000));
      noDate.push(label);
    }
    const starter = cid(tposts[0].uid, tposts[0].username);
    const createdBy = (charRow.get(starter)?.player_id as string | undefined) ?? existing.characters.find((c) => c.id === starter)?.player_id ?? null;

    // ---- Messenger -> Chat + SMS-Szene ----
    if (inner[0] === "messengers") {
      const key = [...people].sort().join("+");
      const chatIdent = `chat_f_${slug(key).slice(0, 80)}`;
      const chat = chats.get(chatIdent) ?? {
        id: chatIdent,
        participant_ids: people,
        name: null,
        created_by: createdBy,
        created_at: iso(t.dateline),
        left_on_read: {},
        archived_by: [],
      };
      if (iso(t.dateline) < String(chat.created_at)) chat.created_at = iso(t.dateline);
      chats.set(chatIdent, chat);
      const sceneId = `sms_f${t.tid}`;
      chatScenes.push({
        id: sceneId,
        chat_id: chatIdent,
        title: decode(str(t.subject)),
        inplay_date: inplayDate,
        summary: toText(info?.shortdesc) || null,
        au,
        au_name: null,
        status,
        created_by: createdBy,
        created_at: iso(t.dateline),
      });
      let day = inplayDate;
      let last: string | null = null;
      for (const p of tposts) {
        const time = time24(p.ipposttime);
        // Uhrzeit springt zurück -> nach Mitternacht, also der nächste Tag
        if (time && last && time < last) day = addDays(day, 1);
        if (time) last = time;
        const base = { chat_id: chatIdent, character_id: cid(p.uid, p.username), reply_to: null, reactions: {}, inplay_time: time, inplay_date: day, scene_id: sceneId };
        const msg = emojiImages(str(p.message));
        const images = [...msg.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>|\[img[^\]]*\]([\s\S]*?)\[\/img\]/gi)].map((m) => str(m[1] ?? m[2]));
        const text = toText(msg.replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, ""));
        let n = 0;
        if (text) chatMessages.push({ ...base, id: `msg_f${p.pid}`, kind: "text", content: text, created_at: iso(p.dateline) });
        for (const src of images) {
          n++;
          chatMessages.push({
            ...base,
            id: `msg_f${p.pid}_i${n}`,
            kind: mediaKind(src) === "gif" ? "gif" : "image",
            content: src,
            created_at: new Date(Number(p.dateline) * 1000 + n).toISOString(),
          });
        }
      }
      continue;
    }

    // ---- Ort und Gegend ----
    let area = "eden";
    for (const name of inner) if (FORUM_AREA[name]) area = FORUM_AREA[name];
    let locName = str(info?.location).replace(/^alternate universe\s*-?\s*/i, "").trim();
    const isCall = inner[0] === "phone calls";
    if (isCall) {
      area = "phone";
      locName = "am Telefon";
    } else {
      const probe = locName.toLowerCase().replace(/[’`´]/g, "'");
      const hit = PLACES.find((p) => p.match.test(probe) && (!p.auOnly || au) && (!p.forum || inner.includes(p.forum)));
      if (hit) {
        area = hit.area;
        locName = hit.name;
        if (hit.place && !au) {
          const known = existingLocName.get(hit.name.toLowerCase());
          const id = (known?.id as string | undefined) ?? `loc_${hit.area}_${slug(hit.name)}`;
          if (!known || known.area !== hit.area) {
            locations.set(id, known ? { ...known, area: hit.area } : { id, area: hit.area, name: hit.name, description: null, created_at: iso(t.dateline), created_by: null });
          }
        }
      } else {
        // gleiche Schreibweise wie ein vorhandener Ort
        const known = existingLocName.get(probe);
        if (known && known.area === area) locName = String(known.name);
        // durchgehend groß oder klein geschrieben -> Wortanfänge groß
        else if (locName === locName.toUpperCase() || locName === locName.toLowerCase()) {
          locName = locName.toLowerCase().replace(/(^|[\s(\/&-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
          locName = locName.replace(/\b(Nc|Ny|Wg|Dc)\b/g, (m) => m.toUpperCase()).replace(/\bD\.c\./g, "D.C.");
        }
      }
    }

    const sceneId = `s_f${t.tid}`;
    scenes.push({
      id: sceneId,
      title: decode(str(t.subject)),
      location_area: area,
      location_name: locName,
      inplay_date: inplayDate,
      inplay_time: "",
      status,
      trigger_warning: false,
      created_at: iso(t.dateline),
      participant_ids: people,
      summary: toText(info?.shortdesc) || null,
      header_url: null,
      au,
      au_name: null,
      next_up: null,
      paused: false,
      draft: false,
    });
    tposts.forEach((p, i) => {
      postScene.set(p.pid!, sceneId);
      posts.push({
        id: `post_f${p.pid}`,
        scene_id: sceneId,
        character_id: cid(p.uid, p.username),
        content: toHtml(p.message),
        post_number: i + 1,
        created_at: iso(p.dateline),
      });
    });
    if (isCall && people.length >= 2) {
      calls.push({
        id: `call_f${t.tid}`,
        caller_id: starter,
        callee_id: people.find((x) => x !== starter),
        inplay_date: inplayDate,
        inplay_time: time24(tposts[0].ipposttime),
        status: "accepted",
        scene_id: sceneId,
        created_at: iso(t.dateline),
      });
    }
  }

  // --- Zitate -----------------------------------------------------------------
  const quotes: Row[] = [];
  for (const q of dump.inplayquotes) {
    const sceneId = postScene.get(q.pid ?? "");
    if (!sceneId) {
      warn(`Zitat ${q.qid} verweist auf einen Post, der nicht als Szenen-Post importiert wird – ausgelassen.`);
      continue;
    }
    quotes.push({ id: `q_f${q.qid}`, scene_id: sceneId, post_id: `post_f${q.pid}`, character_id: cid(q.uid), text: toText(q.quote), created_at: iso(q.timestamp) });
  }

  // --- Captic -----------------------------------------------------------------
  const capticPosts: Row[] = [];
  for (const i of dump.instaroid_img) {
    const owner = charId.get(i.uid ?? "");
    if (!owner) continue;
    const ts = /_(\d{9,10})\./.exec(str(i.name))?.[1];
    capticPosts.push({
      id: `cap_f${i.iid}`,
      character_id: owner,
      kind: mediaKind(str(i.name)),
      url: `${OLD_SITE}/uploads/instaroid/${str(i.name)}`,
      poster_url: null,
      ar: null,
      caption: toText(i.desc),
      likes: 0,
      liked_by: [],
      inplay_date: deDate(i.date),
      location: orNull(i.location),
      created_at: ts ? iso(ts) : new Date(Date.UTC(2022, 0, 1) + Number(i.iid) * 1000).toISOString(),
    });
  }
  const capticById = new Map(capticPosts.map((p) => [p.id as string, p]));
  const capticComments: Row[] = [];
  for (const c of dump.instaroid_comments) {
    const post = capticById.get(`cap_f${c.iid}`);
    const who = charId.get(c.uid ?? "");
    if (!post || !who) continue;
    capticComments.push({
      id: `capc_f${c.icd}`,
      post_id: post.id,
      character_id: who,
      content: toText(c.desc),
      created_at: new Date(new Date(String(post.created_at)).getTime() + Number(c.icd) * 1000).toISOString(),
    });
  }
  const capticHighlights: Row[] = [];
  for (const h of dump.instaroid_highlights) {
    const owner = charId.get(h.owner ?? "");
    if (!owner) continue;
    const items = dump.instaroid_stories
      .filter((s) => s.highlight === h.hiid && /^https?:\/\//.test(str(s.image)))
      .sort((a, b) => Number(a.stid) - Number(b.stid))
      .map((s) => ({ id: `story_f${s.stid}`, kind: mediaKind(str(s.image)), url: str(s.image), ar: null, caption: "", inplay_date: deDate(s.date) }));
    capticHighlights.push({
      id: `caph_f${h.hiid}`,
      character_id: owner,
      name: decode(str(h.name)),
      cover_url: /^https?:\/\//.test(str(h.image)) ? str(h.image) : null,
      items,
      created_at: new Date(Date.UTC(2022, 0, 1) + Number(h.hiid) * 1000).toISOString(),
    });
  }

  return {
    players: [...players.values()],
    characters,
    locations: [...locations.values()],
    scenes,
    posts,
    quotes,
    chats: [...chats.values()],
    chat_scenes: chatScenes,
    chat_messages: chatMessages,
    calls,
    captic_posts: capticPosts,
    captic_comments: capticComments,
    captic_highlights: capticHighlights,
    // Relationen geschützter Charaktere: id -> relationships aus dem Forum
    protectedRelations: [...protectedRelations.values()].map((r) => ({ id: r.id as string, relationships: r.relationships as Record<string, unknown> })),
    protectedDisplayNames: [...protectedDisplayNames.entries()],
    plainOf,
    info: { protectedSkipped, skippedThreads, noDate, npcCount },
  };
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

async function requireBackup() {
  const names = await fs.readdir(BACKUP_ROOT).catch(() => [] as string[]);
  let newest = 0;
  for (const name of names) {
    try {
      const m = JSON.parse(await fs.readFile(path.join(BACKUP_ROOT, name, "manifest.json"), "utf8"));
      if (m.projectRef === projectRef && m.complete === true) newest = Math.max(newest, new Date(m.createdAt).getTime());
    } catch {
      /* kein Sicherungsordner */
    }
  }
  if (!newest || Date.now() - newest > 24 * 36e5) {
    throw new Error("Keine vollständige Sicherung dieser Datenbank aus den letzten 24 Stunden. Zuerst: npm run backup-db");
  }
}

async function upsert(table: string, rows: Row[], size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict: "id" });
    if (error) {
      if (isMissingTable(error)) throw new Error(`Tabelle ${table} fehlt in dieser Datenbank – zuerst die SQL-Dateien einspielen.`);
      throw new Error(`${table}: ${error.message}`);
    }
  }
  console.log(`✓ ${table}: ${rows.length}`);
}

async function main() {
  const dumpFile = option("dump");
  if (!dumpFile) throw new Error('Bitte den Dump angeben: --dump="/pfad/zum/backup.sql"');
  const APPLY = flag("apply");
  const RICHTEXT = flag("richtext");
  console.log(`→ Import ${APPLY ? "" : "(Probelauf) "}aus ${path.basename(dumpFile)}`);
  console.log(`  nach ${url} (${envFile})`);

  const dump = readDump(dumpFile, [
    "users", "userfields", "forums", "threads", "posts", "ipt_scenes", "ipt_scenes_partners", "inplayquotes",
    "relationen", "instaroid_img", "instaroid_comments", "instaroid_stories", "instaroid_highlights",
  ]);
  const existing: Existing = {
    players: await fetchAll("players"),
    characters: await fetchAll("characters"),
    locations: await fetchAll("locations"),
  };
  const out = build(dump, existing);

  // --- Bericht ------------------------------------------------------------------
  const tables = ["players", "characters", "locations", "scenes", "posts", "quotes", "chats", "chat_scenes", "chat_messages", "calls", "captic_posts", "captic_comments", "captic_highlights"] as const;
  console.log("\nWird geschrieben:");
  for (const t of tables) console.log(`  ${t.padEnd(18)} ${out[t].length}`);
  console.log(`\nSpieler*innen:`);
  for (const p of out.players) {
    const mine = out.characters.filter((c) => c.player_id === p.id && !c.is_npc && !c.purged_at).length;
    const state = existing.players.some((e) => e.id === p.id) ? "vorhanden" : "neu";
    console.log(`  ${String(p.username).padEnd(8)} ${String(p.email).padEnd(32)} ${mine} Charaktere (${state})`);
  }
  console.log(`\nGeschützt, nicht geschrieben: ${out.info.protectedSkipped.join(", ") || "–"}`);
  for (const r of out.protectedRelations) {
    const live = (existing.characters.find((c) => c.id === r.id)?.relationships as Record<string, unknown> | null) ?? {};
    const kept = Object.keys(r.relationships).filter((k) => k in live);
    console.log(`  ${r.id}: ${Object.keys(r.relationships).length} Relationen aus dem Forum kommen dazu${kept.length ? ` (schon im neuen Profil, bleibt wie es ist: ${kept.join(", ")})` : ""}`);
  }
  console.log(`Statist*innen aus Relationen: ${out.info.npcCount}`);
  console.log(`Neue bzw. umgezogene Orte: ${out.locations.map((l) => `${l.name} (${l.area})`).join(", ") || "–"}`);
  console.log(`\nNicht übernommene Threads (${out.info.skippedThreads.length}):`);
  for (const s of out.info.skippedThreads) console.log(`  · ${s}`);
  if (out.info.noDate.length) {
    console.log(`\nOhne Inplay-Datum – ersatzweise das Datum, an dem der Thread erstellt wurde (${out.info.noDate.length}):`);
    for (const s of out.info.noDate) console.log(`  · ${s}`);
  }
  if (warnings.length) {
    console.log(`\nHinweise (${warnings.length}):`);
    for (const w of warnings) console.log(`  ⚠️  ${w}`);
  }

  // --richtext: nur die freien Profiltexte mit HTML nachziehen (der erste Import hatte
  // sie als reinen Text geschrieben). Angefasst wird ein Feld nur, wenn es noch genau
  // so in der Datenbank steht, wie der erste Import es geschrieben hat.
  const richPatches: { id: string; patch: Row; fields: string[] }[] = [];
  const richSkipped: string[] = []; // seit dem Import von Hand geändert – bleibt
  if (RICHTEXT) {
    const sources = [...out.characters, ...out.protectedRelations.map((r) => ({ ...r, _relationsOnly: true }))] as Row[];
    for (const next of sources) {
      const live = existing.characters.find((c) => c.id === next.id);
      const plain = out.plainOf.get(String(next.id));
      if (!live || !plain) continue;
      const patch: Row = {};
      const fields: string[] = [];
      if (!next._relationsOnly) {
        for (const k of ["bio", "quote", "personality"] as const) {
          if (next[k] && next[k] !== live[k] && live[k] === plain[k]) {
            patch[k] = next[k];
            fields.push(k);
          } else if (next[k] && next[k] !== live[k] && next[k] !== plain[k]) {
            richSkipped.push(`${next.id}.${k}`);
          }
        }
        const lp = (live.profile as Row | null) ?? {};
        const np = (next.profile as Row | null) ?? {};
        const profile: Row = { ...lp };
        if (np.looks_note && np.looks_note !== lp.looks_note && lp.looks_note === plain.looks_note) {
          profile.looks_note = np.looks_note;
          fields.push("looks_note");
        }
        const lt = (lp.timeline as { text: string }[] | undefined) ?? [];
        const nt = (np.timeline as { text: string }[] | undefined) ?? [];
        if (lt.length === nt.length && lt.some((e, i) => e.text !== nt[i].text && e.text === plain.timeline[i])) {
          profile.timeline = lt.map((e, i) => (e.text === plain.timeline[i] ? { ...e, text: nt[i].text } : e));
          fields.push("timeline");
        }
        if (fields.includes("looks_note") || fields.includes("timeline")) patch.profile = profile;
      }
      const lr = (live.relationships as Record<string, { note?: string | null }> | null) ?? {};
      const nr = (next.relationships as Record<string, { note?: string | null }> | null) ?? {};
      const rel = { ...lr };
      let relChanged = false;
      for (const [target, entry] of Object.entries(nr)) {
        if (lr[target] && entry.note && entry.note !== lr[target].note && lr[target].note === plain.notes[target]) {
          rel[target] = { ...lr[target], note: entry.note };
          relChanged = true;
        }
      }
      if (relChanged) {
        patch.relationships = rel;
        fields.push("relations");
      }
      if (fields.length) richPatches.push({ id: String(next.id), patch, fields });
    }
    console.log(`\nHTML in Profiltexten nachziehen (${richPatches.length} Charaktere):`);
    for (const p of richPatches) console.log(`  ${p.id.padEnd(16)} ${p.fields.join(", ")}`);
    if (richSkipped.length) console.log(`  Seit dem Import geändert, bleibt unangetastet: ${richSkipped.join(", ")}`);
  }

  if (!APPLY) {
    const dir = path.join(BACKUP_ROOT, `import-preview_${stamp()}_${projectRef}`);
    await fs.mkdir(dir, { recursive: true });
    for (const t of tables) await fs.writeFile(path.join(dir, `${t}.json`), JSON.stringify(out[t], null, 1));
    console.log(`\nProbelauf – nichts geschrieben. Vorschau: ${dir}`);
    return;
  }

  await requireBackup();
  if (RICHTEXT) {
    for (const p of richPatches) {
      const { error } = await db.from("characters").update(p.patch).eq("id", p.id);
      if (error) throw new Error(`characters (${p.id}): ${error.message}`);
    }
    console.log(`✅ ${richPatches.length} Charaktere aktualisiert. Als Nächstes: npm run migrate-images (Bilder in den Texten)`);
    return;
  }
  const phrase = `IMPORT ${projectRef}`;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nZum Bestätigen exakt eintippen: ${phrase}\n> `);
  rl.close();
  if (answer.trim() !== phrase) {
    console.log("Nicht bestätigt – nichts geschrieben.");
    return;
  }

  // Spieler*innen: vorhandene Zeilen behalten Login, Freischaltung und Admin-Flag;
  // neue warten auf die Registrierung (ohne Login, nicht freigeschaltet).
  const { data: authList, error: authErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authErr) throw new Error(`Logins: ${authErr.message}`);
  for (const p of out.players) {
    const before = existing.players.find((e) => e.id === p.id);
    const row = { username: p.username, email: p.email, created_at: p.created_at };
    if (!before) {
      const { error } = await db.from("players").insert({ id: p.id, ...row, approved: false });
      if (error) throw new Error(`players (${p.username}): ${error.message}`);
      continue;
    }
    // Test-Login (…@example.com) lösen: sonst zöge die App die E-Mail beim nächsten
    // Test-Login wieder auf die Testadresse zurück und die Registrierung mit der
    // echten Adresse fände die Zeile nicht.
    const login = authList.users.find((a) => a.id === before.auth_user_id);
    if (login && /@example\.com$/i.test(login.email ?? "") && String(p.email).toLowerCase() !== (login.email ?? "").toLowerCase()) {
      const { error } = await db.auth.admin.deleteUser(login.id);
      if (error) console.warn(`  Test-Login ${login.email} ließ sich nicht löschen: ${error.message}`);
      else console.log(`  Test-Login ${login.email} entfernt (${p.username} registriert sich mit ${p.email} neu)`);
    }
    const { error } = await db.from("players").update(row).eq("id", p.id);
    if (error) throw new Error(`players (${p.username}): ${error.message}`);
  }
  console.log(`✓ players: ${out.players.length}`);

  // Sicherheitsnetz: geschützte Charaktere dürfen in keiner Schreibliste stehen
  const forbidden = out.characters.filter((c) => PROTECTED_CHARACTER_IDS.includes(String(c.id)));
  if (forbidden.length) throw new Error(`Geschützte Charaktere in der Schreibliste: ${forbidden.map((c) => c.id).join(", ")} – Abbruch.`);

  // Orte: vorhandene ziehen nur in die neue Gegend um, neue werden angelegt
  const knownLocs = new Set(existing.locations.map((l) => l.id));
  for (const l of out.locations.filter((x) => knownLocs.has(x.id))) {
    const { error } = await db.from("locations").update({ area: l.area }).eq("id", l.id);
    if (error) throw new Error(`locations (${l.name}): ${error.message}`);
  }
  await upsert(
    "locations",
    out.locations.filter((x) => !knownLocs.has(x.id)).map((l) => ({ id: l.id, area: l.area, name: l.name, description: null, created_at: l.created_at, created_by: null })),
  );
  // PostgREST verlangt je Stapel gleiche Schlüssel und füllt fehlende sonst mit null
  // (was an Spalten mit Vorgabewert scheitert) – daher nach Spaltensatz gruppiert.
  const groups = new Map<string, Row[]>();
  for (const c of out.characters) {
    const clean = Object.fromEntries(Object.entries(c).filter(([k, v]) => v !== null || !["profile", "phone"].includes(k)));
    const sig = Object.keys(clean).sort().join(",");
    (groups.get(sig) ?? groups.set(sig, []).get(sig)!).push(clean);
  }
  for (const rows of groups.values()) await upsert("characters", rows);
  // Geschützte Charaktere: nur die Relationen aus dem Forum ergänzen. Was im neuen
  // Profil schon zu einem Charakter eingetragen ist, bleibt und geht vor.
  for (const r of out.protectedRelations) {
    const live = existing.characters.find((c) => c.id === r.id);
    const merged = { ...r.relationships, ...((live?.relationships as Record<string, unknown> | null) ?? {}) };
    const { error } = await db.from("characters").update({ relationships: merged }).eq("id", r.id);
    if (error) throw new Error(`characters (${r.id}, Relationen): ${error.message}`);
    console.log(`✓ ${r.id}: ${Object.keys(r.relationships).length} Relationen aus dem Forum ergänzt (sonst unverändert)`);
  }
  // … und den Captic-Anzeigenamen, falls das neue Profil Captic nutzt und keinen hat
  for (const [id, name] of out.protectedDisplayNames) {
    const phone = existing.characters.find((c) => c.id === id)?.phone as { captic?: { enabled?: boolean; display_name?: string | null } } | null;
    if (!phone?.captic?.enabled || phone.captic.display_name) continue;
    const { error } = await db.from("characters").update({ phone: { ...phone, captic: { ...phone.captic, display_name: name } } }).eq("id", id);
    if (error) throw new Error(`characters (${id}, Captic-Anzeigename): ${error.message}`);
    console.log(`✓ ${id}: Captic-Anzeigename „${name}" ergänzt`);
  }
  await upsert("scenes", out.scenes);
  await upsert("posts", out.posts, 100);
  await upsert("quotes", out.quotes);
  await upsert("chats", out.chats);
  await upsert("chat_scenes", out.chat_scenes);
  await upsert("chat_messages", out.chat_messages);
  await upsert("calls", out.calls);
  await upsert("captic_posts", out.captic_posts);
  await upsert("captic_comments", out.captic_comments);
  await upsert("captic_highlights", out.captic_highlights);
  console.log("✅ Import fertig. Als Nächstes: npm run migrate-images");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
