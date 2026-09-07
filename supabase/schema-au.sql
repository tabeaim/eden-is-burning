-- Szenen: Kennzeichnung "Alternate Universe" (Nicht-Canon-Plot)
-- Im Supabase SQL-Editor ausführen (Run).
alter table scenes add column if not exists au boolean not null default false;

-- Zwei Szenen exemplarisch als AU markieren
update scenes set au = true where id in ('s_nigellou', 's_gallery');
