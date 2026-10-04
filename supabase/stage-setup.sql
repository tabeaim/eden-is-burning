-- Eden Is Burning — komplette Datenbank-Struktur für ein NEUES, leeres Projekt (z. B. eden stage).
-- Zusammengesetzt aus den Einzeldateien in supabase/, in der richtigen Reihenfolge.
-- Im Supabase SQL-Editor als Ganzes einfügen und ausführen (Run). Wiederholbar.
-- Ohne die Test-NPCs aus schema-npcs.sql (die setzen geseedete Spieler*innen voraus).


-- ############################################################
-- ## schema.sql
-- ############################################################

-- Eden Is Burning — Datenbank-Schema für Supabase (Postgres)
-- --------------------------------------------------------------------------
-- Einmalig im Supabase SQL-Editor ausführen (Dashboard → SQL Editor → New query).
-- Spiegelt exakt die Typen aus lib/types.ts. IDs bleiben Text (z. B. "p_tabs"),
-- damit die vorhandenen Seed-Daten & Beziehungen 1:1 übernommen werden können.

-- === Tabellen ===============================================================

create table if not exists players (
  id               text primary key,
  username         text not null unique,
  email            text not null unique,
  avatar_url       text,
  bio              text,
  created_at       timestamptz not null default now(),
  last_seen        timestamptz not null default now(),
  current_location jsonb,                      -- { path, label, at }
  -- Verknüpfung zum echten Login (Supabase Auth). Wird beim ersten Login gesetzt.
  auth_user_id     uuid references auth.users(id) on delete set null
);

create table if not exists characters (
  id                   text primary key,
  player_id            text not null references players(id) on delete cascade,
  name                 text not null,
  faceclaim            text,
  faceclaim_image_url  text,
  banner_url           text,
  tagline              text,
  role                 text,
  age                  int,
  area                 text not null,
  bio                  text,
  pinterest_url        text,
  created_at           timestamptz not null default now(),
  -- LOOKS
  height               text,
  figure               text,
  hair                 text,
  eyes                 text,
  -- FACTS
  full_name            text,
  sexuality            text,
  status               text,
  origin               text,
  -- OCCUPATION
  job                  text,
  company              text,
  -- sonstiges
  quote                text,
  personality          text,
  relationships        jsonb not null default '{}'::jsonb
);

create table if not exists scenes (
  id              text primary key,
  title           text not null,
  location_area   text not null,
  location_name   text not null,
  inplay_date     text,                        -- ISO-Datum als Text (wie in der App)
  inplay_time     text,
  status          text not null default 'active' check (status in ('active','closed')),
  trigger_warning boolean not null default false,
  created_at      timestamptz not null default now(),
  participant_ids text[] not null default '{}',
  summary         text,
  header_url      text
);

