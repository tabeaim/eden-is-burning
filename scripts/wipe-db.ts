/**
 * Leert die Test-Inhalte der Datenbank vor dem Import aus dem alten Forum.
 * LÖSCHT DATEN – läuft nur mit ausdrücklicher Bestätigung und nur, wenn es eine
 * vollständige, höchstens 24 Stunden alte Sicherung derselben Datenbank gibt
 * (npm run backup-db).
 *
 *   npm run wipe-db                 Probelauf: zeigt nur, was gelöscht würde
 *   npm run wipe-db -- --confirm    löscht, nach Eintippen der Bestätigungszeile
 *
 * Was bleibt:
 *   · die Spielerin tabeaim@gmail.com samt Admin-Flag und Login-Verknüpfung
 *   · der Charakter „Irina" mit seinem ganzen Profil (und die Spieler*in dazu)
 *   · Spieler*innen mit echtem Login (nicht @example.com) – ihre Zeile und ihr Login
 *   · Orte (locations), App-Einstellungen (app_settings) und alle Bilder im Storage
 *
 * Schalter:
 *   --keep-character=Name   anderer bzw. weiterer Charakter, der bleibt (mehrfach möglich;
 *                           Standard: Irina). Trifft der Name nicht genau einen Charakter,
 *                           bricht das Skript ab.
 *   --all-players           auch Spieler*innen mit echtem Login löschen (samt Login)
 *   --with-locations        auch die Orte leeren
 *   --env=.env.stage        andere Datenbank als die aus .env.local
 */
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { ADMIN_EMAIL, BACKUP_ROOT, PROTECTED_CHARACTER_IDS, args, db, envFile, fetchAll, flag, isMissingTable, projectRef, url } from "./env";

const MAX_BACKUP_AGE_H = 24;

// Reihenfolge nach Fremdschlüsseln: erst was auf anderes verweist. Die zweite Angabe
// ist eine Pflichtspalte, über die sich „alle Zeilen" ansprechen lassen.
const CONTENT_TABLES: [string, string][] = [
  ["captic_events", "id"],
  ["captic_highlights", "id"],
  ["captic_comments", "id"],
  ["captic_stories", "id"],
  ["captic_posts", "id"],
  ["calls", "id"],
  ["chat_messages", "id"],
  ["chat_scenes", "id"],
  ["chats", "id"],
  ["post_drafts", "id"],
  ["quotes", "id"],
  ["posts", "id"],
  ["scenes", "id"],
  ["plots", "id"],
  ["npcs", "id"],
  ["read_marks", "player_id"],
];

type Row = Record<string, unknown>;

async function count(table: string): Promise<number | null> {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

// Jüngste vollständige Sicherung dieser Datenbank
async function findBackup(): Promise<{ dir: string; manifest: { createdAt: string; tables: Record<string, number> } }> {
  let names: string[] = [];
  try {
    names = await fs.readdir(BACKUP_ROOT);
  } catch {
    /* kein Ordner */
  }
  const found: { dir: string; manifest: { createdAt: string; tables: Record<string, number> } }[] = [];
  for (const name of names) {
    try {
      const dir = path.join(BACKUP_ROOT, name);
      const m = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
      if (m.projectRef === projectRef && m.complete === true && m.storage?.skipped !== true) found.push({ dir, manifest: m });
    } catch {
      /* kein Sicherungsordner */
    }
  }
  found.sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt));
  const latest = found[0];
  if (!latest) {
    throw new Error(`Keine vollständige Sicherung (mit Bildern) von ${projectRef} in backups/ gefunden. Zuerst: npm run backup-db`);
  }
  const ageH = (Date.now() - new Date(latest.manifest.createdAt).getTime()) / 36e5;
  if (ageH > MAX_BACKUP_AGE_H) {
    throw new Error(`Die jüngste Sicherung (${path.basename(latest.dir)}) ist älter als ${MAX_BACKUP_AGE_H} Stunden. Zuerst: npm run backup-db`);
  }
  return latest;
}

const inList = (ids: string[]) => `(${ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",")})`;

