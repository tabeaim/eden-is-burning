/**
 * Liest ein MyBB-Datenbank-Backup (.sql aus dem Admin-CP) und gibt die Zeilen der
 * gewünschten Tabellen zurück. Kein MySQL nötig – die INSERT-Zeilen werden direkt
 * gelesen. Zugangsdaten der Forum-Konten (Passwort, Salt, Login-Schlüssel) werden
 * dabei verworfen und nie weitergereicht.
 */
import fs from "node:fs";

export type DumpRow = Record<string, string | null>;

const SECRET_COLUMNS = new Set(["password", "salt", "loginkey", "regip", "lastip", "ipaddress"]);

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", "0": "\0", Z: "\x1a", b: "\b" };

export function readDump(file: string, wanted: string[], prefix = "mybb_"): Record<string, DumpRow[]> {
  const text = fs.readFileSync(file, "utf8");
  const out: Record<string, DumpRow[]> = Object.fromEntries(wanted.map((t) => [t, []]));
  const start = /^INSERT INTO `?([A-Za-z0-9_]+)`? \(([^)]*)\) VALUES \(/gm;
  let m: RegExpExecArray | null;
  while ((m = start.exec(text))) {
    const table = m[1].startsWith(prefix) ? m[1].slice(prefix.length) : m[1];
    const columns = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    // Werte lesen: '…' mit Backslash-Maskierung oder ein nacktes Wort (NULL, Zahl)
    let i = start.lastIndex;
    const values: (string | null)[] = [];
    for (;;) {
      if (text[i] === "'") {
        let s = "";
        i++;
        for (;;) {
          const c = text[i];
          if (c === undefined) throw new Error(`Unerwartetes Dateiende in ${table}`);
          if (c === "\\") {
            const n = text[i + 1];
            s += ESCAPES[n] ?? n;
            i += 2;
          } else if (c === "'") {
            if (text[i + 1] === "'") {
              s += "'";
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            s += c;
            i++;
          }
        }
        values.push(s);
      } else {
        let j = i;
        while (text[j] !== "," && text[j] !== ")") j++;
        const word = text.slice(i, j).trim();
        values.push(word.toUpperCase() === "NULL" ? null : word);
        i = j;
      }
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === ")") break;
      throw new Error(`Unlesbare Zeile in ${table} bei Zeichen ${i}`);
    }
    start.lastIndex = i;
    if (!out[table]) continue;
    const row: DumpRow = {};
    columns.forEach((c, k) => {
      if (!SECRET_COLUMNS.has(c)) row[c] = values[k] ?? null;
    });
    out[table].push(row);
  }
  return out;
}
