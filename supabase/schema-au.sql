-- Szenen: Kennzeichnung "Alternate Universe" (Nicht-Canon-Plot)
-- Im Supabase SQL-Editor ausführen (Run).
alter table scenes add column if not exists au boolean not null default false;
