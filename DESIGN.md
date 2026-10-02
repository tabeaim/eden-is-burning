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

Status-Icon: aktiv = Flamme, nur orange solange der neueste Post ungelesen ist
(sonst grau); geschlossen = Haken (`StatusBadge` mit `sceneId`, `SceneRow`).
Szenen-Boxen nennen nur den Ort, nie den Bezirk. Kompakte Zeilen zeigen das Datum
numerisch (`formatInplayDateShort`). Genau drei Varianten, keine weiteren:

1. **Szenen-Kachel** — Raster der Szenen-Übersicht (`app/szenen/page.tsx`).
2. **`SceneCard`** — Key-Facts-Karte für Listen: Dashboard, Ortsprofil,
   Charakterprofil. `showStatus`, wenn aktive und geschlossene Szenen gemischt sind.
3. **`SceneRow`** — kompakte Zeile für schmale Spalten: Dashboard „letzte 24h",
   Bezirks-Panel der Karte.

## Detailseiten (Szene, Charakter, Ort)

- Aktions-Buttons („Bearbeiten") rechts **über** der Trennlinie; die Seite zeichnet
  die Linie selbst (`ownsDivider` in `components/AppShell.tsx`).
- Button-Stil: `rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5
  text-[0.8125rem]`; Primär-Aktion `bg-accent/90 text-black`.
- Abschnitte mit `font-display lowercase text-[2rem] text-accent` überschreiben;
  leere Abschnitte ausblenden statt Platzhaltertext zu zeigen.
