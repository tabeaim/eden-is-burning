-- Spieler*innen-Profil: Header-Bild, Skills, Slider, Likes/Dislikes (wie bei den
-- Charakteren) gesammelt in einer JSON-Spalte.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table players add column if not exists profile jsonb not null default '{}'::jsonb;
