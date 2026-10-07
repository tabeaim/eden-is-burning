/**
 * Bilder-Umzug in Supabase Storage (Bucket „images"):
 *   1. Bilder, die noch als Data-URL (Text) in der Datenbank stehen
 *   2. Bilder von fremden Adressen (edenisburning.de/uploads/…, imgur, abload, ibb,
 *      GIPHY usw.) – sie werden heruntergeladen, in den Storage kopiert und die
 *      Verweise ersetzt
 *
 * Durchsucht werden alle Tabellen der App: Bildfelder (Avatare, Banner, Header,
 * Galerien, Messenger- und Captic-Bilder, Handy-Einstellungen …) und Bilder, die in
 * Texten stecken (<img src>, CSS url(…), [img]…[/img], nackte Bildadressen in Posts,
 * Bios und Signaturen).
 *
 *   npm run migrate-images -- --dry-run   nur zählen, was umziehen würde
 *   npm run migrate-images                umziehen
 *   npm run migrate-images -- --env=.env.stage
 *
 * Nicht mehr erreichbare Bilder brechen den Lauf nicht ab: Der alte Verweis bleibt
 * stehen und landet im Protokoll backups/migrate-images_<Datum>_<Projekt>.json.
 * Idempotent: Bereits umgezogene Bilder werden übersprungen; ein zweiter Lauf
 * versucht nur die fehlgeschlagenen erneut.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BACKUP_ROOT, BUCKET, TABLES, db, envFile, fetchAll, flag, isMissingTable, projectRef, stamp, url } from "./env";

const DRY = flag("dry-run");
const TIMEOUT_MS = 30_000;
const MAX_BYTES = 50 * 1024 * 1024;

// Tabellen mit Bildern oder Texten (read_marks, calls, quotes, captic_events haben keine)
const SCAN_TABLES = [
  "players",
  "characters",
  "locations",
  "scenes",
  "posts",
  "post_drafts",
  "npcs",
  "plots",
  "chats",
  "chat_scenes",
  "chat_messages",
  "captic_posts",
  "captic_stories",
  "captic_comments",
  "app_settings",
];

// Felder, die Links sind und keine Bilder (bleiben, wie sie sind)
const LINK_KEYS = new Set(["pinterest_url", "spotify_url", "path", "email"]);
// Seiten, von denen nie kopiert wird (Links, Einbettungen)
const SKIP_HOSTS = /(^|\.)(pinterest\.[a-z.]+|pin\.it|spotify\.com|youtube\.com|youtu\.be|vimeo\.com|soundcloud\.com)$/i;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg|mp4|webm)(?=$|[?#])/i;

const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex").slice(0, 20);
const isOwn = (u: string) => u.startsWith(`${url}/storage/`);

interface Failure {
  url: string;
  reason: string;
  where: string[];
}
const moved = new Map<string, string>(); // alte Adresse -> neue Adresse
const failed = new Map<string, Failure>();
const notImages = new Set<string>(); // Adresse liefert kein Bild (z.B. eine Webseite)
const candidates = new Map<string, number>(); // nur Probelauf: Host -> Anzahl

async function upload(bytes: Buffer, type: string, filePath: string): Promise<string> {
  const { error } = await db.storage.from(BUCKET).upload(filePath, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Upload: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

// Data-URL -> Storage. Der Dateiname ergibt sich aus dem Inhalt (gleiches Bild = gleiche Datei).
async function moveDataUrl(dataUrl: string, where: string): Promise<string | null> {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  if (DRY) {
    candidates.set("(Data-URL)", (candidates.get("(Data-URL)") ?? 0) + 1);
    return null;
  }
  try {
    const type = m[1];
    const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
    return await upload(bytes, type, `migrated/${sha(bytes)}.${EXT[type] ?? "bin"}`);
  } catch (e) {
    const key = `data:${sha(dataUrl)}`;
    failed.set(key, { url: "(Data-URL)", reason: e instanceof Error ? e.message : String(e), where: [where] });
    return null;
  }
}

// Fremde Adresse -> Storage. `sure`: Das Feld ist eindeutig ein Bildfeld; dann gilt
// „kein Bild" als Fehler, sonst ist es schlicht ein gewöhnlicher Link.
async function moveRemote(raw: string, where: string, sure: boolean): Promise<string | null> {
  // Ausschnitt-Anhang der Header („#y=…", lib/headers.ts) bleibt am neuen Verweis
  const hashAt = raw.indexOf("#");
  const base = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const suffix = hashAt >= 0 ? raw.slice(hashAt) : "";
  // In HTML stehen & als &amp;
  const fetchUrl = base.replace(/&amp;/g, "&");

  let host: string;
  try {
    host = new URL(fetchUrl).hostname;
  } catch {
    return null;
  }
  if (isOwn(fetchUrl) || SKIP_HOSTS.test(host) || host === "localhost") return null;

  if (moved.has(fetchUrl)) return moved.get(fetchUrl)! + suffix;
  if (notImages.has(fetchUrl)) return null;
  const known = failed.get(fetchUrl);
  if (known) {
    known.where.push(where);
    return null;
  }
  if (DRY) {
    candidates.set(host, (candidates.get(host) ?? 0) + 1);
    moved.set(fetchUrl, fetchUrl); // jede Adresse nur einmal zählen
    return null;
  }

  const fail = (reason: string) => {
    failed.set(fetchUrl, { url: fetchUrl, reason, where: [where] });
    console.warn(`  ✗ ${fetchUrl} – ${reason}`);
    return null;
  };
  try {
    const res = await fetch(fetchUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,video/*;q=0.9,*/*;q=0.5",
      },
    });
    if (!res.ok) return fail(`nicht erreichbar (HTTP ${res.status})`);
    // Manche Hoster liefern für gelöschte Bilder ein Platzhalterbild aus
    if (/\/removed\.(png|jpg|gif)$/i.test(new URL(res.url).pathname)) return fail("beim Hoster gelöscht (Platzhalterbild)");
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!type.startsWith("image/") && !type.startsWith("video/")) {
      if (sure) return fail(`kein Bild (${type || "unbekannter Typ"})`);
      notImages.add(fetchUrl);
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0) return fail("leere Datei");
    if (bytes.length > MAX_BYTES) return fail(`zu groß (${(bytes.length / 1e6).toFixed(0)} MB)`);
    const ext = EXT[type] ?? (IMAGE_EXT.exec(new URL(fetchUrl).pathname)?.[1].toLowerCase() || "bin");
    const publicUrl = await upload(bytes, type, `migrated/${host}/${sha(fetchUrl)}.${ext}`);
    moved.set(fetchUrl, publicUrl);
    return publicUrl + suffix;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(/timeout|aborted/i.test(msg) ? "Zeitüberschreitung" : `nicht erreichbar (${msg})`);
  }
}

