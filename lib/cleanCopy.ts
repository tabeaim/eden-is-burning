// Kopieren für Word, Pages & Co.: aus dem angezeigten Post nur Absätze, Kursiv und
// Fett übernehmen – keine Schriftart, Größe oder Farbe aus dem Forum, sondern
// Schwarz und die eingestellte Kopier-Schrift (siehe unten).
// Kursiv/Fett wird an der Darstellung abgelesen (getComputedStyle), damit auch
// Stellen zählen, die im Forum per Stilangabe statt per <i>/<em> gesetzt waren.

import { escapeHtml } from "./format";

type Run = { text: string; i: boolean; b: boolean };

// Schrift fürs Zieldokument (Einstellungen → Darstellung), nur auf diesem Gerät.
// Pages nimmt ohne Angabe Times und färbt den Text im dunklen Modus weiß –
// daher immer Schwarz und, wenn eingestellt, die eigene Schrift mitgeben.
export const COPY_FONT_KEY = "eden:copy-font";
export const COPY_SIZE_KEY = "eden:copy-size";

export function copyFont(): { font: string; size: string } {
  try {
    return {
      font: localStorage.getItem(COPY_FONT_KEY) ?? "",
      size: localStorage.getItem(COPY_SIZE_KEY) ?? "",
    };
  } catch {
    return { font: "", size: "" };
  }
}

function paraStyle(): string {
  const { font, size } = copyFont();
  const name = font.replace(/["';{}<>]/g, "").trim();
  const pt = Number(size.replace(",", "."));
  return [
    "color: #000000",
    name ? `font-family: '${name}'` : "",
    pt > 0 && pt < 100 ? `font-size: ${pt}pt` : "",
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
      const st = getComputedStyle(node.parentElement ?? root);
      cur.push({
        text: text.replace(/\s+/g, " "),
        i: st.fontStyle === "italic" || st.fontStyle.startsWith("oblique"),
        b: (Number(st.fontWeight) || 400) >= Math.max(600, baseWeight + 200),
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

  const runHtml = (r: Run) => {
    let h = escapeHtml(r.text);
    if (r.b) h = `<b>${h}</b>`;
    if (r.i) h = `<i>${h}</i>`;
    return h;
  };
  const style = escapeHtml(paraStyle()).replace(/"/g, "&quot;");
  const html = paras
    .map((p) => `<p style="${style}">${p ? p.map(runHtml).join("").trim() : "&nbsp;"}</p>`)
    .join("");
  const text = paras.map((p) => (p ? p.map((r) => r.text).join("").trim() : "")).join("\n");
  return { html, text };
}
