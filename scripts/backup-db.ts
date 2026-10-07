/**
 * Sichert den gesamten Stand der Datenbank: jede Tabelle als JSON und alle Bilder aus
 * dem Storage-Bucket „images". Liest nur, ändert nichts.
 *
 *   npm run backup-db                      (Datenbank aus .env.local = LIVE)
 *   npm run backup-db -- --env=.env.stage  (andere Datenbank)
 *   npm run backup-db -- --no-images       (nur die Tabellen)
 *
 * Ergebnis: backups/<Datum_Uhrzeit>_<Projekt>/
 *   tables/<tabelle>.json   alle Zeilen
 *   auth-users.json         Logins (ID, E-Mail, Zeitpunkte – keine Passwörter)
 *   storage/images/…        die Bilddateien
 *   manifest.json           Zeilenzahlen; „complete": true erst, wenn alles geklappt hat
 *
 * Der Ordner backups/ steht in .gitignore und landet nicht auf GitHub.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { BACKUP_ROOT, BUCKET, TABLES, db, envFile, fetchAll, flag, isMissingTable, key, projectRef, stamp, url } from "./env";

// Fragt die Datenbank nach allen Tabellen und ihren Schlüsselspalten; die feste
// Liste aus env.ts bleibt als Grundlage, falls die Abfrage nicht möglich ist.
async function discoverTables(): Promise<Record<string, string[]>> {
  const tables: Record<string, string[]> = { ...TABLES };
  try {
    const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const spec = (await res.json()) as {
      definitions?: Record<string, { properties?: Record<string, { description?: string }> }>;
    };
    for (const [name, def] of Object.entries(spec.definitions ?? {})) {
      if (tables[name]) continue;
      tables[name] = Object.entries(def.properties ?? {})
        .filter(([, p]) => (p.description ?? "").includes("<pk/>"))
        .map(([col]) => col);
      console.log(`  (zusätzliche Tabelle gefunden: ${name})`);
    }
  } catch (e) {
    console.warn(`  Tabellenliste nicht abfragbar (${e instanceof Error ? e.message : e}) – nutze die feste Liste.`);
  }
  return tables;
}

async function listStorage(prefix = ""): Promise<{ path: string; size: number }[]> {
  const out: { path: string; size: number }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Storage (${prefix || "/"}): ${error.message}`);
    for (const entry of data ?? []) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Ordner haben keine ID
      if (entry.id === null) out.push(...(await listStorage(full)));
      else out.push({ path: full, size: Number((entry.metadata as { size?: number } | null)?.size ?? 0) });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  const dir = path.join(BACKUP_ROOT, `${stamp()}_${projectRef}`);
  console.log(`→ Sicherung von ${url} (${envFile})`);
  console.log(`  nach ${dir}`);
  await fs.mkdir(path.join(dir, "tables"), { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl: url,
    projectRef,
    tables: {} as Record<string, number>,
    missingTables: [] as string[],
    authUsers: 0,
    storage: { files: 0, bytes: 0, failed: [] as { path: string; reason: string }[], skipped: flag("no-images") },
    complete: false,
  };
  const writeManifest = () => fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeManifest();

  // --- Tabellen ---------------------------------------------------------------
  const tables = await discoverTables();
  for (const [table, pk] of Object.entries(tables)) {
    try {
      const rows = await fetchAll(table, pk);
      await fs.writeFile(path.join(dir, "tables", `${table}.json`), JSON.stringify(rows, null, 1));
      manifest.tables[table] = rows.length;
      console.log(`✓ ${table}: ${rows.length} Zeilen`);
    } catch (e) {
      if (isMissingTable(e as { code?: string; message?: string })) {
        manifest.missingTables.push(table);
        console.log(`– ${table}: gibt es in dieser Datenbank nicht`);
      } else throw e;
    }
  }

  // --- Logins (ohne Passwörter; für die Zuordnung players.auth_user_id) -------
  const users: Record<string, unknown>[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Logins: ${error.message}`);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        user_metadata: u.user_metadata,
      })),
    );
    if (data.users.length < 1000) break;
  }
  await fs.writeFile(path.join(dir, "auth-users.json"), JSON.stringify(users, null, 1));
  manifest.authUsers = users.length;
  console.log(`✓ Logins: ${users.length}`);

  // --- Bilder -----------------------------------------------------------------
  if (!flag("no-images")) {
    const files = await listStorage();
    console.log(`→ ${files.length} Dateien im Bucket „${BUCKET}"`);
    let done = 0;
    for (const file of files) {
      try {
        const { data, error } = await db.storage.from(BUCKET).download(file.path);
        if (error || !data) throw new Error(error?.message ?? "leer");
        const target = path.join(dir, "storage", BUCKET, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        const bytes = Buffer.from(await data.arrayBuffer());
        await fs.writeFile(target, bytes);
        manifest.storage.files++;
        manifest.storage.bytes += bytes.length;
      } catch (e) {
        manifest.storage.failed.push({ path: file.path, reason: e instanceof Error ? e.message : String(e) });
      }
      if (++done % 50 === 0) console.log(`  ${done}/${files.length} …`);
    }
    console.log(`✓ Bilder: ${manifest.storage.files} geladen (${(manifest.storage.bytes / 1e6).toFixed(1)} MB)`);
    for (const f of manifest.storage.failed) console.warn(`  ✗ ${f.path}: ${f.reason}`);
  }

  manifest.complete = manifest.storage.failed.length === 0;
  await writeManifest();
  if (!manifest.complete) {
    console.error("⚠️  Sicherung unvollständig: Einige Bilder ließen sich nicht laden (siehe manifest.json). Bitte erneut ausführen.");
    process.exit(1);
  }
  console.log(`✅ Sicherung vollständig: ${dir}`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
