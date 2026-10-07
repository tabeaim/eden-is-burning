import { escapeHtml } from "./format";

// Von Hand geschriebenes HTML (Text-Signatur) entschärfen: nur gestaltende Tags
// und Attribute bleiben, Skripte, Einbettungen und Event-Handler fallen weg.
// Unbekannte Tags verschwinden, ihr Inhalt bleibt stehen.
const TAGS = new Set([
  "a", "b", "big", "blockquote", "br", "center", "div", "em", "font", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "s", "small", "span", "strike", "strong", "sub", "sup", "u", "ul",
]);
// samt Inhalt entfernen
const DROP = new Set([
  "script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "link",
  "meta", "base", "svg", "math", "template", "noscript", "audio", "video", "frame", "frameset",
]);
const ATTRS = new Set(["style", "color", "size", "face", "align", "width", "height", "alt", "title"]);
const BAD_STYLE = /url\s*\(|expression|javascript:|@import|behavior|position\s*:|z-index/i;

function safeStyle(style: string): string {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && !BAD_STYLE.test(d))
    .join("; ");
}

function clean(node: Element) {
  for (const el of Array.from(node.children)) {
    const tag = el.tagName.toLowerCase();
    if (DROP.has(tag)) {
      el.remove();
      continue;
    }
    clean(el);
    if (!TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name === "href" && tag === "a" && /^(https?:|mailto:)/i.test(value)) continue;
      if (name === "src" && tag === "img" && /^https?:/i.test(value)) continue;
      if (name === "style") {
        const style = safeStyle(value);
        if (style) el.setAttribute("style", style);
        else el.removeAttribute("style");
        continue;
      }
      if (!ATTRS.has(name)) el.removeAttribute(attr.name);
    }
    if (tag === "a") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noreferrer noopener");
    }
    if (tag === "img") el.setAttribute("loading", "lazy");
  }
}

// Text-Signatur als HTML: reiner Text behält seine Zeilenumbrüche, HTML wird
// entschärft. Ohne Browser (Server) kommt der Text nur maskiert zurück.
export function signatureHtml(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (!/<[a-z!/][^>]*>/i.test(raw)) return escapeHtml(raw).replace(/\r?\n/g, "<br>");
  if (typeof DOMParser === "undefined") return escapeHtml(raw);
  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, "text/html");
  clean(doc.body);
  return doc.body.innerHTML;
}
