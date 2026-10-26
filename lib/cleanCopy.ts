// Kopieren für Word, Pages & Co.: aus dem angezeigten Post nur Absätze, Kursiv und
// Fett übernehmen – keine Schriftart, Größe oder Farbe aus dem Forum, sondern
// Schwarz und die eingestellte Kopier-Schrift (siehe unten).
// Auf Wunsch stehen die Hervorhebungen stattdessen als sichtbare Tags im Text.
// Kursiv/Fett wird an der Darstellung abgelesen (getComputedStyle), damit auch
// Stellen zählen, die im Forum per Stilangabe statt per <i>/<em> gesetzt waren.

import { escapeHtml } from "./format";

type Run = { text: string; i: boolean; b: boolean; u: boolean; s: boolean };

// Schrift, Größe und Farbe fürs Zieldokument (Einstellungen → Darstellung), nur
// auf diesem Gerät. Pages nimmt ohne Angabe Times und färbt den Text im dunklen
// Modus weiß – daher ohne eigene Wahl immer Schwarz.
export const COPY_FONT_KEY = "eden:copy-font";
export const COPY_SIZE_KEY = "eden:copy-size";
export const COPY_COLOR_KEY = "eden:copy-color";
export const COPY_DEFAULT_COLOR = "#000000";
// Formatierung als sichtbare HTML-Tags in den Text schreiben („<i>Wort</i>") –
// Standard; nur ein ausdrückliches „0" (Schalter aus) schaltet es ab
export const COPY_TAGS_KEY = "eden:copy-tags";

export function copyAsTags(): boolean {
  try {
    return localStorage.getItem(COPY_TAGS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function copyFont(): { font: string; size: string; color: string } {
  try {
    return {
      font: localStorage.getItem(COPY_FONT_KEY) ?? "",
      size: localStorage.getItem(COPY_SIZE_KEY) ?? "",
      color: localStorage.getItem(COPY_COLOR_KEY) ?? "",
    };
  } catch {
    return { font: "", size: "", color: "" };
  }
}

// Der HTML-Import von macOS/iOS (Pages, TextEdit, Notizen) liest CSS-„px" als
// Punkt und rechnet „pt" in px um – 11pt käme dort als 14,7 an. Auf Apple-Geräten
// daher die Größe als px angeben, sonst (Word unter Windows) als pt.
function appleImport(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

function paraStyle(): string {
  const { font, size, color } = copyFont();
  const name = font.replace(/["';{}<>]/g, "").trim();
  const pt = Number(size.replace(",", "."));
  return [
    `color: ${/^#[0-9a-f]{6}$/i.test(color) ? color : COPY_DEFAULT_COLOR}`,
    name ? `font-family: '${name}'` : "",
    pt > 0 && pt < 100 ? `font-size: ${pt}${appleImport() ? "px" : "pt"}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const BLOCK = /^(block|list-item|table|table-row|table-cell|flex|grid)$/;

export function cleanCopy(root: HTMLElement, range?: Range | null): { html: string; text: string } {
  const paras: (Run[] | null)[] = []; // null = Leerzeile
  let cur: Run[] = [];
  let brs = 0; // Umbrüche seit dem letzten Text
  const baseWeight = Number(getComputedStyle(root).fontWeight) || 400;

  const endPara = () => {
    if (cur.some((r) => r.text.trim())) paras.push(cur);
    cur = [];
  };
  const flushBreaks = () => {
    if (brs === 0) return;
    endPara();
    if (brs >= 2 && paras.length) paras.push(null);
    brs = 0;
  };

  const walk = (node: Node) => {
    if (range && !range.intersectsNode(node)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent ?? "";
      if (range) {
        if (node === range.endContainer) text = text.slice(0, range.endOffset);
        if (node === range.startContainer) text = text.slice(range.startOffset);
      }
      if (!text) return;
      if (!text.trim() && cur.length === 0) return; // Einrückungs-Leerraum am Absatzanfang
      flushBreaks();
      const parent = node.parentElement ?? root;
      const st = getComputedStyle(parent);
      // Unter-/Durchstreichung erbt sich nicht im berechneten Stil – Vorfahren prüfen
      let u = false;
      let s = false;
      for (let el: HTMLElement | null = parent; el && root.contains(el); el = el.parentElement) {
        const line = getComputedStyle(el).textDecorationLine;
        if (line.includes("underline")) u = true;
        if (line.includes("line-through")) s = true;
        if (el === root) break;
      }
      cur.push({
        text: text.replace(/\s+/g, " "),
        i: st.fontStyle === "italic" || st.fontStyle.startsWith("oblique"),
        b: (Number(st.fontWeight) || 400) >= Math.max(600, baseWeight + 200),
        u,
        s,
      });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      brs++;
      return;
    }
    const st = getComputedStyle(node);
    if (st.display === "none") return;
    const block = BLOCK.test(st.display);
    if (block) {
      brs = 0;
      endPara();
    }
    for (const child of Array.from(node.childNodes)) walk(child);
    if (block) {
      brs = 0;
      endPara();
    }
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  endPara();
  while (paras.length && paras[paras.length - 1] === null) paras.pop();

  // Nachbarstücke mit gleicher Formatierung zusammenlegen (sonst „<i>a</i><i>b</i>")
  const same = (a: Run, b: Run) => a.i === b.i && a.b === b.b && a.u === b.u && a.s === b.s;
  const merged = paras.map((p) => {
    if (!p) return p;
    const out: Run[] = [];
    for (const r of p) {
      const last = out[out.length - 1];
      if (last && same(last, r)) last.text += r.text;
      else out.push({ ...r });
    }
    if (out.length) {
      out[0].text = out[0].text.trimStart();
      out[out.length - 1].text = out[out.length - 1].text.trimEnd();
    }
    return out;
  });

  // Leerzeichen am Rand bleiben außerhalb der Tags: „<i>Wort</i> " statt „<i>Wort </i>"
  const wrap = (r: Run, open: (t: string) => string, close: (t: string) => string, body: string) => {
    const tags = (["b", "i", "u", "s"] as const).filter((t) => r[t]);
    if (!tags.length || !body.trim()) return body;
    const [, lead, core, trail] = body.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    return lead + tags.map(open).join("") + core + [...tags].reverse().map(close).join("") + trail;
  };
  const asTags = copyAsTags();
  // Sichtbare Tags: im Text steht „<i>“ – im HTML also maskiert
  const runHtml = (r: Run) =>
    asTags
      ? escapeHtml(wrap(r, (t) => `<${t}>`, (t) => `</${t}>`, r.text))
      : wrap(r, (t) => `<${t}>`, (t) => `</${t}>`, escapeHtml(r.text));
  const runText = (r: Run) => (asTags ? wrap(r, (t) => `<${t}>`, (t) => `</${t}>`, r.text) : r.text);

  const style = escapeHtml(paraStyle()).replace(/"/g, "&quot;");
  const html = merged
    .map((p) => `<p style="${style}">${p ? p.map(runHtml).join("") : "&nbsp;"}</p>`)
    .join("");
  const text = merged.map((p) => (p ? p.map(runText).join("") : "")).join("\n");
  return { html, text };
}
