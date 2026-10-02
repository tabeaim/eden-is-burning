/**
 * Einmaliger Umzug: Bilder, die noch als Data-URL (Text) in der Datenbank stehen,
 * in Supabase Storage (Bucket "images") verschieben und durch ihre Adresse ersetzen.
 *
 *   1. supabase/schema-storage.sql im Supabase SQL-Editor ausführen
 *   2. npm run migrate-images
 *
 * Idempotent: bereits umgezogene Bilder (http-Adressen) werden übersprungen.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = "images";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// Lädt eine Data-URL hoch und gibt die öffentliche Adresse zurück.
async function moveDataUrl(dataUrl: string, folder: string, id: string, n = 0): Promise<string> {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) throw new Error("unlesbare Data-URL");
  const type = m[1];
  const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  const path = `${folder}/${id}${n ? `-${n}` : ""}.${EXT[type] ?? "bin"}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const isData = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:");

async function migrateColumn(table: string, column: string, folder: string) {
  const { data, error } = await db.from(table).select(`id, ${column}`);
  if (error) {
    console.warn(`– ${table}.${column}: übersprungen (${error.message})`);
    return;
  }
  let moved = 0;
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const value = row[column];
    if (!isData(value)) continue;
    const publicUrl = await moveDataUrl(value, folder, String(row.id));
    const { error: upErr } = await db.from(table).update({ [column]: publicUrl }).eq("id", row.id);
    if (upErr) throw new Error(`${table}.${column} (${row.id}): ${upErr.message}`);
    moved++;
  }
  console.log(`✓ ${table}.${column}: ${moved} Bild(er) umgezogen`);
}

// Orte: Vibes-Fotos stehen als Liste in locations.images
async function migrateLocationGalleries() {
  const { data, error } = await db.from("locations").select("id, images");
  if (error) {
    console.warn(`– locations.images: übersprungen (${error.message})`);
    return;
  }
  let moved = 0;
  for (const row of (data ?? []) as { id: string; images: unknown }[]) {
    const images = Array.isArray(row.images) ? (row.images as unknown[]) : [];
    if (!images.some(isData)) continue;
    const next: unknown[] = [];
    for (let i = 0; i < images.length; i++) {
      const v = images[i];
      if (isData(v)) {
        next.push(await moveDataUrl(v, "locations", row.id, i + 1));
        moved++;
      } else next.push(v);
    }
    const { error: upErr } = await db.from("locations").update({ images: next }).eq("id", row.id);
    if (upErr) throw new Error(`locations.images (${row.id}): ${upErr.message}`);
  }
  console.log(`✓ locations.images: ${moved} Bild(er) umgezogen`);
}

async function main() {
  console.log("→ Bilder-Umzug nach", url);
  await migrateColumn("players", "avatar_url", "avatars");
  await migrateColumn("players", "dashboard_header_url", "dashboards");
  await migrateColumn("characters", "faceclaim_image_url", "characters");
  await migrateColumn("characters", "banner_url", "characters-banner");
  await migrateColumn("scenes", "header_url", "scenes");
  await migrateColumn("locations", "image_url", "locations-banner");
  await migrateLocationGalleries();
  console.log("✅ Fertig.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