create table if not exists posts (
  id           text primary key,
  scene_id     text not null references scenes(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  content      text not null,
  post_number  int not null,
  created_at   timestamptz not null default now()
);

create table if not exists locations (
  id          text primary key,
  area        text not null,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists quotes (
  id           text primary key,
  scene_id     text not null references scenes(id) on delete cascade,
  post_id      text not null references posts(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  text         text not null,
  created_at   timestamptz not null default now()
);

-- Häufige Zugriffs-Pfade beschleunigen
create index if not exists idx_characters_player on characters(player_id);
create index if not exists idx_posts_scene       on posts(scene_id);
create index if not exists idx_quotes_scene       on quotes(scene_id);
create index if not exists idx_locations_area     on locations(area);

-- === Row Level Security (RLS) ==============================================
-- Kleine, vertraute Rollenspiel-Gruppe: jede*r eingeloggte Spieler*in darf
-- die ganze Welt lesen und bearbeiten (wie bisher lokal). Später verschärfbar
-- (z. B. "nur eigene Charaktere editierbar"). Der Seed-Import nutzt den
-- service_role-Key und umgeht RLS ohnehin.

alter table players    enable row level security;
alter table characters enable row level security;
alter table scenes     enable row level security;
alter table posts      enable row level security;
alter table locations  enable row level security;
alter table quotes     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['players','characters','scenes','posts','locations','quotes']
  loop
    execute format('drop policy if exists "read for authenticated" on %I;', t);
    execute format('drop policy if exists "write for authenticated" on %I;', t);
    -- Lesen: alle eingeloggten Nutzer*innen
    execute format(
      'create policy "read for authenticated" on %I for select to authenticated using (true);', t);
    -- Schreiben (insert/update/delete): alle eingeloggten Nutzer*innen
    execute format(
      'create policy "write for authenticated" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;


-- ############################################################
-- ## schema-auth.sql
-- ############################################################

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


-- ############################################################
-- ## schema-login-username.sql
-- ############################################################

-- Login mit Username ODER E-Mail ermöglichen
-- --------------------------------------------------------------------------
-- Supabase-Auth meldet intern immer per E-Mail an. Diese Funktion übersetzt
-- eine Eingabe (Username oder E-Mail) in die zugehörige E-Mail, damit sich
-- Spieler*innen auch mit ihrem Username anmelden können.
-- Im SQL-Editor ausführen (Run).

create or replace function public.email_for_login(identifier text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from players
  where lower(email) = lower(identifier)
     or lower(username) = lower(identifier)
  limit 1;
$$;

-- Muss vor dem Login (ohne Session) aufrufbar sein:
grant execute on function public.email_for_login(text) to anon, authenticated;


-- ############################################################
-- ## schema-au.sql
-- ############################################################

-- Szenen: Kennzeichnung "Alternate Universe" (Nicht-Canon-Plot)
-- Im Supabase SQL-Editor ausführen (Run).
alter table scenes add column if not exists au boolean not null default false;

-- Zwei Szenen exemplarisch als AU markieren
update scenes set au = true where id in ('s_nigellou', 's_gallery');


-- ############################################################
-- ## schema-au-names.sql
-- ############################################################

-- Szenen: benanntes Alternate Universe (z. B. „Noir 1947")
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table scenes add column if not exists au_name text;

-- Zwei Test-AUs für die beiden bereits als AU markierten Szenen
update scenes set au = true, au_name = 'Noir 1947'      where id = 's_nigellou' and au_name is null;
update scenes set au = true, au_name = 'Was wäre, wenn' where id = 's_gallery'  and au_name is null;

-- ############################################################
-- ## schema-scene-turn-pause.sql
-- ############################################################

-- Szenen: manuelle Zug-Übergabe + Pausieren
-- Im Supabase SQL-Editor ausführen (Run).

-- Wer ist als Nächstes dran (überschreibt die automatische Reihenfolge; einmalig,
-- wird beim nächsten Post wieder geleert). NULL = normale Reihenfolge.
alter table scenes add column if not exists next_up text;

-- Pausierte Szenen erscheinen nicht im Dashboard-Tracker.
alter table scenes add column if not exists paused boolean not null default false;


-- ############################################################
-- ## schema-locations-profile.sql
-- ############################################################

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


-- ############################################################
-- ## schema-npcs.sql
-- ############################################################

-- NPCs (Nebenfiguren ohne eigenes Profil) + „Characters & NPCs" am Ortsprofil
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists npcs (
  id         text primary key,
  name       text not null,
  role       text,
  age        int,
  created_by text references players(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Am Ort hinterlegte Charaktere/NPCs: [{ kind: "character"|"npc", id, note }]
alter table locations add column if not exists people jsonb not null default '[]'::jsonb;

-- NPCs: lesen + anlegen alle Freigeschalteten; ändern/löschen Admins und Ersteller*in
alter table npcs enable row level security;

drop policy if exists "npcs read" on npcs;
drop policy if exists "npcs insert" on npcs;
drop policy if exists "npcs update" on npcs;
drop policy if exists "npcs delete" on npcs;

create policy "npcs read" on npcs for select to authenticated
  using (public.is_approved());

create policy "npcs insert" on npcs for insert to authenticated
  with check (public.is_approved());

create policy "npcs update" on npcs for update to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );

create policy "npcs delete" on npcs for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );



-- ############################################################
-- ## schema-npc-profiles.sql
-- ############################################################

-- NPCs bekommen Profile wie Charaktere: sie leben ab jetzt in der Tabelle
-- characters (is_npc = true) statt in einer eigenen npcs-Tabelle.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists is_npc boolean not null default false;

-- Bestehende NPCs übernehmen (IDs bleiben gleich, Orts-Zuordnungen gelten weiter)
-- und die alte Tabelle entfernen.
do $$
begin
  if to_regclass('public.npcs') is not null then
    insert into characters (id, player_id, name, role, age, area, is_npc, created_at)
    select
      n.id,
      coalesce(n.created_by, (select id from players where is_admin order by created_at limit 1)),
      n.name, n.role, n.age, '', true, n.created_at
    from npcs n
    on conflict (id) do nothing;
    drop table npcs;
  end if;
end $$;


-- ############################################################
-- ## schema-plots.sql
-- ############################################################

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


-- ############################################################
-- ## schema-plots-areas.sql
-- ############################################################

-- Plots: Gegend-Filter mitspeichern
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
alter table plots add column if not exists areas jsonb not null default '[]'::jsonb;


-- ############################################################
-- ## schema-storage.sql
-- ############################################################

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


-- ############################################################
-- ## schema-realtime.sql
-- ############################################################

-- Live-Abgleich: Änderungen an diesen Tabellen werden an alle offenen Browser
-- geschickt (neue Posts, Szenen, Zitate, „zuletzt online").
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

do $$
declare t text;
begin
  foreach t in array array['posts', 'scenes', 'players', 'quotes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ############################################################
-- ## schema-messenger.sql
-- ############################################################

-- Messenger („Handy"): Chats zwischen Charakteren und ihre Nachrichten.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists chats (
  id              text primary key,
  participant_ids jsonb not null default '[]'::jsonb,   -- Charakter-IDs
  created_by      text references players(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists chat_messages (
  id           text primary key,
  chat_id      text not null references chats(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  kind         text not null default 'text',            -- text | gif | image | date
  content      text not null,
  reply_to     text references chat_messages(id) on delete set null,
  reactions    jsonb not null default '{}'::jsonb,      -- { "❤️": ["<charakter-id>"] }
  created_at   timestamptz not null default now()
);

create index if not exists idx_chat_messages_chat on chat_messages(chat_id, created_at);

-- Wie bei Szenen/Posts: alle Freigeschalteten dürfen lesen und schreiben
-- (Reaktionen ändern fremde Nachrichten-Zeilen).
alter table chats         enable row level security;
alter table chat_messages enable row level security;

do $$
declare t text;
begin
  foreach t in array array['chats', 'chat_messages']
  loop
    execute format('drop policy if exists "%s approved all" on %I', t, t);
    execute format(
      'create policy "%s approved all" on %I for all to authenticated
         using (public.is_approved()) with check (public.is_approved())', t, t);

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

grant select, insert, update, delete on chats, chat_messages to authenticated;
grant all on chats, chat_messages to service_role;


-- ############################################################
-- ## schema-phone.sql
-- ############################################################

-- Handy-Look pro Charakter (Modell, Gehäusefarbe, Abnutzung, Hintergrund, Apps).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists phone jsonb;


-- ############################################################
-- ## Zugriffsrechte (Grants)
-- ############################################################

-- Neue Supabase-Projekte geben den API-Rollen nicht mehr automatisch Rechte auf
-- Tabellen in `public` – ohne diese Grants scheitert jede Abfrage mit
-- „permission denied for table …", noch bevor die RLS-Policies greifen.
-- Was eine angemeldete Person tatsächlich sehen/ändern darf, regeln weiterhin
-- die Policies oben. `anon` bekommt bewusst keine Tabellenrechte (nur
-- email_for_login). Wiederholbar (idempotent).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Auch für Tabellen, die später angelegt werden
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
