-- Szenen: benanntes Alternate Universe (z. B. „Noir 1947")
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table scenes add column if not exists au_name text;

-- Zwei Test-AUs für die beiden bereits als AU markierten Szenen
update scenes set au = true, au_name = 'Noir 1947'      where id = 's_nigellou' and au_name is null;
update scenes set au = true, au_name = 'Was wäre, wenn' where id = 's_gallery'  and au_name is null;
