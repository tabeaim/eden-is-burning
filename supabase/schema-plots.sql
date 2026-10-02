-- Timeline: Plots (gespeicherte Filter + von Hand ergänzte/entfernte Szenen + Off-Szenen)
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists plots (
  id          text primary key,
  name        text not null,
  tokens      jsonb not null default '[]'::jsonb,   -- ["char:<id>", "player:<id>"]
  aus         jsonb not null default '[]'::jsonb,   -- AU-Namen
  include_ids jsonb not null default '[]'::jsonb,   -- zusätzlich aufgenommene Szenen
  exclude_ids jsonb not null default '[]'::jsonb,   -- herausgenommene Szenen
  off_scenes  jsonb not null default '[]'::jsonb,   -- nicht ausgespielte Plot-Punkte
  created_by  text references players(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Lesen + anlegen: alle Freigeschalteten; ändern/löschen: Ersteller*in und Admins
alter table plots enable row level security;

drop policy if exists "plots read" on plots;
drop policy if exists "plots insert" on plots;
drop policy if exists "plots update" on plots;
drop policy if exists "plots delete" on plots;

create policy "plots read" on plots for select to authenticated
  using (public.is_approved());

create policy "plots insert" on plots for insert to authenticated
  with check (public.is_approved());

create policy "plots update" on plots for update to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );

create policy "plots delete" on plots for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );
