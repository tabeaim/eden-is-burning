-- Erweitertes Charakterprofil: alles, was über die bisherigen Spalten hinausgeht,
-- liegt gesammelt in einer JSON-Spalte (Geburtsdatum, Geschlecht, Studium/Arbeit,
-- versteckte Angaben, Skills, Eigenschaften, Slider, Likes/Dislikes, Timeline).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists profile jsonb not null default '{}'::jsonb;
