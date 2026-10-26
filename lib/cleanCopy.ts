// Kopieren für Word & Co.: aus dem angezeigten Post nur Absätze, Kursiv und Fett
// übernehmen – keine Schriftart, Größe oder Farbe aus dem Forum. So nimmt das
// Zieldokument seine eigene Schrift, die Hervorhebungen bleiben aber erhalten.
// Kursiv/Fett wird an der Darstellung abgelesen (getComputedStyle), damit auch
// Stellen zählen, die im Forum per Stilangabe statt per <i>/<em> gesetzt waren.

import { escapeHtml } from "./format";

type Run = { text: string; i: boolean; b: boolean };

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
  const html = paras
    .map((p) => (p ? `<p>${p.map(runHtml).join("").trim()}</p>` : "<p>&nbsp;</p>"))
    .join("");
  const text = paras.map((p) => (p ? p.map((r) => r.text).join("").trim() : "")).join("\n");
  return { html, text };
}
