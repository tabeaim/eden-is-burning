/**
 * Einmaliges Seeding der Supabase-Datenbank mit den vorhandenen Beispieldaten
 * aus lib/mock-data.ts.
 *
 *   1. supabase/schema.sql im Supabase SQL-Editor ausführen
 *   2. .env.local anlegen (siehe .env.local.example) — inkl. SUPABASE_SERVICE_ROLE_KEY
 *   3. npm run seed
 *
 * Idempotent: nutzt upsert, kann also gefahrlos erneut laufen.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  seedPlayers,
  seedCharacters,
  seedScenes,
  seedPosts,
  seedLocations,
  seedQuotes,
} from "../lib/mock-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein.",
  );
  process.exit(1);
}

// Service-Role-Client umgeht Row Level Security — nur lokal verwenden!
const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function upsert<T extends { id: string }>(table: string, rows: T[]) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    console.error(`❌ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${table}: ${rows.length} Einträge`);
}

async function main() {
  console.log("→ Seeding nach", url);
  // Reihenfolge nach Fremdschlüssel-Abhängigkeiten
  await upsert("players", seedPlayers());
  await upsert("characters", seedCharacters());
  await upsert("locations", seedLocations());
  await upsert("scenes", seedScenes());
  await upsert("posts", seedPosts());
  await upsert("quotes", seedQuotes());
  console.log("✅ Fertig.");
}

main();
