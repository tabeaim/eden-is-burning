-- Szenen als Entwurf: Wer beim Erstellen den ersten Post nur als Entwurf speichert,
-- legt die ganze Szene als Entwurf an. Sie ist nur für diese Person sichtbar, bis
-- der erste Post veröffentlicht wird (dann wird `draft` wieder false).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table scenes add column if not exists draft boolean not null default false;
