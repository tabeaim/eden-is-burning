const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// "2021-11-22" -> "22. November 2021"
export function formatInplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${d}. ${MONTHS_DE[m - 1]} ${y}`;
}

// Italic-Markdown (*wort*) -> Prosa-HTML mit <em>
export function renderProse(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Wie renderProse, markiert aber zusätzlich die als Zitat gehighlighteten
// Textstellen mit <mark>.
export function renderProseWithHighlights(
  text: string,
  quoteTexts: string[],
): string {
  let html = renderProse(text);
  for (const q of quoteTexts) {
    const needle = renderProse(q.trim());
    if (!needle) continue;
    const idx = html.indexOf(needle);
    if (idx !== -1) {
      html =
        html.slice(0, idx) +
        `<mark>${needle}</mark>` +
        html.slice(idx + needle.length);
    }
  }
  return html;
}

export { escapeHtml };

export function placeholderImg(seed: string, w = 400, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// "vor 2 Stunden" / "gerade eben" — relative Zeit auf Deutsch
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} ${h === 1 ? "Stunde" : "Stunden"}`;
  const d = Math.floor(h / 24);
  return `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`;
}

// Liegt der Zeitpunkt innerhalb der letzten N Stunden?
export function withinHours(iso: string, hours: number): boolean {
  return Date.now() - new Date(iso).getTime() <= hours * 3600 * 1000;
}