// Adressen innerhalb eines Texts (HTML, BBCode, CSS)
const URL_IN_TEXT = /https?:\/\/[^\s"'<>()\[\]\\]+/g;
const DATA_IN_TEXT = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
// Steht direkt davor, ist es sicher ein Bild
const IMAGE_CONTEXT = /(?:\b(?:src|poster|background)\s*=\s*["']?|url\(\s*["']?|\[img[^\]]*\])$/i;

async function transformText(text: string, where: string): Promise<string> {
  let out = text;
  for (const m of [...text.matchAll(DATA_IN_TEXT)]) {
    const next = await moveDataUrl(m[0], where);
    if (next) out = out.split(m[0]).join(next);
  }
  for (const m of [...text.matchAll(URL_IN_TEXT)]) {
    // Satzzeichen am Ende gehören nicht zur Adresse
    const found = m[0].replace(/[.,;:!?]+$/, "");
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    const sure = IMAGE_CONTEXT.test(before);
    if (!sure && !IMAGE_EXT.test(found)) continue;
    const next = await moveRemote(found, where, sure);
    if (next) out = out.split(found).join(next);
  }
  return out;
}

// Ein Wert aus der Datenbank: Text, Liste oder verschachteltes JSON
async function transform(value: unknown, key: string, where: string, row: Record<string, unknown>): Promise<unknown> {
  if (typeof value === "string") {
    if (LINK_KEYS.has(key)) return value;
    if (value.startsWith("data:")) return (await moveDataUrl(value, where)) ?? value;
    if (/^https?:\/\/\S+$/.test(value)) {
      // Ein Feld, das nur aus einer Adresse besteht. Sicher ein Bild, wenn der
      // Feldname es sagt oder es eine Bild-/GIF-Nachricht ist.
      const sure =
        /(_url|avatar|image|images|photo|icon|wallpaper|poster|header|banner|gif|src)$/i.test(key) ||
        (key === "content" && (row.kind === "gif" || row.kind === "image")) ||
        (key === "url" && typeof row.kind === "string");
      return (await moveRemote(value, where, sure || IMAGE_EXT.test(value))) ?? value;
    }
    if (value.includes("http") || value.includes("data:image/")) return transformText(value, where);
    return value;
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const v of value) next.push(await transform(v, key, where, row));
    return next;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) next[k] = await transform(v, k, `${where}.${k}`, row);
    return next;
  }
  return value;
}

async function migrateTable(table: string) {
  const pk = TABLES[table];
  let rows: Record<string, unknown>[];
  try {
    rows = await fetchAll(table);
  } catch (e) {
    if (isMissingTable(e as { code?: string; message?: string })) {
      console.log(`– ${table}: gibt es in dieser Datenbank nicht`);
      return;
    }
    throw e;
  }
  let changedRows = 0;
  for (const row of rows) {
    const id = pk.map((c) => row[c]).join("/");
    const patch: Record<string, unknown> = {};
    for (const [column, value] of Object.entries(row)) {
      if (pk.includes(column) || value === null) continue;
      const next = await transform(value, column, `${table}/${id}/${column}`, row);
      if (JSON.stringify(next) !== JSON.stringify(value)) patch[column] = next;
    }
    if (Object.keys(patch).length === 0 || DRY) continue;
    let q = db.from(table).update(patch);
    for (const c of pk) q = q.eq(c, row[c] as string);
    const { error } = await q;
    if (error) {
      failed.set(`row:${table}/${id}`, { url: "(Zeile speichern)", reason: error.message, where: [`${table}/${id}`] });
      console.warn(`  ✗ ${table}/${id}: ${error.message}`);
    } else changedRows++;
  }
  console.log(`✓ ${table}: ${rows.length} Zeilen geprüft${DRY ? "" : `, ${changedRows} geändert`}`);
}

async function main() {
  console.log(`→ Bilder-Umzug ${DRY ? "(Probelauf) " : ""}in ${url} (${envFile})`);
  for (const table of SCAN_TABLES) await migrateTable(table);

  if (DRY) {
    const list = [...candidates.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\nWürde umziehen: ${list.reduce((n, [, c]) => n + c, 0)} Bilder`);
    for (const [host, n] of list) console.log(`  ${String(n).padStart(5)}  ${host}`);
    console.log("Probelauf – nichts geändert.");
    return;
  }

  const failures = [...failed.values()];
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  const logFile = path.join(BACKUP_ROOT, `migrate-images_${stamp()}_${projectRef}.json`);
  await fs.writeFile(
    logFile,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        supabaseUrl: url,
        moved: [...moved.entries()].map(([from, to]) => ({ from, to })),
        failed: failures,
      },
      null,
      1,
    ),
  );
  console.log(`\n✓ ${moved.size} Bilder umgezogen, ${failures.length} nicht erreichbar bzw. fehlgeschlagen`);
  console.log(`  Protokoll: ${logFile}`);
  console.log(failures.length ? "⚠️  Fertig – die alten Verweise der fehlgeschlagenen Bilder stehen unverändert in der Datenbank." : "✅ Fertig.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
