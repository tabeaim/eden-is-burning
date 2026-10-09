// Info-Seiten: Unterseiten unter „Info", die Admins anlegen und direkt auf der Seite
// bearbeiten. Sie liegen in den App-Einstellungen (`appSettings.infoPages`); solange
// dort nichts steht, gelten die fest eingetragenen.
import type { IconName } from "@/components/Icon";
import type { InfoPage } from "./types";

export const DEFAULT_INFO_PAGES: InfoPage[] = [
  {
    id: "eden",
    title: "Alles über Eden & D.C", // der Punkt kommt aus der Überschrift
    text: "Die Stadt, ihre Gegenden und Washington D.C. – alles, was man zum Spielen wissen muss.",
    icon: "map",
    content: "",
  },
  {
    id: "grafikregeln",
    title: "Grafikregeln",
    text: "Formate und Regeln für Avatare, Banner und andere Grafiken.",
    icon: "photo",
    content: "",
  },
];

// Icons, die Admins einer Info-Seite geben können
export const INFO_ICONS: [IconName, string][] = [
  ["info", "Info"],
  ["book", "Buch"],
  ["map", "Karte"],
  ["photo", "Bild"],
  ["users", "Personen"],
  ["calendar", "Kalender"],
  ["star", "Stern"],
  ["heart", "Herz"],
  ["flame", "Flamme"],
  ["message", "Nachricht"],
  ["phone", "Handy"],
  ["settings", "Zahnrad"],
];

export function infoPages(settings: { infoPages?: InfoPage[] | null } | null | undefined): InfoPage[] {
  return settings?.infoPages ?? DEFAULT_INFO_PAGES;
}

export function infoIcon(page: InfoPage): IconName {
  return INFO_ICONS.some(([k]) => k === page.icon) ? (page.icon as IconName) : "info";
}

// Adresse einer neuen Seite aus ihrem Titel („Regeln & FAQ" → „regeln-faq"); ist sie
// vergeben, kommt eine Zahl dahinter.
export function infoSlug(title: string, taken: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "seite";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}
