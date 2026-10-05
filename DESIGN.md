# Design-System – Eden Is Burning

Kurze Regeln, damit gleiche Dinge überall gleich aussehen. Vor neuem UI erst hier
nachsehen und die vorhandenen Bausteine benutzen, statt Klassen neu zu erfinden.

## Texte

Als Gedankenstrich immer der Halbgeviertstrich „–" (mit Leerzeichen davor und
dahinter) – nie der lange Geviertstrich und nie ein Bindestrich als Ersatz. Gilt
auch für Kommentare.

## Charakter-Stufen (`lib/characters.ts`)

- **Main Character:** normaler Charakter, gehört einer Person. Volles Profil,
  eigenes Handy (auch im Profil sichtbar).
- **Supporting Character:** Nebenfigur, bestimmten Spieler*innen zugeordnet; nur
  sie bespielen und bearbeiten ihn. Reduziertes Profil, Handy nur reduziert
  einstellbar. Kann zum Main Character werden. Etikett „SC".
- **Statist*in:** Nebenfigur für alle – jede*r darf sie bearbeiten. „Bespielen"
  (`StatistActions`) fragt: nur zeitweise bespielen (bleibt Statist*in, auch für
  andere; jederzeit wieder „lösen") oder zum Supporting Character machen (dann
  nur noch mir zugeordnet). Etikett „Statist*in".
- Alle drei lassen sich direkt anlegen (`NewCharacterButton`).
- **Wer bespielt was:** `playsAs` / `canWriteAs` – Main: Besitzer*in; SC:
  Zugeordnete; Statist*in: wer sie gerade zeitweise bespielt (`co_owner_ids`).
  Bespielte Nebenfiguren stehen im Handy-Wechsel. Im „Antwort als"-Menü stehen
  die Main Characters; darunter findet das Suchfeld „SC oder Statist*in …" die
  zugeordneten SCs und alle Statist*innen.
- **Abonniert:** Szenen und Chats einer Nebenfigur erscheinen im Dashboard nur
  bei der Person, die dort selbst mit ihr gestartet oder geantwortet hat
  (`isSubscribed`) – mehrere können dieselbe Figur bespielen.

