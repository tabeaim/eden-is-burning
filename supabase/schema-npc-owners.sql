-- NPCs können mehreren Spieler*innen zugeordnet sein: zusätzlich zu player_id
-- (wer den NPC angelegt hat) eine Liste weiterer Spieler-IDs, die ihn bearbeiten
-- und für ihn schreiben dürfen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists co_owner_ids jsonb not null default '[]'::jsonb;
