// Statische Welt-Daten für Eden, Virginia

export type AreaKey =
  | "rivers_edge"
  | "belle_view"
  | "oak_hill"
  | "westridge"
  | "orchid_valley"
  | "byron"
  | "sutton"
  | "washington"
  | "umland"
  | "downtown";

export interface AreaInfo {
  key: AreaKey;
  name: string;
  character: string;
  priceLevel: string;
  residents: string;
  onMap: boolean;
  /** Optionales Titelbild (Banner). Fällt sonst auf einen Seed-Platzhalter zurück. */
  image?: string;
}

export const AREAS: Record<AreaKey, AreaInfo> = {
  rivers_edge: {
    key: "rivers_edge",
    name: "Rivers Edge",
    character:
      "Südliches Stadtinneres, belebter Stadtteil, Cafés, Bars, inhabergeführte Läden, Farmers Market (So), Kunstmarkt (Di).",
    priceLevel: "$$",
    residents: "Studierende, Künstler*innen, junge Familien",
    onMap: true,
  },
  belle_view: {
    key: "belle_view",
    name: "Belle View",
    character:
      "Touristischer Kern, Promenade, Strand, Hotels, Einkaufsstraße. Luxus-Wohnobjekte inkl. zwei Glass Tower (bester Ausblick der Stadt).",
    priceLevel: "$$–$$$$",
    residents: "Tourist*innen, wohlhabendere Studierende, Berufstätige",
    onMap: true,
  },
  oak_hill: {
    key: "oak_hill",
    name: "Oak Hill",
    character:
      "Vorörtliches Paradies, Eichenallee, Einfamilienhäuser, sehr sichere engagierte Nachbarschaft.",
    priceLevel: "$$$–$$$$",
    residents: "Familien, berufstätige Paare",
    onMap: true,
  },
  westridge: {
    key: "westridge",
    name: "Westridge",
    character:
      "Sozialer Brennpunkt, nordwestlich, Sozialwohnbauten, Trailer Park. Jährliches \"The Great Westridge BBQ\".",
    priceLevel: "$",
    residents: "Familien mit geringerem Einkommen, Arbeitslose",
    onMap: true,
  },
  orchid_valley: {
    key: "orchid_valley",
    name: "Orchid Valley",
    character:
      "Flächengrößter Stadtteil, riesige Villen (oft von Straße nicht sichtbar), sehr viel Geld.",
    priceLevel: "$$$$$",
    residents: "Wohlhabende Familien, wohlhabende Rentner*innen",
    onMap: true,
  },
  byron: {
    key: "byron",
    name: "Byron University",
    character:
      "Fiktive Ivy League, ~15.000 Studierende, riesiger Campus mit Locker Room, Library, Football Field, Cafeteria.",
    priceLevel: "–",
    residents: "Studierende, Lehrende",
    onMap: false,
  },
  sutton: {
    key: "sutton",
    name: "Sutton Academy",
    character:
      "Privatschule mit Internat, Schuluniform. Früher \"Abercrombie Academy\", 2019 umbenannt.",
    priceLevel: "–",
    residents: "Schüler*innen, Lehrkräfte",
    onMap: false,
  },
  washington: {
    key: "washington",
    name: "Washington D.C.",
    character:
      "Die Hauptstadt, ~50 km nördlich – die nächstgrößere Stadt. Macht, Geld, Geheimnisse. Ebenfalls bespielbar.",
    priceLevel: "–",
    residents: "–",
    onMap: false,
  },
  umland: {
    key: "umland",
    name: "Umland",
    character:
      "Wälder, Felder und einsame Landstraßen rund um Eden. Verlassene Scheunen, ein stiller See, der Highway Richtung D.C. – wo die Stadt in die Natur ausläuft.",
    priceLevel: "$",
    residents: "Wenige, weit verstreut",
    onMap: true,
  },
  downtown: {
    key: "downtown",
    name: "Central",
    character:
      "Das pulsierende Herz Edens: Verwaltung, Theater, Hochhäuser und der zentrale Bahnhof. Tagsüber Anzüge, nachts Neon.",
    priceLevel: "$$$",
    residents: "Berufstätige, Pendler*innen",
    onMap: true,
  },
};

