// Drehbuch-Format: reduzierte Darstellung einer Szene (v.a. Anrufe). Ein Post
// besteht aus Zeilen – Regieanweisungen und Dialog. Der Post-Text (`content`)
// ist dann JSON statt HTML; `parseScript` erkennt das.
import type { Scene } from "./types";

export type ScriptLine =
  | { k: "dir"; text: string } // Regieanweisung
  // Dialog: `who` = Charakter-ID (auch Nebenfiguren, die nicht Teil der Szene
  // sind), sonst ein frei eingetragener Name; `tone` = wie es klingt (z. B. „verschlafen")
  | { k: "line"; who?: string | null; name?: string | null; tone?: string | null; text: string };

export const isScript = (scene: Pick<Scene, "format"> | null | undefined) => scene?.format === "script";

export function parseScript(content: string | null | undefined): ScriptLine[] | null {
  if (!content?.startsWith('{"script":')) return null;
  try {
    const lines = (JSON.parse(content) as { script: unknown }).script;
    return Array.isArray(lines) ? (lines as ScriptLine[]) : null;
  } catch {
    return null;
  }
}

// Leere Zeilen fallen beim Speichern weg; ohne Inhalt bleibt "" (nichts zu senden)
export function serializeScript(lines: ScriptLine[]): string {
  const kept = lines
    .map((l): ScriptLine => {
      if (l.k !== "line") return { ...l, text: l.text.trim() };
      const { tone, ...rest } = l;
      const t = tone?.trim();
      return { ...rest, ...(t ? { tone: t } : {}), text: l.text.trim() };
    })
    .filter((l) => l.text);
  return kept.length ? JSON.stringify({ script: kept }) : "";
}

// Als reiner Text (Kopieren): „(Regie)" bzw. „Name (Klang): Text"
export function scriptPlain(lines: ScriptLine[], nameOf: (line: ScriptLine & { k: "line" }) => string): string {
  return lines.map((l) => (l.k === "dir" ? `(${l.text})` : `${nameOf(l)}${l.tone ? ` (${l.tone})` : ""}: ${l.text}`)).join("\n");
}
