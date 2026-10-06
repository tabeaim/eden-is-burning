// Wortgruppen für die Ortssuche: Wer „Café" sucht, bekommt unter den direkten
// Treffern auch Verwandtes (Diner, Restaurant …). Orte haben keine Kategorie –
// verwandt ist, was ein Wort derselben Gruppe im Namen oder in der Beschreibung
// trägt. Alle Wörter klein und ohne Akzente/Umlaute (siehe `norm`).

const GROUPS: string[][] = [
  // Essen & Kaffee
  [
    "cafe", "kaffee", "coffee", "diner", "restaurant", "bistro", "bakery", "backerei",
    "imbiss", "cafeteria", "mensa", "pizzeria", "pizza", "grill", "bbq", "eisdiele",
    "deli", "burger", "steakhouse", "brunch", "kantine", "kitchen", "eatery",
  ],
  // Ausgehen
  [
    "bar", "pub", "club", "kneipe", "lounge", "disco", "nightclub", "tavern", "saloon",
    "brauerei", "brewery", "speakeasy", "karaoke", "casino",
  ],
  // Wohnen
  [
    "haus", "house", "loft", "wohnung", "apartment", "villa", "anwesen", "trailer",
    "wohnheim", "dorm", "internat", "zimmer", "home", "residence", "penthouse",
    "mansion", "estate", "wg", "sozialbau", "cottage", "hutte", "cabin",
  ],
  // Draußen
  [
    "park", "see", "lake", "wald", "forest", "woods", "strand", "beach", "fluss",
    "river", "ufer", "garten", "garden", "lichtung", "wiese", "feld", "promenade",
    "hugel", "pier", "bucht", "insel", "trail", "allee",
  ],
  // Schule & Uni
  [
    "uni", "universitat", "university", "schule", "school", "academy", "campus",
    "bibliothek", "library", "horsaal", "klassenzimmer", "college", "schulhof",
    "labor", "seminar",
  ],
  // Einkaufen
  [
    "laden", "store", "shop", "mall", "markt", "market", "boutique", "buchhandlung",
    "bookstore", "supermarkt", "kiosk", "florist",
  ],
  // Kultur
  [
    "theater", "kino", "cinema", "galerie", "gallery", "museum", "buhne", "konzert",
    "oper", "kunst", "art", "contemporary", "atelier", "studio",
  ],
  // Sport
  [
    "gym", "fitness", "stadion", "field", "sportplatz", "pool", "schwimmbad",
    "locker room", "arena", "turnhalle", "country club", "yoga", "boxing",
  ],
  // Übernachten
  ["hotel", "motel", "hostel", "inn", "resort", "pension"],
  // Gesundheit
  [
    "krankenhaus", "hospital", "klinik", "clinic", "praxis", "apotheke", "pharmacy",
    "arzt", "notaufnahme", "therapie",
  ],
  // Behörden & Büros
  [
    "polizei", "police", "revier", "rathaus", "city hall", "gericht", "courthouse",
    "gefangnis", "jail", "feuerwehr", "wache", "kanzlei", "buro", "office",
  ],
  // Unterwegs
  [
    "bahnhof", "station", "highway", "strasse", "street", "road", "flughafen",
    "airport", "hafen", "port", "dock", "parkplatz", "brucke", "bridge",
    "tankstelle", "garage", "werkstatt",
  ],
  // Glaube
  ["kirche", "church", "kapelle", "chapel", "friedhof", "cemetery"],
  // Industrie & Verlassenes
  [
    "fabrik", "factory", "lagerhalle", "warehouse", "scheune", "barn", "ruine",
    "verlassen", "abandoned", "werft",
  ],
];

/** Klein, ohne Akzente und Umlaut-Punkte („Café" → „cafe", „Büro" → „buro"). */
export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Kurze Wörter („bar", „see", „art") zählen nur als ganzes Wort – sonst träfe
// „bar" auch „Nachbar". Längere dürfen in Zusammensetzungen stecken
// („Stadtbibliothek").
function hasWord(text: string, word: string): boolean {
  if (word.length > 3) return text.includes(word);
  return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(text);
}

/**
 * Verwandte Suchwörter zu einer Eingabe: alle Wörter der Gruppen, zu denen die
 * Eingabe (oder eines ihrer Wörter) gehört. Leer, wenn keine Gruppe passt.
 */
export function relatedWords(query: string): string[] {
  const q = norm(query).trim();
  if (q.length < 3) return [];
  const tokens = [q, ...q.split(/[^a-z0-9]+/).filter((t) => t.length >= 3)];
  const out = new Set<string>();
  for (const group of GROUPS) {
    const hit = group.some((w) =>
      tokens.some((t) => w.startsWith(t) || (w.length > 3 && t.includes(w))),
    );
    if (hit) for (const w of group) out.add(w);
  }
  return Array.from(out);
}

/** Trägt der (normalisierte) Text eines der Wörter? */
export function hasAnyWord(text: string, words: string[]): boolean {
  return words.some((w) => hasWord(text, w));
}
