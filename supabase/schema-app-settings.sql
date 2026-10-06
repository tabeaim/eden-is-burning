-- App-weite Einstellungen (Einstellungen → Admin → Design): Akzentfarbe und eigene
-- Header-Bilder je Seite. Eine Zeile mit key = 'app'; lesen dürfen alle
-- Freigeschalteten, schreiben nur Admins.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "app_settings read" on app_settings;
drop policy if exists "app_settings write" on app_settings;

create policy "app_settings read" on app_settings for select to authenticated
  using (public.is_approved());

create policy "app_settings write" on app_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on app_settings to authenticated;
