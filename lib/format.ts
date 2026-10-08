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

// "2021-11-22" -> "Mo, 22. November 2021" (Timeline)
const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function formatInplayDateWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${WEEKDAYS_DE[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${formatInplayDate(iso)}`;
}

// "2021-11-22" -> "22.11.2021" (für kompakte Zeilen)
export function formatInplayDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

// Freitext-Tageszeit („22:10", „Nachmittag", „früher Abend") als Minuten seit
// Mitternacht – nur zum Sortieren. Ohne (erkennbare) Angabe: -1.
const DAYTIMES: [string, number][] = [
  ["vormittag", 10 * 60],
  ["nachmittag", 15 * 60],
  ["mitternacht", 24 * 60 - 1],
  ["mittag", 12 * 60],
  ["morgen", 7 * 60],
  ["abend", 19 * 60],
  ["nacht", 23 * 60],
];
export function inplayTimeRank(time: string | null | undefined): number {
  const t = (time ?? "").trim().toLowerCase();
  if (!t) return -1;
  const clock = t.match(/(\d{1,2})[:.](\d{2})/) ?? t.match(/(\d{1,2})()\s*uhr/);
  if (clock) return Math.min(23, parseInt(clock[1], 10)) * 60 + (parseInt(clock[2], 10) || 0);
  const hit = DAYTIMES.find(([word]) => t.includes(word));
  if (!hit) return -1;
  return hit[1] + (t.includes("früh") ? -90 : t.includes("spät") ? 90 : 0);
}

// In-Game-Reihenfolge (aufsteigend): Datum, dann Tageszeit. Einträge ohne Uhrzeit
// stehen am Anfang ihres Tages; bei Gleichstand entscheidet das Anlegen.
export function compareInplay(
  a: { inplay_date: string; inplay_time?: string | null; created_at?: string },
  b: { inplay_date: string; inplay_time?: string | null; created_at?: string },
): number {
  return (
    a.inplay_date.localeCompare(b.inplay_date) ||
    inplayTimeRank(a.inplay_time) - inplayTimeRank(b.inplay_time) ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "")
  );
}

// Zeitpunkt numerisch, z.B. "22.11.2021, 14:30" (für kompakte Zeilen)
export function formatDateTimeShort(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}, ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

// Absoluter Zeitpunkt mit Datum + Uhrzeit, z.B. "22. November 2021, 14:30 Uhr"
export function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso;
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dt.getDate()}. ${MONTHS_DE[dt.getMonth()]} ${dt.getFullYear()}, ${hh}:${mm} Uhr`;
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

// Post-Inhalt rendern: HTML wird durchgelassen (der Editor speichert HTML),
// und das alte Italic-Markdown (*wort*) der Seed-Posts wird zu <em> konvertiert.
export function renderPost(content: string): string {
  return content.replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export { escapeHtml };

export function placeholderImg(seed: string, w = 400, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// "vor 2 Stunden" / "gerade eben" – relative Zeit auf Deutsch
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

// Namen aufzählen: zwei mit „&", mehr mit Kommas („A & B", „A, B, C")
export function joinNames(names: string[]): string {
  return names.length === 2 ? names.join(" & ") : names.join(", ");
}

// Erster Buchstabe groß (Beschäftigung u. Ä.): „barkeeper" -> „Barkeeper"
export function capFirst(s: string | null | undefined): string {
  const t = (s ?? "").trimStart();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