Etiketten nie von Hand schreiben, immer `tierLabel(c)` bzw. `TIER_NAMES`
(ausgeschrieben „Supporting Character" und „Statist*in"; als Etikett „SC"). Ohne
eigenes Bild zeigen alle den Silhouetten-Avatar (`characterImage`).

## Farben & Schrift

Tokens stehen in `app/globals.css` (`--accent`, `--olive`, `--bg-*`, `--text-*`,
`--border-*`). Display-Schrift (`font-display`) nur für Logo, Seitentitel und die
kleingeschriebenen Abschnitts-Überschriften mit Punkt („facts.", „scenes.").
Alles andere ist Montserrat. Standard-Textgröße `0.875rem`, Bubbles/Buttons
`0.8125rem`.

## Bubbles – `components/Bubble.tsx`

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

## Szenen-Boxen – `components/SceneCard.tsx`

Status steht links als Streichholz (`SceneMatch`): brennend/orange bei ungelesenem
neuestem Post, grau ohne Flamme wenn gelesen, abgebrannt mit Rauch bei geschlossener
Szene. Die Tags „aktiv"/„geschlossen" (`StatusBadge`) gibt es nur in der Szene selbst.
Szenen-Boxen nennen nur den Ort, nie die Gegend. Genau zwei Varianten:

Zeitangaben zu Posts immer als Datum + Uhrzeit, nie relativ („vor 18 Stunden").

1. **`SceneCard`** – ausführliche Karte: Titel, Ort (reiner Text, führt aufs Ortsprofil) · Datum in einer Zeile,
   Beteiligte als anklickbare Bubbles (wer dran ist, markiert), letzter Post. Szenen-Übersicht, Dashboard,
   Ortsprofil, Charakterprofil.
   Die ganze Box führt zur Szene; „Letzter Post" springt zum neuesten Post.
2. **`SceneRow`** – kompakte Zeile für schmale Spalten, überall identisch
   (Dashboard „letzte 24h", Gegend-Panel der Karte): Ort · Datum numerisch, rechts
   letzter Poster + Zeitpunkt.

## Formulare & Nachfragen

- **An/Aus:** immer `components/Toggle.tsx` (Schalter links, Beschriftung
  daneben), nie `<input type="checkbox">`.
- **Vorhandenes wählen oder Neues anlegen** (Ort, AU): `components/SuggestInput.tsx`
  – Vorschläge beim Tippen; gibt es das Getippte noch nicht, bietet die Liste
  „+ Neuen … erstellen" an. Orte: `LocationField` (kein Gegend-Feld; die Gegend
  kommt vom Ort. Ein neuer Ort fragt Name, Gegend und Beschreibung ab). AUs: `AuNameField`.
- **Datum:** immer `components/DatePicker.tsx` (kleiner Kalender, öffnet ohne Wert
  im Jahr 2021), nie `<input type="date">`.
- **Endgültige Aktionen** (löschen): `components/ConfirmDialog.tsx` mit klar
  benanntem Knopf („Plot löschen"), nie `window.confirm`.
- **Mehrfach-Filter:** `components/MultiSelect.tsx`.
- **Szene beantworten:** Das Antwortfeld klappt erst nach Klick auf „Antworten"
  auf. Antworten darf jede*r mit einem eigenen Charakter, auch in fremden Szenen;
  der Charakter lässt sich im Feld immer wechseln, und wer mit einem neuen
  Charakter schreibt, wird als Teilnehmer*in eingetragen. „Antworten",
  „Weitergeben" und „Beenden" stehen im Szenenkopf und noch einmal unter den Posts.
- **Rechtsklick auf eine Szenenbox** (`SceneCard`, `SceneRow`): kleines Menü an
  der Maus (`components/ContextMenu.tsx`) – „Als ungelesen/gelesen markieren".
- **Charakter wählen:** `components/CharacterSelect.tsx` (Aufklappliste mit
  Avatar), nie das Browser-eigene `<select>` – das lässt sich nicht stylen.
- **Text im Post markieren:** Die Auswahl bleibt stehen (normal kopierbar),
  darüber erscheint nur „Zitat hinzufügen".
- **Hover in der Szene:** Die Bio erscheint nur über dem Avatar (benannte Gruppe
  `group/ava`), Bearbeiten/Löschen eines Posts beim Hovern über dem Post
  (`group/post`) – verschachtelte Hover immer als benannte Gruppen.
- **Löschen** (Szene, Charakter, Chat): roter Rand-Button
  (`border-red-400/40 text-red-300`) im Bearbeiten-Bereich, immer mit
  `ConfirmDialog`, der nennt, was mit verschwindet; für wirklich Endgültiges mit
  fetter `warning`. Charaktere aller Stufen kommen zuerst in den **Papierkorb**
  (Einstellungen → Meine Charaktere, wiederherstellbar); erst von dort lässt sich
  endgültig löschen.
- **Profil bearbeiten:** Alles Inhaltliche (Tagline, Zitat, Texte, Looks, Facts,
  Banner) wird direkt im Profil bearbeitet (`ProfileEditPanel`). Unter
  Einstellungen → Meine Charaktere stehen nur Grunddaten (Name, Foto, Faceclaim,
  Rolle, Alter, Gegend) und Einstellungen (Handy, Zuordnung, Stufe, Löschen).
- **Einstellungen:** Reiter als runde Pills, Abschnitte mit Display-Überschrift
  („charaktere.", „npcs."), Buttons wie auf den Detailseiten. Ein Charakter oder
  NPC braucht immer einen Namen – „Neuer Charakter"/„Neuer NPC"
  (`NewCharacterButton`) fragt ihn vor dem Anlegen ab, Speichern ohne Namen geht nicht.
- **Alter Egos** im Seitenmenü klappen als Overlay über dem Menü auf (scrollbar),
  statt das Menü zu verschieben.
- **Zähler im Seitenmenü** (orange Pill): „Szenen" = alle ungelesenen Szenen,
  „Dashboard" = Bewegung bei den eigenen Charakteren (Szenen, Chats, Anrufe),
  „Handy" = ungelesene Chats und klingelnde Anrufe.
- **„Neu anlegen" in einer Bubble-Reihe:** gestrichelte Pill mit Plus und Text
  („+ Neuer Ort", „+ Als Plot speichern").

## Timeline

Der Zeitstrahl nutzt dieselben Bausteine wie die Szenenboxen (Karte mit Rahmen,
`SceneMatch` als Knoten auf der Linie), ergänzt um Datum über dem Titel und den
Beschreibungssatz. Die Faktenzeile ist reiner Text mit Punkten dazwischen:
zusammengerückte Profilbilder + Vornamen · Ort · AU – nichts davon anklickbar.
Plot-Logik (Filter, Sichtbarkeit) liegt in `lib/plots.ts`, die Plot-Zeile in
`components/PlotBar.tsx`; Timeline und Szenen-Übersicht nutzen beides. Umbenennen und
Löschen des geöffneten Plots kommen auf beiden Seiten aus `PlotTools` (ebenfalls `PlotBar.tsx`). Off-Szenen eines Plots sind
gestrichelt umrandet und tragen das Tag „im Off". AU-Szenen erscheinen nur, wenn
ihr AU im Filter gewählt ist – ohne Auswahl zeigt die Timeline nur Canon.

## Seitenbreite

Alle Seiten nutzen denselben Container `max-w-6xl mx-auto px-8` (auch als `width`
für den Banner-Titel), damit Titel und Inhalt beim Seitenwechsel nicht springen.

## Responsive

Alles muss auch auf dem Handy (~375px) benutzbar sein: Seiten-Gutter `px-4 sm:px-8`,
mehrspaltige Raster und Karte-neben-Text erst ab `sm`/`md`/`lg` nebeneinander,
Button-Reihen mit `flex-wrap`, keine festen Breiten ohne `max-w-full`. Die
Seitenleiste ist unter `md` eine Schublade (Menü-Taste in der Kopfleiste).

## Messenger („Handy") – `components/phone/`

Der Messenger sieht bewusst aus wie eine Messenger-App, nicht wie der Rest der
Plattform: kein Banner, kein Seitentitel (`bare` in `components/AppShell.tsx`).

- **`PhoneFrame`**: auf dem Handy füllt das Display den Bildschirm, ab `sm` steht
  ein Gerät mit Gehäuse mittig auf der Seite. Alle Seiten unter `/handy` stecken
  darin; Kopfzeile einer App immer `PhoneHeader`, Avatare `PhoneAvatar`.
- **Handy wechseln** passiert nie auf dem Display, sondern in der Leiste über dem
  Gerät (Aufklappmenü „Handy von …"). Die Nachrichten-Liste hat zwei Reiter
  (runde Pills): „Meine" (Chats dieses Handys) und „Alle" (mitlesen).
  Startbildschirm, Captic und „Neue SMS" sind immer aus Sicht eines eigenen
  Charakters (`useMyPhone`).
- **Look pro Charakter** (`lib/phone.ts`, Einstellungen → Meine Charaktere →
  `PhoneSettings`): Modell (iPhone neu/alt, Android, Burner Phone), Gehäusefarbe,
  Zustand (Kratzer/Sprünge liegen als Overlay über dem Display – auch mobil),
  Hintergrundbild (drei Vorlagen oder eigenes Bild), Apps, eigenes Profilbild
  fürs Handy (`PhoneAvatar` zeigt es überall im Handy statt des Charakterbilds). Standard-Apps sind
  immer da; wählbar sind nur optionale und selbst erstellte (Name + Icon),
  zusammen höchstens so viele, wie auf einen Startbildschirm passen.
- **Mitlesen:** Ist kein eigener Charakter im Chat, bleibt man auf dem eigenen
  Handy; alle Blasen stehen links mit Vorname und Avatar (wie ein Gruppenchat).
  Chat-Namen: eine Person mit vollem Namen, mehrere nur mit Vornamen
  (`chatTitle` in `lib/chats.ts`).
- **Liste:** Reiter „Meine" (Chats dieses Charakters) und „Andere" (alle übrigen,
  zum Mitlesen); die Taste „Archiv" daneben schaltet für den gewählten Reiter
  aufs Archiv um (nur Icon, kein Text). Dazu ein Suchfeld (Namen und Nachrichtentext; ein Treffer
  springt zur Nachricht). Archiviert ist ein Chat immer für
  alle; archivieren dürfen nur Beteiligte und Admins. Eine neue Nachricht holt den
  Chat aus dem Archiv.
- **Chat-Optionen** (archivieren, löschen, „Leave on read", „Als ungelesen
  markieren", bei pausierten Chats „Chat wieder aktivieren"): Rechtsklick bzw.
  langes Drücken auf den Chat in der Liste oder ⋯ in der Chat-Ansicht – immer als
  Blatt von unten (`components/phone/Sheet.tsx`). Löschen dürfen Beteiligte und
  Admins, immer mit `ConfirmDialog`.
- **Dashboard:** Chats erscheinen als `ChatRow` (`components/phone/ChatRow.tsx`,
  Aufbau wie `SceneRow`, Handy-Icon statt Streichholz) – in „letzte 24h" als
  „Neue Nachrichten bei A & B", unter „Du bist dran" als „Chat mit …" (nie mit
  Vorschau des Nachrichtentexts – nichts spoilern) samt Knopf
  „Leave on read" (pausiert den Chat, bis wieder jemand schreibt).
- **Captic ist optional** (An/Aus-Schalter in `PhoneSettings`); das Profil wird
  in der App auf dem Handy bearbeitet.
- **Telefon** (`/handy/telefon` Anrufliste, `/handy/kontakte` Kontakte; im Dock, „Neuer
  Anruf" im Seitenmenü führt zu den Kontakten): Anrufliste und Kontakte als Reiter unten. Aus den Kontakten:
  „anklingeln" (Inplay-Datum + Uhrzeit Pflicht) oder „Telefonszene erstellen".
  Ein eingehender Anruf liegt als Karte über dem Startbildschirm
  (`IncomingCall`, Annehmen/Ablehnen); nach dem Annehmen wird nach einer Szene
  gefragt. Angenommene Anrufe mit Szene verlinken aus der Anrufliste dorthin.
- **Telefonszenen** sind normale Szenen (Zusammenfassung, Timeline, Plots):
  Häkchen „Telefonat" im Neue-Szene-Formular bzw. beim Bearbeiten – dann ohne
  Gegend/Ort (`location_area: "phone"`, Ort „am Telefon" mit Handy-Icon in der
  Orts-Bubble) und ohne eigenen Titel „A & B on the phone". Vom Handy aus
  (Anruf-Dialog, nach dem Annehmen) entsteht die Szene direkt, nur mit
  optionalem Titel (`useCreatePhoneScene`).
- **Buttons im Handy:** Dialoge und Formulare nutzen die normalen Buttons des
  Design-Systems (`rounded-md`, Primär-Aktion `bg-accent/90 text-black`). Runde,
  farbige Knöpfe nur dort, wo das Handy selbst simuliert wird (Annehmen/Ablehnen,
  Senden, Dock).
- **Kontakte** (`ContactList`): oben die „Favoriten" (von Hand gesetzt, ohne
  farbige Hinterlegung; anfangs ein zufälliger), darunter alphabetisch die
  relevanten Kontakte – wer schon Kontakt hatte (Szene, Chat, Anruf, eigener
  Kontakt-Eintrag) oder von Hand als relevant markiert ist. Rechtsklick bzw.
  langes Drücken auf einen Kontakt setzt Favorit und „relevant". Die Pill neben
  dem Suchfeld schaltet zwischen „Relevante" und „Alle"; die Suche findet immer
  alle. Je Kontakt: anrufen
  (Zeile), Nachricht schreiben, bearbeiten. Jeder Kontakt lässt sich je Handy
  umbenennen und mit Foto versehen: Der Name gilt überall auf diesem Handy
  (`contactName`/`chatTitle(…, owner)`), das Foto nur bei Kontakten und Anrufen
  (`ContactAvatar`) – im Messenger immer `PhoneAvatar`.
- **Profilbilder im Handy** führen per Klick immer aufs Charakterprofil
  (`PhoneAvatar`/`ContactAvatar`; `link={false}` nur für reine Anzeige).
- **Dashboard** nennt Charaktere immer mit echtem Namen, nie mit Kontaktnamen.
- **Langes Drücken** ersetzt am Handy den Rechtsklick (`useLongPress`).
- **Handy wechseln:** Das Aufklappmenü zeigt nur Vornamen und je Handy einen
  orangen Zähler, wenn dort etwas Neues wartet (Punkt an der Taste, wenn es ein
  anderes Handy betrifft).
- **Anrufliste:** Rechtsklick auf einen Eintrag: „Anruf abbrechen" (eigener,
  klingelnder) und „Aus der Anrufliste löschen" (nur auf diesem Handy).
- **Handy im Charakterprofil** (Reiter „Handy", `PhonePreview`): Look,
  Startbildschirm und Kontaktliste nur zum Ansehen (`PhoneFrame preview`,
  `PhoneHome readOnly`) – nichts führt irgendwohin, nichts ist bearbeitbar.
- **Eingehender Anruf zuerst:** „Handy" im Seitenmenü öffnet das Handy des
  gerade angerufenen Charakters, die Anruf-Karte liegt über dem Startbildschirm.
  „Später reagieren" (nur Text) stellt sie zurück – der Anruf klingelt weiter und
  bleibt in der Telefon-App erreichbar. Einen eigenen klingelnden Anruf bricht
  man per Rechtsklick in der Anrufliste ab („abgebrochen").
- **Handy folgt dem Chat:** Öffnet man den Chat eines anderen eigenen Charakters,
  wechselt das Handy dauerhaft zu ihm.
- **Klingeln:** alles, was einen eingehenden Anruf meldet (Dashboard-Zeile,
  Banner im Display, Zähler im Menü, Telefon-App), vibriert mit `.phone-ring`
  (globals.css).
- **Gelesen/ungelesen:** Das Handy-Icon der `ChatRow` ist orange bei neuen
  Nachrichten und grau, sobald der Chat geöffnet wurde (wie das Streichholz).
- **Nachrichtentext ist markier- und kopierbar** – die Blase ist deshalb kein
  `<button>`; ist Text markiert, öffnen weder Klick noch Rechtsklick das Blatt.
- **Burner Phone:** altes Tastenhandy, nur SMS (kein Captic, keine Apps, keine
  GIFs/Fotos). Das Display stellt per `.phone-burner` (globals.css) die
  Farb-Tokens auf Graustufen um, darüber liegt ein grünes LCD-Overlay – im
  Burner-Display deshalb keine festen Farben verwenden.
- **Startbildschirm** (`/handy`): kein Datum, nur Apps. Angedeutete Apps sind
  reine Deko (`AppIcon` ohne Link) – Ausnahme „Einstellungen", die in die
  Charakter-Einstellungen führt; echte Apps (Telefon, Nachrichten, Captic)
  stehen im Dock. Die Home-Leiste unten (bzw. der
  Home-Button des alten Modells) führt immer dorthin zurück.
- **Captic** (`/handy/captic`): fiktives Foto-Netzwerk, bisher nur angedeutet.
- **Sprechblasen:** eigene rechts in `bg-accent text-black`, fremde links in
  `bg-bg-surface-2`; nur die letzte Blase einer Folge hat die spitze Ecke. Bis zu
  drei Emojis ohne Text stehen groß ohne Blase. Reaktionen hängen als kleine Pills
  unter der Blase.
- **Antippen oder Rechtsklick** auf eine Nachricht öffnet ein Blatt von unten
  (Reaktionen, Antworten, Kopieren, Bearbeiten, Löschen) – keine Hover-Menüs,
  damit es mobil gleich funktioniert. Bearbeiten und Löschen nur bei eigenen
  Nachrichten (Admins: alle).
- **Eingabe:** immer `Composer`; Emoji-, GIF- und Plus-Feld klappen darunter auf
  wie eine Tastatur. Eingabefelder im Handy haben mobil `text-[16px]` (sonst zoomt
  iOS hinein).
- **Zeit:** nie die echte. Jeder Chat beginnt mit einem Tagestrenner
  (Inplay-Datum, Pflicht bei „Neue SMS"; weitere über Plus → „Inplay-Datum").
  Jede Nachricht trägt eine Inplay-Uhrzeit: Die Eingabezeile schlägt die letzte
  Uhrzeit + 1 Minute vor, änderbar per Zeitfeld oder +1/+3/+9/+24.

## Detailseiten (Szene, Charakter, Ort)

- Aktions-Buttons („Bearbeiten") rechts **über** der Trennlinie; die Seite zeichnet
  die Linie selbst (`ownsDivider` in `components/AppShell.tsx`).
- Button-Stil: `rounded-md border border-border-subtle bg-white/[0.04] px-3 py-1.5
  text-[0.8125rem]`; Primär-Aktion `bg-accent/90 text-black`.
- Abschnitte mit `font-display lowercase text-[2rem] text-accent` überschreiben;
  leere Abschnitte ausblenden statt Platzhaltertext zu zeigen.
- **Fakten** („facts.", „looks.", Steckbrief der Karte): immer `Facts` + `FactRow`
  aus `components/Facts.tsx` – graues Label fett in Großbuchstaben (`0.75rem`) samt
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
