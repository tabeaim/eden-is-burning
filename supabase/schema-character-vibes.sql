-- „Vibes" für Charaktere: Inspo-Bilder im Profil (Supporting Characters und
-- Statist*innen), als Liste von Bild-Adressen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists vibes jsonb not null default '[]'::jsonb;
