"use client";

// Helfer für die Text-Editoren der Szenen (contentEditable): deutsche Typografie
// beim Tippen, Einfügen aus Schreibprogrammen mit Formatierung, Kopieren eines
// ganzen Posts samt Formatierung.

import { useEffect } from "react";

// --- Deutsche Typografie -----------------------------------------------------
// Anführungszeichen unten/oben („…" und ‚…'), Apostroph ', Gedankenstrich – und
// Auslassungspunkte …

const OPENS_AFTER = /[\s([{<>–—„‚/]/; // nach diesen Zeichen (oder am Anfang) öffnet ein Anführungszeichen

function doubleQuote(before: string): string {
  const prev = before.slice(-1);
  return !prev || OPENS_AFTER.test(prev) ? "„" : "“";
}
function singleQuote(before: string): string {
  const prev = before.slice(-1);
  if (!prev || OPENS_AFTER.test(prev)) return "‚";
  // Schließt ein offenes ‚…? Sonst ist es ein Apostroph („geht's").
  const open = before.lastIndexOf("‚");
  return open !== -1 && before.indexOf("‘", open) === -1 ? "‘" : "’";
}

// Wandelt gerade Anführungszeichen in einem fertigen Text um (eingefügter Text).
// `before` = was im Absatz schon davor steht.
export function germanQuotes(text: string, before = ""): string {
  let out = "";
  for (const ch of text) {
    const ctx = before + out;
    out += ch === '"' ? doubleQuote(ctx) : ch === "'" ? singleQuote(ctx) : ch;
  }
  return out;
}

const BLOCKS = new Set(["DIV", "P", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6"]);

// Text des Absatzes vor der Schreibmarke (Zeilenumbrüche als \n)
function textBeforeCaret(root: HTMLElement): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return null;
  const caret = sel.getRangeAt(0);
  let block: Node = root;
  for (let n: Node | null = caret.startContainer; n && n !== root; n = n.parentNode) {
    if (n instanceof HTMLElement && BLOCKS.has(n.tagName)) {
      block = n;
      break;
    }
  }
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(caret.startContainer, caret.startOffset);
  const holder = document.createElement("div");
  holder.appendChild(range.cloneContents());
  holder.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  // Absätze innerhalb des Ausschnitts (Schreibmarke direkt im Editor, nicht in einem Absatz)
  holder.querySelectorAll("div, p").forEach((el) => el.append("\n"));
  return holder.textContent ?? "";
}

function replaceBefore(count: number, text: string) {
  const sel = window.getSelection();
  for (let i = 0; i < count; i++) sel?.modify("extend", "backward", "character");
  document.execCommand("insertText", false, text);
}

function onBeforeInput(root: HTMLElement, e: InputEvent) {
  if (e.inputType !== "insertText" || !e.data || e.data.length !== 1 || e.isComposing) return;
  const before = textBeforeCaret(root);
  if (before === null) return;
  const ch = e.data;
  let count = 0;
  let text: string | null = null;
  if (ch === '"') text = doubleQuote(before);
  else if (ch === "'") text = singleQuote(before);
  else if (ch === "." && before.endsWith("..")) {
    count = 2;
    text = "…";
  } else if (ch === "-" && before.endsWith("-") && !before.endsWith("--")) {
    count = 1;
    text = "–";
  } else if (ch === " " && /(^|\s)-$/.test(before)) {
    count = 1;
    text = "– ";
  }
  if (text === null) return;
  e.preventDefault();
  replaceBefore(count, text);
}

// --- Einfügen ----------------------------------------------------------------
// Aus Schreibprogrammen (Word, Pages, Google Docs, Scrivener …) kommt HTML mit
// Schriften, Farben und Abständen. Übernommen werden nur Absätze, Zeilenumbrüche
// und die Auszeichnungen fett, kursiv, unterstrichen, durchgestrichen (sowie die
// Größen des eigenen Editors) – alles andere fällt weg.

// `size`: alte feste Stufen (<font size>), `em`: feine Stufen des Editors (siehe stepFontSize)
type Fmt = { b: boolean; i: boolean; u: boolean; s: boolean; size: string | null; em: number };
type Run = { text: string; fmt: Fmt };

const SKIP = new Set(["STYLE", "SCRIPT", "HEAD", "META", "TITLE", "LINK", "TEMPLATE", "NOSCRIPT"]);
const BLOCK_TAGS = new Set([
  ...BLOCKS,
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "UL",
  "OL",
  "TABLE",
  "TR",
  "PRE",
  "HR",
]);

function fmtOf(el: HTMLElement, f: Fmt): Fmt {
  const next = { ...f };
  const tag = el.tagName;
  if (tag === "B" || tag === "STRONG") next.b = true;
  if (tag === "I" || tag === "EM") next.i = true;
  if (tag === "U") next.u = true;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") next.s = true;
  if (tag === "FONT") {
    const size = el.getAttribute("size");
    if (size === "2" || size === "5") next.size = size;
  }
  const st = el.style;
  const em = /^([\d.]+)(em|%)$/.exec(st.fontSize);
  if (em) {
    const ratio = parseFloat(em[1]) / (em[2] === "%" ? 100 : 1);
    if (ratio > 0) next.em = clampSize(f.em * ratio);
  }
  if (st.fontWeight) {
    const w = st.fontWeight;
    next.b = w === "bold" || w === "bolder" || parseInt(w, 10) >= 600;
  }
  if (st.fontStyle) next.i = st.fontStyle === "italic" || st.fontStyle === "oblique";
  const deco = `${st.textDecoration} ${st.textDecorationLine}`;
  if (deco.includes("underline")) next.u = true;
  if (deco.includes("line-through")) next.s = true;
  if (deco.includes("none")) next.u = next.s = false;
  return next;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const same = (a: Fmt, b: Fmt) =>
  a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.size === b.size && a.em === b.em;

function lineHtml(runs: Run[]): string {
  const merged: Run[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && same(last.fmt, r.fmt)) last.text += r.text;
    else merged.push({ ...r });
  }
  let before = "";
  return merged
    .map(({ text, fmt }) => {
      // Zeilenumbrüche innerhalb eines Absatzes bleiben als <br>
      let html = esc(germanQuotes(text, before)).replace(/\n/g, "<br>");
      before += text;
      if (!text.trim()) return html;
      if (fmt.s) html = `<s>${html}</s>`;
      if (fmt.u) html = `<u>${html}</u>`;
      if (fmt.i) html = `<i>${html}</i>`;
      if (fmt.b) html = `<b>${html}</b>`;
      if (fmt.size) html = `<font size="${fmt.size}">${html}</font>`;
      if (fmt.em !== 1) html = `<span style="font-size: ${fmt.em}em">${html}</span>`;
      return html;
    })
    .join("");
}

function linesToHtml(lines: Run[][]): string {
  const blank = (l: Run[]) => !l.some((r) => r.text.replace(/ /g, " ").trim());
  while (lines.length && blank(lines[0])) lines.shift();
  while (lines.length && blank(lines[lines.length - 1])) lines.pop();
  if (lines.length === 0) return "";
  // eine einzelne Zeile fügt sich in den laufenden Absatz ein
  if (lines.length === 1) return lineHtml(lines[0]);
  return lines.map((l) => `<div>${blank(l) ? "<br>" : lineHtml(l)}</div>`).join("");
}

export function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: Run[][] = [];
  let cur: Run[] | null = null;
  const line = () => (cur ??= (lines.push([]), lines[lines.length - 1]));
  const flush = () => {
    cur = null;
  };
  const walk = (node: Node, fmt: Fmt, pre: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.nodeValue ?? "";
      if (!pre) {
        text = text.replace(/[ \t\r\n]+/g, " ");
        // Leerraum zwischen Absätzen (Einrückung im Quelltext) zählt nicht
        if (!cur || cur.length === 0) text = text.replace(/^ /, "");
      }
      if (text) line().push({ text, fmt });
      return;
    }
    if (!(node instanceof HTMLElement) || SKIP.has(node.tagName)) return;
    if (node.tagName === "BR") {
      // Zeilenumbruch im Absatz; ein Absatz nur aus <br> ist eine Leerzeile
      if (cur && cur.length) cur.push({ text: "\n", fmt });
      else line();
      return;
    }
    const block = BLOCK_TAGS.has(node.tagName);
    const white = node.style.whiteSpace;
    const keep = pre || node.tagName === "PRE" || white.startsWith("pre");
    if (block) flush();
    // leerer Absatz = Leerzeile
    if (block && (node.tagName === "P" || node.tagName === "DIV") && !node.textContent?.trim() && !node.querySelector("p, div")) {
      line();
      flush();
      return;
    }
    const next = fmtOf(node, fmt);
    node.childNodes.forEach((child) => walk(child, next, keep));
    if (block) flush();
  };
  walk(doc.body, { b: false, i: false, u: false, s: false, size: null, em: 1 }, false);
  // ein <br> am Absatzende ist kein eigener Umbruch
  for (const l of lines) while (l.length > 1 && l[l.length - 1].text === "\n") l.pop();
  return linesToHtml(lines);
}

export function plainToHtml(text: string): string {
  const fmt: Fmt = { b: false, i: false, u: false, s: false, size: null, em: 1 };
  return linesToHtml(text.replace(/\r\n?/g, "\n").split("\n").map((t) => (t ? [{ text: t, fmt }] : [])));
}

function onPaste(root: HTMLElement, e: ClipboardEvent) {
  const data = e.clipboardData;
  if (!data) return;
  const html = data.getData("text/html");
  const text = data.getData("text/plain");
  if (!html && !text) return; // z. B. Bilder: Browser-Standard
  e.preventDefault();
  const clean = (html && cleanPastedHtml(html)) || plainToHtml(text);
  if (!clean) return;
  document.execCommand("insertHTML", false, clean);
  // Der Browser hängt beim Einfügen gern eigene Schrift-Angaben an – weg damit
  root.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
}

// Hängt beides an einen contentEditable-Editor. `active` = der Editor ist gerade
// im DOM (z. B. erst nach Klick auf „Bearbeiten").
export function useProseEditor(ref: React.RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const before = (e: InputEvent) => onBeforeInput(el, e);
    const paste = (e: ClipboardEvent) => onPaste(el, e);
    el.addEventListener("beforeinput", before);
    el.addEventListener("paste", paste);
    return () => {
      el.removeEventListener("beforeinput", before);
      el.removeEventListener("paste", paste);
    };
  }, [ref, active]);
}

