// Orts-Kategorien: eine je Ort. Ihr Icon steht überall dort, wo ein Ort als
// Bubble erscheint (statt des Karten-Icons).
import type { IconName } from "@/components/Icon";
import type { Location } from "./types";

export const LOCATION_CATEGORIES = [
  ["home", "Zuhause", "home"],
  ["food", "Essen & Trinken", "utensils"],
  ["nightlife", "Nightlife", "cocktail"],
  ["outdoor", "Outdoor", "tree"],
  ["business", "Business", "briefcase"],
  ["education", "Schule & Uni", "graduation"],
  ["culture", "Kultur & Freizeit", "ticket"],
  ["infrastructure", "Infrastruktur", "bus"],
  ["lodging", "Hotel & Unterkunft", "bed"],
  ["other", "Sonstiges", "pin"],
] as const satisfies readonly (readonly [string, string, IconName])[];

export type LocationCategory = (typeof LOCATION_CATEGORIES)[number][0];

// Kategorie aus dem Namen erraten – für Orte, bei denen noch keine gewählt ist.
// Reihenfolge zählt: „Hotelbar" ist Nightlife, „Krankenhaus" kein Zuhause.
const GUESSES: [LocationCategory, RegExp][] = [
  ["nightlife", /\b(bar|pub|club|nachtclub|nightclub|disco|lounge|kneipe|tavern|saloon|speakeasy|strip)\b|bar$|club$/i],
  ["food", /caf[eé]|coffee|diner|restaurant|bistro|bakery|bäckerei|pizz|burger|grill|imbiss|kitchen|küche|eatery|deli\b|sushi|taco|ice ?cream|eisdiele|kantine|mensa|food|steakhouse|brunch/i],
  ["lodging", /hotel|motel|hostel|inn\b|resort|pension|bed ?& ?breakfast|\bb&b\b|airbnb|lodge|ferienhaus|unterkunft/i],
  ["education", /universit|\buni\b|college|campus|school|schule|academy|akademie|hörsaal|lecture|bibliothek|library|dorm|wohnheim|kindergarten|klassenzimmer/i],
  ["infrastructure", /hospital|krankenhaus|klinik|clinic|praxis|police|polizei|revier|precinct|feuerwache|fire ?station|bahnhof|station|airport|flughafen|hafen|harbor|harbour|pier|dock|bus\b|subway|u-bahn|parkplatz|parking|garage|tankstelle|gas ?station|rathaus|city ?hall|court|gericht|friedhof|cemetery|kirche|church|kapelle|chapel|bank\b|post\b|brücke|bridge|highway|straße|street|road|gefängnis|prison|jail|morgue|leichenhalle/i],
  ["business", /büro|office|kanzlei|firm|agency|agentur|company|corp|inc\b|headquarter|\bhq\b|werkstatt|workshop|fabrik|factory|lager|warehouse|labor|\blab\b|redaktion|newsroom|salon|werft|baustelle|construction|industries|enterprises/i],
  ["home", /wohnung|apartment|\bapt\b|haus\b|house|home|zuhause|loft|penthouse|villa|anwesen|mansion|residen|wg\b|zimmer|\broom\b|trailer|cabin|hütte|flat\b|'s place|s place|bei .+ zuhause/i],
  ["culture", /museum|galerie|gallery|theat|kino|cinema|oper|concert|konzert|arena|stadium|stadion|gym|fitness|studio|bowling|arcade|casino|spa\b|pool|schwimmbad|tattoo|mall|markt|market|shop|store|laden|boutique|buchhandlung|bookstore|records|festival|fair\b|zoo|aquarium/i],
  ["outdoor", /park|strand|beach|wald|forest|woods|see\b|lake|fluss|river|berg|mountain|hill|klippe|cliff|garten|garden|feld|field|trail|wiese|meadow|bucht|bay\b|ufer|shore|coast|küste|insel|island|camp|farm|ranch|rooftop|dach|friedhof/i],
];

export function guessCategory(name: string): LocationCategory {
  return GUESSES.find(([, re]) => re.test(name))?.[0] ?? "other";
}

// Gewählte Kategorie eines Orts, sonst die aus dem Namen erratene
export function categoryOf(loc: Pick<Location, "name" | "category">): LocationCategory {
  const known = LOCATION_CATEGORIES.find(([key]) => key === loc.category);
  return known ? known[0] : guessCategory(loc.name);
}

export function categoryIcon(category: LocationCategory): IconName {
  return LOCATION_CATEGORIES.find(([key]) => key === category)![2];
}

export function categoryLabel(category: LocationCategory): string {
  return LOCATION_CATEGORIES.find(([key]) => key === category)![1];
}
