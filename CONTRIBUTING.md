# Mitarbeiten an Eden Is Burning

Anleitung zum Einrichten und für die Arbeitsweise. Gilt für Menschen und für
Claude Code (das liest diese Datei über `AGENTS.md` mit).

## Überblick

| Branch            | Vercel             | Datenbank (Supabase) |
| ----------------- | ------------------ | -------------------- |
| `main`            | Production (live)  | Live-DB              |
| `stage` und alle anderen Branches | Preview | „eden stage" (Testdaten) |

Zugang zu Vercel oder Supabase brauchst du nicht. Du arbeitest lokal gegen die
Stage-Datenbank, pushst einen eigenen Branch und machst einen Pull Request. Tabea
schaut ihn an und merged nach `main`.

## 1. Einmalig einrichten

1. **Node.js** installieren (Version 20 oder neuer, am besten die aktuelle
   LTS-Version von [nodejs.org](https://nodejs.org)). Prüfen mit `node -v`.
2. **Repo klonen** und hineinwechseln:
   ```bash
   git clone https://github.com/tabeaim/eden-is-burning.git
   cd eden-is-burning
   ```
3. **Pakete installieren:**
   ```bash
   npm install
   ```
4. **Umgebungsvariablen anlegen:** `.env.local.example` nach `.env.local`
   kopieren und die Werte eintragen, die du von Tabea bekommst:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...        # Stage-Projekt
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Stage-Projekt
   NEXT_PUBLIC_GIPHY_API_KEY=          # optional, sonst GIFs nur per Link
   ```
   `SUPABASE_SERVICE_ROLE_KEY` bleibt leer, den brauchst du nicht.
   `.env.local` ist von Git ausgeschlossen und darf nie committet werden.
5. **Starten:**
   ```bash
   npm run dev
   ```
   Dann [http://localhost:3000](http://localhost:3000) öffnen und mit dem
   Stage-Login einloggen (Zugangsdaten von Tabea).

## 2. Arbeitsablauf

1. Aktuellen Stand holen und einen eigenen Branch anlegen:
   ```bash
   git checkout main
   git pull
   git checkout -b vera/kurzer-name
   ```
2. Ändern, lokal ausprobieren.
3. Vor jedem Commit:
   ```bash
   npm run typecheck
   ```
   Erst committen, wenn das ohne Fehler durchläuft.
4. Branch pushen (`git push -u origin vera/kurzer-name`) und auf GitHub einen
   Pull Request nach `main` aufmachen. Vercel baut automatisch eine
   Preview-Version gegen die Stage-DB, der Link erscheint im Pull Request.
5. **Nie direkt auf `main` pushen** – das geht sofort live.

## 3. Regeln im Code

- **Next.js ist eine neue Version** mit Änderungen gegenüber älteren Anleitungen.
  Vor dem Schreiben von Code die passende Doku in `node_modules/next/dist/docs/`
  lesen.
- **Design:** Vor neuem UI `DESIGN.md` lesen und die vorhandenen Bausteine
  benutzen (Bubbles, SceneCards usw.), statt neue Klassen zu erfinden.
- **Gedankenstrich:** immer der Halbgeviertstrich „–" mit Leerzeichen, nie der
  lange Strich und nie ein Bindestrich als Ersatz. Gilt auch für Kommentare.
- **Profile im Gleichlauf:** Änderungen am Charakterprofil immer auch im
  Spieler*innen-Profil umsetzen (und umgekehrt).
- **Texte in der App** sind Deutsch und gendern mit Sternchen (Spieler*innen).
- **Datenbank-Änderungen:** nie direkt in Supabase, sondern als neue Datei
  `supabase/schema-<thema>.sql` und zusätzlich in `supabase/stage-setup.sql`
  nachziehen. Tabea führt sie auf Stage und live aus. Im Pull Request
  erwähnen, dass eine SQL-Datei dabei ist.
- **Kein `git stash`.**

## 4. Öffentliches Repo – was nie hinein darf

Das Repo ist öffentlich. Deshalb nie committen:

- Keys, Passwörter, `.env`-Dateien
- Datenbank-Backups (`backup_*.sql`, alles unter `backups/`)
- echte Daten aus der Live-DB (Chats, Profile, E-Mail-Adressen von
  Mitspieler*innen) – für Tests nur erfundene Daten und `@example.com`-Adressen

Vor dem Commit kurz mit `git status` prüfen, was wirklich mitgeht.

## Für Claude Code

Wenn du als Claude Code in diesem Repo arbeitest: Halte dich an die Regeln oben,
arbeite auf einem eigenen Branch, führe vor jedem Commit `npm run typecheck` aus
und pushe nie auf `main`. Schreib Commit-Nachrichten auf Deutsch und so, dass
man versteht, was sich für Spieler*innen ändert.