// --- Schriftgröße in feinen Stufen -------------------------------------------
// „Größer"/„Kleiner" der Editor-Leiste: je Klick ein Zehntel der Grundgröße, relativ
// zur aktuellen Größe der Auswahl (statt der groben Stufen von execCommand).
const SIZE_STEP = 0.1;
const clampSize = (ratio: number) => Math.min(2.5, Math.max(0.6, Math.round(ratio * 100) / 100));

// Erstes Textstück, das wirklich in der Auswahl liegt (nicht nur an ihrem Rand)
function firstSelectedText(root: HTMLElement, range: Range): Node | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!range.intersectsNode(n) || !n.textContent) continue;
    if (n === range.startContainer && range.startOffset >= n.textContent.length) continue;
    if (n === range.endContainer && range.endOffset === 0) continue;
    return n;
  }
  return null;
}

export function stepFontSize(root: HTMLElement | null, dir: 1 | -1) {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  const base = parseFloat(getComputedStyle(root).fontSize) || 14;
  const px = (el: Element | null) => parseFloat(getComputedStyle(el ?? root).fontSize) || base;
  const sized = (parent: Element | null, target: number) => {
    const span = document.createElement("span");
    span.style.fontSize = `${Math.round(((target * base) / px(parent)) * 1000) / 1000}em`;
    return span;
  };

  if (sel.isCollapsed) {
    // Ohne Auswahl: ab der Schreibmarke in der neuen Größe weiterschreiben
    const at = range.startContainer;
    const parent = at instanceof Element ? at : at.parentElement;
    const span = sized(parent, clampSize(px(parent) / base + dir * SIZE_STEP));
    span.textContent = "\u200b";
    range.insertNode(span);
    sel.collapse(span.firstChild, 1);
    return;
  }

  // Größe am Anfang der Auswahl messen, dann die Auswahl vom Browser umschließen
  // lassen (<font size="7"> als Marke) und die Marken durch Spannen ersetzen.
  const first = firstSelectedText(root, range);
  const target = clampSize(px(first?.parentElement ?? null) / base + dir * SIZE_STEP);
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");
  const spans = Array.from(root.querySelectorAll<HTMLElement>('font[size="7"]')).map((font) => {
    const span = sized(font.parentElement, target);
    span.append(...Array.from(font.childNodes));
    // feste Größen im Inneren würden die neue Größe überstimmen
    span.querySelectorAll<HTMLElement>("span, font").forEach((el) => {
      el.style.fontSize = "";
      el.removeAttribute("size");
    });
    font.replaceWith(span);
    return span;
  });
  if (spans.length) {
    const next = document.createRange();
    next.setStartBefore(spans[0]);
    next.setEndAfter(spans[spans.length - 1]);
    sel.removeAllRanges();
    sel.addRange(next);
  }
}

// --- Kopieren ----------------------------------------------------------------
// Legt einen Post samt Formatierung in die Zwischenablage (HTML und reiner Text) –
// im Editor eingefügt, kommt er so an, wie er geschrieben wurde.
export async function copyRich(html: string, text: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
