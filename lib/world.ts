// Statische Welt-Daten für Eden, Virginia

export type AreaKey =
  | "rivers_edge"
  | "belle_view"
  | "oak_hill"
  | "westridge"
  | "orchid_valley"
  | "byron"
  | "sutton"
  | "washington";

export interface AreaInfo {
  key: AreaKey;
  name: string;
  character: string;
  priceLevel: string;
  residents: string;
  onMap: boolean;
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
    priceLevel: "—",
    residents: "Studierende, Lehrende",
    onMap: false,
  },
  sutton: {
    key: "sutton",
    name: "Sutton Academy",
    character:
      "Privatschule mit Internat, Schuluniform. Früher \"Abercrombie Academy\", 2019 umbenannt.",
    priceLevel: "—",
    residents: "Schüler*innen, Lehrkräfte",
    onMap: false,
  },
  washington: {
    key: "washington",
    name: "Washington D.C.",
    character: "Die Hauptstadt, ~50 km nördlich. Ebenfalls bespielbar.",
    priceLevel: "—",
    residents: "—",
    onMap: false,
  },
};

export const LOCATION_SUGGESTIONS: Record<AreaKey, string[]> = {
  rivers_edge: [
    "Café Marlowe",
    "Ron's Diner",
    "The Record Store",
    "Eden Mall",
    "Buchhandlung Seiter",
    "Farmers Market",
  ],
  belle_view: [
    "Paola's & Elliot's Loft",
    "Glass Tower Bar",
    "Promenade",
    "Belle View Hotel",
    "Strandabschnitt Nord",
  ],
  oak_hill: ["Sinclair Haus", "Oak Hill Community Center", "Eichenallee Park"],
  westridge: ["Westridge BBQ Platz", "Sozialbau Komplex A", "Trailer Park"],
  orchid_valley: ["Simmons Anwesen", "Voss Villa", "Orchid Valley Country Club"],
  byron: ["Byron Locker Room", "Byron Library", "Football Field", "Byron Cafeteria"],
  sutton: ["Sutton Internat", "Sutton Schulhof", "Sutton Bibliothek"],
  washington: ["The Mall", "Georgetown", "Dupont Circle", "Capitol Hill"],
};

// Reihenfolge für Selects
export const AREA_ORDER: AreaKey[] = [
  "rivers_edge",
  "belle_view",
  "oak_hill",
  "westridge",
  "orchid_valley",
  "byron",
  "sutton",
  "washington",
];

export function areaName(key: string): string {
  return AREAS[key as AreaKey]?.name ?? key;
}
