# Design-System — Eden Is Burning

Kurze Regeln, damit gleiche Dinge überall gleich aussehen. Vor neuem UI erst hier
nachsehen und die vorhandenen Bausteine benutzen, statt Klassen neu zu erfinden.

## Farben & Schrift

Tokens stehen in `app/globals.css` (`--accent`, `--olive`, `--bg-*`, `--text-*`,
`--border-*`). Display-Schrift (`font-display`) nur für Logo, Seitentitel und die
kleingeschriebenen Abschnitts-Überschriften mit Punkt („facts.", „scenes.").
Alles andere ist Montserrat. Standard-Textgröße `0.875rem`, Bubbles/Buttons
`0.8125rem`.

## Bubbles — `components/Bubble.tsx`

Es gibt genau eine Pill-Form. Nie eigene `rounded-full border …`-Klassen schreiben.

| Baustein | Inhalt | Einsatz |
| --- | --- | --- |
| `CharacterBubble` | Avatar + Name, bei NPCs „NPC" hinter dem Namen | Charaktere und NPCs überall |
| `LocationBubble` | Karten-Icon + Ortsname; Ortsideen (`played={false}`) olive getönt | Orte auf der Karte und in der Szene |
| `Bubble` | freier Inhalt | Basis für neue Bubble-Arten |

- Ton `accent` nur für „am Zug".
- Innerhalb einer verlinkten Karte `linked={false}` (keine Links in Links).

## Szenen-Boxen — `components/SceneCard.tsx`

Status steht links als Streichholz (`SceneMatch`): brennend/orange bei ungelesenem
neuestem Post, grau ohne Flamme wenn gelesen, abgebrannt mit Rauch bei geschlossener
Szene. Die Tags „aktiv"/„geschlossen" (`StatusBadge`) gibt es nur in der Szene selbst.
Szenen-Boxen nennen nur den Ort, nie den Bezirk. Genau zwei Varianten:

1. **`SceneCard`** — ausführliche Karte: Titel, Ort · Datum in einer Zeile,
   Beteiligte (wer dran ist, markiert), letzter Post. Szenen-Übersicht, Dashboard,
   Ortsprofil, Charakterprofil.
2. **`SceneRow`** — kompakte Zeile für schmale Spalten: Dashboard „letzte 24h",
   Bezirks-Panel der Karte; Datum numerisch (`formatInplayDateShort`).

## Seitenbreite

Alle Seiten nutzen denselben Container `max-w-6xl mx-auto px-8` (auch als `width`
für den Banner-Titel), damit Titel und Inhalt beim Seitenwechsel nicht springen.

## Responsive

Alles muss auch auf dem Handy (~375px) benutzbar sein: Seiten-Gutter `px-4 sm:px-8`,
mehrspaltige Raster und Karte-neben-Text erst ab `sm`/`md`/`lg` nebeneinander,
Button-Reihen mit `flex-wrap`, keine festen Breiten ohne `max-w-full`. Die
Seitenleiste ist unter `md` eine Schublade (Menü-Taste in der Kopfleiste).

## Detailseiten (Szene, Charakter, Ort)

- Aktions-Buttons („Bearbeiten") rechts **über** der Trennlinie; die Seite zeichnet
  die Linie selbst (`ownsDivider` in `components/AppShell.tsx`).
- Button-Stil: `rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5
  text-[0.8125rem]`; Primär-Aktion `bg-accent/90 text-black`.
- Abschnitte mit `font-display lowercase text-[2rem] text-accent` überschreiben;
  leere Abschnitte ausblenden statt Platzhaltertext zu zeigen.