export const LOCATION_SUGGESTIONS: Record<AreaKey, string[]> = {
  rivers_edge: [
    "Café Marlowe",
    "Ron's Diner",
    "The Record Store",
    "The Ember",
    "Galerie Halbmond",
    "Eden Mall",
    "Buchhandlung Seiter",
    "Farmers Market",
  ],
  belle_view: [
    "Paola's & Elliot's Loft",
    "Glass Tower Bar",
    "Hale Contemporary",
    "Café an der Promenade",
    "Promenade",
    "Belle View Hotel",
  ],
  oak_hill: ["Oak Hill Community Center"],
  westridge: ["Westridge BBQ Platz", "Sozialbau Komplex A", "Trailer Park", "Route 9 Diner"],
  orchid_valley: ["Simmons Anwesen", "Orchid Valley Country Club"],
  byron: ["Byron Library", "Football Field", "Byron Cafeteria"],
  sutton: ["Sutton Internat", "Sutton Schulhof", "Sutton Bibliothek"],
  washington: ["The Mall", "Georgetown", "Dupont Circle", "Capitol Hill"],
  umland: ["Highway 95", "Highway 95 Diner", "Verlassene Scheune", "Waldlichtung"],
  downtown: ["Stadtbibliothek", "Theater am Platz", "Café Verlaine", "Eden Central Station"],
};

// Reihenfolge für Selects
export const AREA_ORDER: AreaKey[] = [
  "rivers_edge",
  "belle_view",
  "oak_hill",
  "downtown",
  "westridge",
  "orchid_valley",
  "umland",
  "byron",
  "sutton",
  "washington",
];

// Neutraler Bereich: spielt in Eden, gehört aber zu keinem Stadtteil. Hat auf der
// Karte keine eigene Fläche und zählt in den Filtern nicht zu „Rest der Welt".
export const EDEN_AREA = "eden";
export const REST_AREA = "rest";

// Bereiche ohne eigenen Gegend-Steckbrief (nur Name + Kurzbeschreibung)
export const EXTRA_AREAS: Record<string, { name: string; character: string }> = {
  industrial: {
    name: "Industrial District & Eden Port",
    character:
      "Hafen und Industriegürtel im Südosten – Lagerhallen, Docks, alte Fabriken. Wo Fracht umgeschlagen wird und die Stadt ihre raue Seite zeigt.",
  },
  [EDEN_AREA]: {
    name: "Eden (ohne Bezirk)",
    character:
      "Irgendwo in Eden – für Szenen und Orte, die in der Stadt spielen, sich aber keinem Stadtteil zuordnen lassen.",
  },
  [REST_AREA]: {
    name: "Rest der Welt",
    character:
      "Alles jenseits von Eden und D.C. – Reisen, Rückblenden, ferne Orte. Für Szenen, die nirgendwo sonst hingehören.",
  },
};

// Alle Bereiche, in denen Orte liegen und Szenen spielen können (für Selects)
export const PLACE_AREAS: string[] = [...AREA_ORDER, ...Object.keys(EXTRA_AREAS)];

export function areaName(key: string): string {
  return AREAS[key as AreaKey]?.name ?? EXTRA_AREAS[key]?.name ?? key;
}

/**
 * Bild einer Gegend: das von Admins hinterlegte (Einstellungen → Admin → Design),
 * sonst das fest eingetragene, sonst ein Platzhalter.
 */
export function areaImage(
  key: string,
  settings: { areaImages?: Record<string, string> } | null | undefined,
): string {
  return (
    settings?.areaImages?.[key] ||
    AREAS[key as AreaKey]?.image ||
    `https://picsum.photos/seed/${encodeURIComponent(`area-${key}`)}/800/240`
  );
}
