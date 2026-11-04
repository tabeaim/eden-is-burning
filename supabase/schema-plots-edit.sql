-- Plots: bearbeiten dürfen neben Ersteller*in und Admins auch alle Betroffenen.
-- Wer betroffen ist, ergibt sich aus den Filtern und Szenen des Plots und wird in
-- der App geprüft; hier gilt: geteilte Plots darf jede*r Freigeschaltete ändern,
-- private nur Ersteller*in. Privat stellen kann nur, wer den Plot angelegt hat.
-- Löschen bleibt bei Ersteller*in und Admins.
-- Setzt schema-plots-private.sql voraus. Im Supabase SQL-Editor ausführen (Run).
-- Wiederholbar (idempotent).
drop policy if exists "plots update" on plots;
create policy "plots update" on plots for update to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
    or (public.is_approved() and not private)
  )
  with check (
    created_by = (select id from players where auth_user_id = auth.uid())
    or ((public.is_admin() or public.is_approved()) and not private)
  );
