-- Orte: Ortsprofil (Titelbild, Inspo-Fotos, Pinterest) + wer den Ort erstellt hat
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table locations add column if not exists created_by text references players(id) on delete set null;
alter table locations add column if not exists image_url text;
alter table locations add column if not exists images jsonb not null default '[]'::jsonb;
alter table locations add column if not exists pinterest_url text;

-- Orte anlegen dürfen alle Freigeschalteten; bearbeiten nur Admins und wer den
-- Ort erstellt hat; löschen nur Admins. (Lesen bleibt bei "read approved".)
drop policy if exists "write approved" on locations;
drop policy if exists "locations insert" on locations;
drop policy if exists "locations update" on locations;
drop policy if exists "locations delete" on locations;

create policy "locations insert" on locations for insert to authenticated
  with check (public.is_approved());

create policy "locations update" on locations for update to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );

create policy "locations delete" on locations for delete to authenticated
  using (public.is_admin());
