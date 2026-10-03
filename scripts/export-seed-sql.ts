/**
 * Schreibt die Beispieldaten aus lib/mock-data.ts als SQL-Datei (KEIN Netzwerk),
 * zum Ausführen im Supabase SQL-Editor eines leeren Projekts (Stage).
 *
 *   npx tsx scripts/export-seed-sql.ts            → supabase/stage-seed.sql
 */
import { writeFileSync } from "node:fs";
import {
  seedPlayers,
  seedCharacters,
  seedScenes,
  seedPosts,
  seedLocations,
  seedQuotes,
} from "../lib/mock-data";

type Row = Record<string, unknown>;

const players = seedPlayers() as unknown as Row[];
// Reihenfolge nach Fremdschlüssel-Abhängigkeiten
const tables: [string, Row[]][] = [
  ["players", players],
  ["characters", seedCharacters() as unknown as Row[]],
  ["locations", seedLocations() as unknown as Row[]],
  ["scenes", seedScenes() as unknown as Row[]],
  ["posts", seedPosts() as unknown as Row[]],
  ["quotes", seedQuotes() as unknown as Row[]],
];

// Nur Spalten einfügen, die in den Daten vorkommen – alle anderen behalten
// ihren Default. NOT-NULL-Spalten ohne Wert bekommen ihren Default explizit.
const NOT_NULL_DEFAULT: Record<string, unknown> = {
  relationships: {},
  participant_ids: [],
};

function normalize(rows: Row[]): { cols: string[]; rows: Row[] } {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  const cols = [...keys];
  return {
    cols,
    rows: rows.map((r) => {
      const out: Row = {};
      for (const k of cols) {
        out[k] = r[k] ?? (k in NOT_NULL_DEFAULT ? NOT_NULL_DEFAULT[k] : null);
      }
      return out;
    }),
  };
}

let sql = `-- Testdaten für ein leeres Stage-Projekt (erzeugt aus lib/mock-data.ts,
-- siehe scripts/export-seed-sql.ts). Im Supabase SQL-Editor von „eden stage"
-- ausführen (Run). NICHT in der Live-DB.
-- Wiederholbar: vorhandene Einträge (gleiche id) bleiben unverändert.
-- Charaktere hängen an dem Spieler-Eintrag mit derselben E-Mail – der eigene
-- Stage-Account bekommt so die Charaktere des gleichnamigen Beispiel-Spielers.

begin;
`;

for (const [table, raw] of tables) {
  const { cols, rows } = normalize(raw);
  const json = JSON.stringify(rows, null, 1);
  if (json.includes("$seed$")) throw new Error(`$seed$ kommt in ${table} vor`);

  let select = cols.map((c) => `r.${c}`);
  let where = "";
  if (table === "players") {
    // Existiert schon ein Eintrag mit gleicher id/E-Mail/Name, bleibt er bestehen.
    where =
      "\nwhere not exists (\n  select 1 from players p\n  where p.id = r.id or lower(p.email) = lower(r.email) or lower(p.username) = lower(r.username)\n)";
  }
  if (table === "characters") {
    const cases = players
      .map((p) => `when '${p.id}' then '${String(p.email).toLowerCase()}'`)
      .join(" ");
    select = cols.map((c) =>
      c === "player_id"
        ? `coalesce((select p.id from players p where lower(p.email) = case r.player_id ${cases} end limit 1), r.player_id)`
        : `r.${c}`,
    );
  }

  sql += `\n-- ${table} (${rows.length})\ninsert into ${table} (${cols.join(", ")})\nselect ${select.join(", ")}\nfrom jsonb_populate_recordset(null::${table}, $seed$${json}$seed$::jsonb) r${where}\non conflict (id) do nothing;\n`;
  console.log(`${table}: ${rows.length}`);
}

sql += "\ncommit;\n";
writeFileSync("supabase/stage-seed.sql", sql);
console.log("→ supabase/stage-seed.sql");
