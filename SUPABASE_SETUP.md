# Eden Is Burning → echtes Backend (Supabase)

Diese Anleitung bringt die App von „nur im eigenen Browser" auf eine **gemeinsame
Datenbank mit echtem Login**. Die Code-Vorbereitung ist erledigt — hier sind die
Schritte, die deine Supabase-Zugänge brauchen.

## Was schon vorbereitet ist
- `@supabase/supabase-js` installiert
- `supabase/schema.sql` — die komplette Datenbank-Struktur
- `lib/supabase.ts` — der Client für die App
- `scripts/seed.ts` + `npm run seed` — überträgt die Beispieldaten in die DB
- `.env.local.example` — Vorlage für die Zugangsdaten

---

## Schritt 1 — Supabase-Projekt anlegen (du)
1. Auf [supabase.com](https://supabase.com) einloggen → **New project**.
2. Name z. B. `eden-is-burning`, Region **Frankfurt (eu-central)**, ein
   Datenbank-Passwort setzen (irgendwo notieren).
3. Warten, bis das Projekt „ready" ist (~1 Min).

## Schritt 2 — Datenbank-Struktur einspielen (du)
1. Im Projekt links **SQL Editor** → **New query**.
2. Den ganzen Inhalt von `supabase/schema.sql` hineinkopieren → **Run**.
3. Sollte „Success" melden. (Tabellen erscheinen unter **Table Editor**.)

## Schritt 3 — Zugangsdaten holen (du)
Links **Project Settings → API**. Dort findest du:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** Key → `SUPABASE_SERVICE_ROLE_KEY` (geheim!)

Dann `.env.local.example` nach **`.env.local`** kopieren und die drei Werte
eintragen. (`.env.local` bleibt lokal, kommt nicht auf GitHub.)

## Schritt 4 — Beispieldaten hochladen (du, einmalig)
```bash
npm run seed
```
Überträgt alle Spieler·innen, Charaktere, Szenen, Posts usw. in die Datenbank.

## Schritt 5 — Login-Erweiterung einspielen (du)
Login-Modell: **Selbst-Registrierung mit Admin-Freischaltung.**
1. SQL Editor → New query → Inhalt von `supabase/schema-auth.sql` einfügen → **Run**.
   (Die „destructive"-Warnung wegen `drop policy` ist wie gehabt unbedenklich.)
   Damit: Spalten `approved`/`is_admin`, ein Trigger, der neue Registrierte mit
   einem players-Eintrag verknüpft, und RLS, die nur Freigeschaltete reinlässt.
   Bestehende Spieler*innen sind sofort frei; **tabeaim@gmail.com ist Admin**.

## Schritt 6 — E-Mail-Bestätigung ausschalten (du, empfohlen)
Da eh ein Admin freischaltet, ist die E-Mail-Bestätigung überflüssig und macht das
Anmelden nur umständlicher:
- Supabase → **Authentication → Sign In / Providers → Email** → „**Confirm email**"
  **ausschalten** (Toggle off), speichern.

## Schritt 7 — Code ist umgestellt (erledigt von mir)
`lib/store.tsx`, Login, „Warten auf Freischaltung"-Screen und die Admin-Ansicht
(Einstellungen → „Freischaltungen") sind gebaut. Zum Testen:
```bash
npm run dev
```
→ [localhost:3000](http://localhost:3000): registrieren, dann als Admin (deine
E-Mail) unter Einstellungen freischalten.

## Schritt 8 — Auf Vercel deployen (mit dir)
In Vercel beim Projekt unter **Settings → Environment Variables** die zwei
`NEXT_PUBLIC_…`-Werte hinterlegen (NICHT den Secret/service_role-Key), dann Deploy.
