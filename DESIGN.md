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
| `LocationBubble` | Karten-Icon + Ortsname; Icon orange bei bespielten Orten, grau bei „Weiteren Orten" (`played={false}`) | Orte auf der Karte und in der Szene |
| `Bubble` | freier Inhalt | Basis für neue Bubble-Arten |

- **Avatare:** rund (Charaktere, NPCs und Spieler*innen), als mittiger Ausschnitt
  des echten Avatars (`rounded-full object-cover`). Ausnahme: die Charakterliste
  der Spieler-Übersicht nutzt kleine Rechtecke.
- Ton `accent` nur für „am Zug".
- Innerhalb einer verlinkten Karte `linked={false}` (keine Links in Links).

## Szenen-Boxen — `components/SceneCard.tsx`

Status steht links als Streichholz (`SceneMatch`): brennend/orange bei ungelesenem
neuestem Post, grau ohne Flamme wenn gelesen, abgebrannt mit Rauch bei geschlossener
Szene. Die Tags „aktiv"/„geschlossen" (`StatusBadge`) gibt es nur in der Szene selbst.
Szenen-Boxen nennen nur den Ort, nie den Bezirk. Genau zwei Varianten:

Zeitangaben zu Posts immer als Datum + Uhrzeit, nie relativ („vor 18 Stunden").

1. **`SceneCard`** — ausführliche Karte: Titel, Ort (reiner Text, führt aufs Ortsprofil) · Datum in einer Zeile,
   Beteiligte als anklickbare Bubbles (wer dran ist, markiert), letzter Post. Szenen-Übersicht, Dashboard,
   Ortsprofil, Charakterprofil.
   Die ganze Box führt zur Szene; „Letzter Post" springt zum neuesten Post.
2. **`SceneRow`** — kompakte Zeile für schmale Spalten, überall identisch
   (Dashboard „letzte 24h", Bezirks-Panel der Karte): Ort · Datum numerisch, rechts
   letzter Poster + Zeitpunkt.

## Formulare & Nachfragen

- **Datum:** immer `components/DatePicker.tsx` (kleiner Kalender, öffnet ohne Wert
  im Jahr 2021), nie `<input type="date">`.
- **Endgültige Aktionen** (löschen): `components/ConfirmDialog.tsx` mit klar
  benanntem Knopf („Plot löschen"), nie `window.confirm`.
- **Mehrfach-Filter:** `components/MultiSelect.tsx`.
- **„Neu anlegen" in einer Bubble-Reihe:** gestrichelte Pill mit Plus und Text
  („+ Neuer Ort", „+ Als Plot speichern").

## Timeline

Der Zeitstrahl nutzt dieselben Bausteine wie die Szenenboxen (Karte mit Rahmen,
`SceneMatch` als Knoten auf der Linie), ergänzt um Datum über dem Titel und den
Beschreibungssatz. Die Faktenzeile ist reiner Text mit Punkten dazwischen:
zusammengerückte Profilbilder + Vornamen · Ort · AU — nichts davon anklickbar.
Plot-Logik (Filter, Sichtbarkeit) liegt in `lib/plots.ts`, die Plot-Zeile in
`components/PlotBar.tsx`; Timeline und Szenen-Übersicht nutzen beides. Umbenennen und
Löschen des geöffneten Plots kommen auf beiden Seiten aus `PlotTools` (ebenfalls `PlotBar.tsx`). Off-Szenen eines Plots sind
gestrichelt umrandet und tragen das Tag „im Off". AU-Szenen erscheinen nur, wenn
ihr AU im Filter gewählt ist — ohne Auswahl zeigt die Timeline nur Canon.

## Seitenbreite

Alle Seiten nutzen denselben Container `max-w-6xl mx-auto px-8` (auch als `width`
für den Banner-Titel), damit Titel und Inhalt beim Seitenwechsel nicht springen.

## Responsive

Alles muss auch auf dem Handy (~375px) benutzbar sein: Seiten-Gutter `px-4 sm:px-8`,
mehrspaltige Raster und Karte-neben-Text erst ab `sm`/`md`/`lg` nebeneinander,
Button-Reihen mit `flex-wrap`, keine festen Breiten ohne `max-w-full`. Die
Seitenleiste ist unter `md` eine Schublade (Menü-Taste in der Kopfleiste).

## Messenger („Handy") — `components/phone/`

Der Messenger sieht bewusst aus wie eine Messenger-App, nicht wie der Rest der
Plattform: kein Banner, kein Seitentitel (`bare` in `components/AppShell.tsx`).

- **`PhoneFrame`**: auf dem Handy füllt das Display den Bildschirm, ab `sm` steht
  ein Gerät mit Gehäuse mittig auf der Seite. Alle Seiten unter `/handy` stecken
  darin; Kopfzeile einer App immer `PhoneHeader`, Avatare `PhoneAvatar`.
- **Handy wechseln** passiert nie auf dem Display, sondern in der Leiste über dem
  Gerät (Aufklappmenü „Handy von …"). „Alle Chats (mitlesen)" gibt es nur in der
  Nachrichten-Liste; Startbildschirm, Captic und „Neue SMS" sind immer aus Sicht
  eines eigenen Charakters (`useMyPhone`).
- **Look pro Charakter** (`lib/phone.ts`, Einstellungen → Meine Charaktere →
  `PhoneSettings`): Modell, Gehäusefarbe, Zustand (Kratzer/Sprünge liegen als
  Overlay über dem Display — auch mobil), Hintergrundbild, angedeutete Apps.
- **Startbildschirm** (`/handy`): angedeutete Apps sind reine Deko (`AppIcon`
  ohne Link); echte Apps stehen im Dock. Die Home-Leiste unten (bzw. der
  Home-Button des alten Modells) führt immer dorthin zurück.
- **Captic** (`/handy/captic`): fiktives Foto-Netzwerk, bisher nur angedeutet.
- **Sprechblasen:** eigene rechts in `bg-accent text-black`, fremde links in
  `bg-bg-surface-2`; nur die letzte Blase einer Folge hat die spitze Ecke. Bis zu
  drei Emojis ohne Text stehen groß ohne Blase. Reaktionen hängen als kleine Pills
  unter der Blase.
- **Antippen** einer Nachricht öffnet ein Blatt von unten (Reaktionen, Antworten,
  Kopieren, Löschen) — keine Hover-Menüs, damit es mobil gleich funktioniert.
- **Eingabe:** immer `Composer`; Emoji-, GIF- und Plus-Feld klappen darunter auf
  wie eine Tastatur. Eingabefelder im Handy haben mobil `text-[16px]` (sonst zoomt
  iOS hinein).
- **Zeit:** Blasen tragen keine Uhrzeit (die echte wäre 2026). Das Inplay-Datum
  steht als Tagestrenner im Chat (Plus → „Inplay-Datum").

## Detailseiten (Szene, Charakter, Ort)

- Aktions-Buttons („Bearbeiten") rechts **über** der Trennlinie; die Seite zeichnet
  die Linie selbst (`ownsDivider` in `components/AppShell.tsx`).
- Button-Stil: `rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5
  text-[0.8125rem]`; Primär-Aktion `bg-accent/90 text-black`.
- Abschnitte mit `font-display lowercase text-[2rem] text-accent` überschreiben;
  leere Abschnitte ausblenden statt Platzhaltertext zu zeigen.
- **Fakten** („facts.", „looks.", Steckbrief der Karte): immer `Facts` + `FactRow`
  aus `components/Facts.tsx` — graues Label fett in Großbuchstaben (`0.75rem`) samt
  Doppelpunkt, Wert daneben (`0.875rem`), lange Werte brechen um. Nie eigene
  `<dl>`-Klassen schreiben. Keine eckigen Tags.
- **Tabs:** runde Pills wie in der Szenen-Übersicht (aktiv `bg-accent text-black`).
- **Personen-Karten** („characters & npcs." am Ort): `CharacterBubble` +
  Faktenzeile als reiner Text mit Punkten (Alter · Beruf · Beziehung), Buttons
  rechts oben, Erläuterung darunter.
- **Relations im Charakterprofil:** gleiche Karte, aber statt der Bubble links ein
  eckiger Avatar (`h-20 w-20 rounded-md object-cover`), daneben Name, Faktenzeile,
  Buttons und Erläuterung.
- **Charakterprofil:** Kein Avatar am Profil-Banner; darunter mittig der Usertag
  als `Bubble`. Das Pinterest-Board steht nur im Reiter „General", als normaler
  Button.
