-- Eden Is Burning — Login mit Selbst-Registrierung + Admin-Freischaltung
-- --------------------------------------------------------------------------
-- NACH supabase/schema.sql ausführen (Supabase → SQL Editor → New query → Run).
-- Wiederholbar (idempotent).

-- === 1) Zusätzliche Spalten auf players ====================================
alter table players add column if not exists approved boolean not null default false;
alter table players add column if not exists is_admin boolean not null default false;
-- (auth_user_id existiert bereits aus schema.sql)

-- Bestehende, geseedete Spieler*innen sind sofort freigeschaltet.
update players set approved = true;
-- Tabea ist Admin.
update players set is_admin = true where lower(email) = 'tabeaim@gmail.com';

-- === 2) Neuer Auth-User → players-Eintrag ==================================
-- Registriert sich jemand, wird ein passender players-Eintrag per E-Mail
-- verknüpft; gibt es keinen, wird ein neuer, NICHT freigeschalteter angelegt.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing players%rowtype;
begin
  select * into existing from players where lower(email) = lower(new.email) limit 1;
  if found then
    update players set auth_user_id = new.id where id = existing.id;
  else
    insert into players (id, username, email, auth_user_id, approved)
    values (
      'p_' || substr(replace(new.id::text, '-', ''), 1, 8),
      split_part(new.email, '@', 1),
      new.email,
      new.id,
      false
    );
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- === 3) Hilfsfunktionen (Freischaltung / Admin) ============================
create or replace function public.is_approved()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from players where auth_user_id = auth.uid() and approved);
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from players where auth_user_id = auth.uid() and is_admin);
$$;

-- === 4) RLS-Policies auf Freischaltung umstellen ===========================
-- Nur freigeschaltete Nutzer*innen sehen & bearbeiten die Welt. Ausnahme:
-- die eigene players-Zeile ist immer lesbar (für die "Wartet auf Freischaltung"-
-- Ansicht). players anlegen/löschen bleibt der DB/Trigger bzw. Admins vorbehalten.

do $$
declare t text;
begin
  -- Content-Tabellen: alles für Freigeschaltete
  foreach t in array array['characters','scenes','posts','locations','quotes']
  loop
    execute format('drop policy if exists "read for authenticated" on %I;', t);
    execute format('drop policy if exists "write for authenticated" on %I;', t);
    execute format('drop policy if exists "read approved" on %I;', t);
    execute format('drop policy if exists "write approved" on %I;', t);
    execute format('create policy "read approved" on %I for select to authenticated using (public.is_approved());', t);
    execute format('create policy "write approved" on %I for all to authenticated using (public.is_approved()) with check (public.is_approved());', t);
  end loop;
end $$;

-- players separat (eigene Zeile immer lesbar; Updates: Admin oder eigene Zeile)
drop policy if exists "read for authenticated" on players;
drop policy if exists "write for authenticated" on players;
drop policy if exists "players read" on players;
drop policy if exists "players update" on players;

create policy "players read" on players for select to authenticated
  using (public.is_approved() or auth_user_id = auth.uid());

create policy "players update" on players for update to authenticated
  using (public.is_admin() or auth_user_id = auth.uid())
  with check (public.is_admin() or auth_user_id = auth.uid());
