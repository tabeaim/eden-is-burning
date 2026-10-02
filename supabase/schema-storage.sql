-- Bilder in Supabase Storage statt als Text in der Datenbank + eigener
-- Dashboard-Header pro Spieler*in.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

-- Öffentlicher Bucket: Bilder sind über ihre Adresse für alle ladbar (nötig, damit
-- der Browser sie normal anzeigen und zwischenspeichern kann).
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- Hochladen: nur freigeschaltete Spieler*innen. Löschen/Ersetzen: wer die Datei
-- hochgeladen hat, oder Admins.
drop policy if exists "images upload" on storage.objects;
drop policy if exists "images update" on storage.objects;
drop policy if exists "images delete" on storage.objects;

create policy "images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.is_approved());

create policy "images update" on storage.objects for update to authenticated
  using (bucket_id = 'images' and (owner = auth.uid() or public.is_admin()))
  with check (bucket_id = 'images');

create policy "images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (owner = auth.uid() or public.is_admin()));

-- Eigener Header für das Dashboard (Einstellungen → Darstellung)
alter table players add column if not exists dashboard_header_url text;
