/**
 * Gemeinsamer Unterbau der Datenbank-Skripte: liest die Zugangsdaten und baut den
 * Service-Role-Client (umgeht Row Level Security – nur lokal verwenden!).
 *
 * Standard ist .env.local (zeigt auf die LIVE-Datenbank). Für Stage eine eigene
 * Datei anlegen und angeben:  npm run backup-db -- --env=.env.stage
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

export const args = process.argv.slice(2);
export const flag = (name: string) => args.includes(`--${name}`);
export const option = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;

export const envFile = option("env") ?? ".env.local";
config({ path: path.resolve(process.cwd(), envFile), quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(`❌ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in ${envFile} gesetzt sein.`);
  process.exit(1);
}

export const url: string = supabaseUrl.replace(/\/+$/, "");
export const key: string = serviceKey;
// Projekt-Kennung, z.B. „orpotzcxprcohqunlkgh" aus https://orpotzcxprcohqunlkgh.supabase.co
export const projectRef = new URL(url).hostname.split(".")[0];
export const db = createClient(url, key, { auth: { persistSession: false } });

export const BUCKET = "images";
export const BACKUP_ROOT = path.resolve(process.cwd(), "backups");
export const ADMIN_EMAIL = "tabeaim@gmail.com";

// Geschützte Charaktere: Ihr Profil wurde in der neuen App neu ausgefüllt und darf
// weder geleert (wipe-db) noch vom Forum-Import überschrieben werden (import-mybb
// überspringt ihre characters-Zeile; Szenen, Posts usw. verweisen trotzdem darauf).
export const PROTECTED_CHARACTER_IDS = ["c_irina"];

// Alle Tabellen der App mit ihren Schlüsselspalten. backup-db fragt die Liste
// zusätzlich bei der Datenbank ab, damit auch später ergänzte Tabellen gesichert werden.
export const TABLES: Record<string, string[]> = {
  players: ["id"],
  characters: ["id"],
  locations: ["id"],
  scenes: ["id"],
  posts: ["id"],
  post_drafts: ["id"],
  quotes: ["id"],
  npcs: ["id"],
  plots: ["id"],
  chats: ["id"],
  chat_scenes: ["id"],
  chat_messages: ["id"],
  calls: ["id"],
  read_marks: ["player_id", "item_id"],
  app_settings: ["key"],
  captic_posts: ["id"],
  captic_comments: ["id"],
  captic_stories: ["id"],
  captic_events: ["id"],
  captic_highlights: ["id"],
};

// Fehlt eine Tabelle in dieser Datenbank (Migration noch nicht eingespielt)?
export const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /could not find the table|does not exist/i.test(e.message ?? ""));

// Liest eine Tabelle vollständig (seitenweise, in fester Reihenfolge).
export async function fetchAll(table: string, pk: string[] = TABLES[table] ?? []): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    let q = db.from(table).select("*");
    for (const col of pk) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + size - 1);
    if (error) throw Object.assign(new Error(`${table}: ${error.message}`), { code: error.code });
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < size) break;
  }
  return rows;
}

// „2026-10-08_1430" – Ordner- und Dateinamen der Sicherungen
export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