async function main() {
  console.log(`→ Datenbank: ${url} (${envFile})`);
  const backup = await findBackup();
  console.log(`✓ Sicherung: ${path.basename(backup.dir)}`);

  // --- Was bleibt? --------------------------------------------------------------
  const players = (await fetchAll("players")) as Row[];
  const characters = (await fetchAll("characters")) as Row[];

  const admin = players.find((p) => String(p.email).toLowerCase() === ADMIN_EMAIL);
  if (!admin) throw new Error(`Spieler*in ${ADMIN_EMAIL} nicht gefunden – Abbruch.`);

  const keepNames = args.filter((a) => a.startsWith("--keep-character=")).map((a) => a.slice("--keep-character=".length));
  if (keepNames.length === 0) keepNames.push("Irina");
  const keepChars: Row[] = [];
  for (const name of keepNames) {
    const hits = characters.filter((c) => {
      const n = String(c.name ?? "").toLowerCase();
      return n === name.toLowerCase() || n.startsWith(name.toLowerCase() + " ");
    });
    if (hits.length !== 1) {
      throw new Error(
        `„${name}" trifft ${hits.length} Charaktere${hits.length ? ` (${hits.map((c) => `${c.name} [${c.id}]`).join(", ")})` : ""} – erwartet genau einen. Abbruch, nichts gelöscht.`,
      );
    }
    keepChars.push(hits[0]);
  }
  // Geschützte Charaktere (env.ts) bleiben immer, egal was beim Aufruf angegeben wurde
  for (const id of PROTECTED_CHARACTER_IDS) {
    const c = characters.find((x) => x.id === id);
    if (c && !keepChars.includes(c)) keepChars.push(c);
  }
  // Der Charakter muss auch in der Sicherung stecken
  const backedUp = JSON.parse(await fs.readFile(path.join(backup.dir, "tables", "characters.json"), "utf8")) as Row[];
  for (const c of keepChars) {
    if (!backedUp.some((b) => b.id === c.id)) throw new Error(`${c.name} fehlt in der Sicherung – bitte neu sichern. Abbruch.`);
  }

  const keepCharIds = keepChars.map((c) => String(c.id));
  const keepPlayerIds = new Set<string>([String(admin.id), ...keepChars.map((c) => String(c.player_id))]);
  if (!flag("all-players")) {
    for (const p of players) {
      const email = String(p.email ?? "").toLowerCase();
      if (p.auth_user_id && !email.endsWith("@example.com") && !p.deleted_at) keepPlayerIds.add(String(p.id));
    }
  }
  const dropPlayers = players.filter((p) => !keepPlayerIds.has(String(p.id)));
  const tables = [...CONTENT_TABLES];
  if (flag("with-locations")) tables.push(["locations", "id"]);

  // --- Plan ---------------------------------------------------------------------
  console.log("\nWird geleert:");
  for (const [table] of tables) {
    const n = await count(table);
    console.log(`  ${table.padEnd(16)} ${n === null ? "(gibt es nicht)" : `${n} Zeilen`}`);
  }
  console.log(`  ${"characters".padEnd(16)} ${characters.length - keepCharIds.length} von ${characters.length} Zeilen`);
  console.log(`  ${"players".padEnd(16)} ${dropPlayers.length} von ${players.length} Zeilen: ${dropPlayers.map((p) => p.username).join(", ") || "–"}`);
  const dropLogins = dropPlayers.filter((p) => p.auth_user_id);
  if (dropLogins.length) console.log(`  Logins           ${dropLogins.length} (${dropLogins.map((p) => p.email).join(", ")})`);
  console.log("\nBleibt:");
  console.log(`  Charaktere: ${keepChars.map((c) => `${c.name} [${c.id}]`).join(", ")}`);
  console.log(`  Spieler*innen: ${players.filter((p) => keepPlayerIds.has(String(p.id))).map((p) => p.username).join(", ")}`);
  console.log(`  ${flag("with-locations") ? "" : "locations, "}app_settings, Storage-Bilder`);

  if (!flag("confirm")) {
    console.log("\nProbelauf – nichts gelöscht. Zum Ausführen: npm run wipe-db -- --confirm");
    return;
  }
  const phrase = `LEEREN ${projectRef}`;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nDas lässt sich nicht rückgängig machen. Zum Bestätigen exakt eintippen: ${phrase}\n> `);
  rl.close();
  if (answer.trim() !== phrase) {
    console.log("Nicht bestätigt – nichts gelöscht.");
    return;
  }

  // --- Leeren -------------------------------------------------------------------
  for (const [table, col] of tables) {
    const { error } = await db.from(table).delete().not(col, "is", null);
    if (error && !isMissingTable(error)) throw new Error(`${table}: ${error.message}`);
    console.log(`✓ ${table} geleert`);
  }
  {
    const { error } = await db.from("characters").delete().not("id", "in", inList(keepCharIds));
    if (error) throw new Error(`characters: ${error.message}`);
    console.log("✓ characters geleert");
  }
  for (const p of dropPlayers) {
    const { error } = await db.from("players").delete().eq("id", p.id);
    if (error) throw new Error(`players (${p.username}): ${error.message}`);
    // Login mit entfernen, damit sich die E-Mail später neu registrieren kann
    if (p.auth_user_id) {
      const { error: authErr } = await db.auth.admin.deleteUser(String(p.auth_user_id));
      if (authErr) console.warn(`  Login von ${p.email} ließ sich nicht löschen: ${authErr.message}`);
    }
  }
  console.log(`✓ players: ${dropPlayers.length} gelöscht`);

  // --- Nachprüfen ---------------------------------------------------------------
  const { data: adminNow } = await db.from("players").select("id, is_admin, approved, auth_user_id").eq("id", admin.id).maybeSingle();
  const adminOk = adminNow && adminNow.is_admin === admin.is_admin && adminNow.auth_user_id === admin.auth_user_id;
  console.log(adminOk ? `✓ ${ADMIN_EMAIL}: Admin-Flag und Login unverändert` : `⚠️  ${ADMIN_EMAIL}: bitte prüfen – Zeile hat sich verändert!`);
  for (const c of keepChars) {
    const { data: now } = await db.from("characters").select("*").eq("id", c.id).maybeSingle();
    const same = now && JSON.stringify(now) === JSON.stringify(c);
    console.log(same ? `✓ ${c.name}: Profil unverändert` : `⚠️  ${c.name}: bitte prüfen – Zeile weicht ab (Sicherung: ${path.basename(backup.dir)})`);
  }
  console.log("✅ Fertig.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
