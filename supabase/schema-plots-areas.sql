-- Plots: Gegend-Filter mitspeichern
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
alter table plots add column if not exists areas jsonb not null default '[]'::jsonb;
