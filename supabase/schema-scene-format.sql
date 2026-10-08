-- Szenen: Darstellung der Posts. 'script' = Drehbuch-Format (Regieanweisungen und
-- Dialog, siehe lib/script.ts); leer = normaler Fließtext.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table scenes add column if not exists format text;
