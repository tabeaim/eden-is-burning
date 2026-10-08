-- Orte: Kategorie je Ort (home | food | nightlife | outdoor | business | education |
-- culture | infrastructure | lodging | other – siehe lib/places.ts). Leer heißt:
-- die App errät die Kategorie aus dem Namen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table locations add column if not exists category text;
