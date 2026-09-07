/**
 * Schreibt die Seed-Daten als JSON-Dateien (KEIN Netzwerk) in ein Zielverzeichnis.
 * Wird von scripts/seed-curl.sh genutzt, um sie per curl hochzuladen —
 * umgeht so Netzwerk-Probleme mancher Node-HTTP-Stacks.
 *
 *   npx tsx scripts/export-seed.ts <zielordner>
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  seedPlayers,
  seedCharacters,
  seedScenes,
  seedPosts,
  seedLocations,
  seedQuotes,
} from "../lib/mock-data";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Nutzung: tsx scripts/export-seed.ts <zielordner>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const tables: Record<string, Record<string, unknown>[]> = {
  players: seedPlayers() as unknown as Record<string, unknown>[],
  characters: seedCharacters() as unknown as Record<string, unknown>[],
  locations: seedLocations() as unknown as Record<string, unknown>[],
  scenes: seedScenes() as unknown as Record<string, unknown>[],
  posts: seedPosts() as unknown as Record<string, unknown>[],
  quotes: seedQuotes() as unknown as Record<string, unknown>[],
};

// PostgREST-Bulk-Insert verlangt, dass alle Objekte identische Schlüssel haben.
// Wir bilden pro Tabelle die Vereinigung aller Schlüssel und füllen fehlende
// Felder auf: NOT-NULL-Spalten mit ihrem Default, alle anderen mit null.
const NOT_NULL_DEFAULT: Record<string, unknown> = {
  relationships: {},
  participant_ids: [],
};

function normalize(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = r[k] ?? (k in NOT_NULL_DEFAULT ? NOT_NULL_DEFAULT[k] : null);
    }
    return out;
  });
}

for (const [name, rows] of Object.entries(tables)) {
  const normalized = normalize(rows);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(normalized));
  console.log(`${name}.json (${normalized.length})`);
}
