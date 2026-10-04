-- Handy-Look pro Charakter (Modell, Gehäusefarbe, Abnutzung, Hintergrund, Apps).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists phone jsonb;
