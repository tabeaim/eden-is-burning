-- Captic: Markierungen auf Bildern und Likes an Kommentaren.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
-- Die neuen Aktivitäten (mention | tag | comment_like) brauchen keine Änderung:
-- captic_events.kind ist freier Text.

-- Auf dem Bild markierte Profile: [{ character_id, x, y }] – x/y als Anteil (0–1)
alter table captic_posts add column if not exists tags jsonb not null default '[]'::jsonb;

-- Charakter-IDs, die den Kommentar geliket haben
alter table captic_comments add column if not exists liked_by jsonb not null default '[]'::jsonb;
