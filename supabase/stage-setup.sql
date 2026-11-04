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

-- Inplay-Uhrzeit der Nachricht („23:41") — created_at bestimmt nur die Reihenfolge
alter table chat_messages add column if not exists inplay_time text;

-- „Left on read" ({ "<charakter-id>": "<nachricht-id>" }) und Archiv je Charakter
alter table chats add column if not exists left_on_read jsonb not null default '{}'::jsonb;
alter table chats add column if not exists archived_by  jsonb not null default '[]'::jsonb;

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
-- ## schema-calls.sql
-- ############################################################

-- Telefon („Handy"): Anrufe zwischen Charakteren — Anklingeln, Annehmen/Ablehnen
-- und die Anrufliste. Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

create table if not exists calls (
  id          text primary key,
  caller_id   text not null references characters(id) on delete cascade,
  callee_id   text not null references characters(id) on delete cascade,
  inplay_date text not null,                      -- ISO-Datum als Text
  inplay_time text,                               -- „22:10"
  status      text not null default 'ringing',    -- ringing | accepted | declined
  scene_id    text references scenes(id) on delete set null,  -- Telefonszene, falls erstellt
  created_at  timestamptz not null default now()
);

alter table calls enable row level security;

drop policy if exists "calls approved all" on calls;
create policy "calls approved all" on calls for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;

grant select, insert, update, delete on calls to authenticated;
grant all on calls to service_role;


-- ############################################################
-- ## schema-npc-owners.sql
-- ############################################################

-- NPCs können mehreren Spieler*innen zugeordnet sein: zusätzlich zu player_id
-- (wer den NPC angelegt hat) eine Liste weiterer Spieler-IDs, die ihn bearbeiten
-- und für ihn schreiben dürfen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists co_owner_ids jsonb not null default '[]'::jsonb;


-- ############################################################
-- ## schema-reads.sql
-- ############################################################

-- Gelesen-Status pro Spieler*in (Szenen und Chats) in der Datenbank statt nur im
-- Browser – damit er Geräte, Browser und neue Deployments übersteht.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists read_marks (
  player_id text not null references players(id) on delete cascade,
  item_id   text not null,                 -- Szenen- oder Chat-ID
  seen_at   timestamptz not null default now(),
  primary key (player_id, item_id)
);

-- Jede*r sieht und ändert nur den eigenen Gelesen-Status
alter table read_marks enable row level security;

drop policy if exists "read_marks own" on read_marks;
create policy "read_marks own" on read_marks for all to authenticated
  using (player_id = (select id from players where auth_user_id = auth.uid()))
  with check (player_id = (select id from players where auth_user_id = auth.uid()));

grant select, insert, update, delete on read_marks to authenticated;
grant all on read_marks to service_role;

-- Live-Abgleich: Gelesen/Ungelesen auf einem Gerät erscheint sofort auf allen
-- anderen Geräten derselben Person.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'read_marks'
  ) then
    alter publication supabase_realtime add table public.read_marks;
  end if;
end $$;


-- ############################################################
-- ## schema-npc-tiers.sql
-- ############################################################

-- Nebenfiguren in zwei Stufen: Statist*innen ('extra', liegen bei den Statist*innen
-- und können von allen bearbeitet und zeitweise bespielt werden) und Supporting
-- Characters ('supporting', bestimmten Spieler*innen zugeordnet). Main Characters
-- sind die normalen Charaktere (is_npc = false).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists npc_tier text;

-- Bisherige NPCs einordnen (nur die, die noch keine Stufe haben): zunächst alle
-- Supporting Character …
update characters set npc_tier = 'supporting' where is_npc and npc_tier is null;

-- … und, solange es noch gar keine Statist*innen gibt, die zwei ältesten
-- Supporting Characters außer Aleks zu Statist*innen machen.
update characters
set npc_tier = 'extra'
where id in (
  select id from characters
  where is_npc and npc_tier = 'supporting' and name not ilike 'aleks%'
  order by created_at
  limit 2
)
and not exists (select 1 from characters where is_npc and npc_tier = 'extra');


-- ############################################################
-- ## schema-trash.sql
-- ############################################################

-- Papierkorb für Charaktere (alle Stufen): „löschen" setzt nur deleted_at; der
-- Charakter verschwindet aus allen Listen, bleibt aber mit Posts, Chats usw.
-- erhalten und lässt sich wiederherstellen. Endgültig gelöscht wird erst aus dem
-- Papierkorb heraus.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists deleted_at timestamptz;


-- ############################################################
-- ## schema-character-vibes.sql
-- ############################################################

-- „Vibes" für Charaktere: Inspo-Bilder im Profil (Supporting Characters und
-- Statist*innen), als Liste von Bild-Adressen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists vibes jsonb not null default '[]'::jsonb;


-- ############################################################
-- ## schema-character-profile.sql
-- ############################################################

-- Erweitertes Charakterprofil: alles, was über die bisherigen Spalten hinausgeht,
-- liegt gesammelt in einer JSON-Spalte (Geburtsdatum, Geschlecht, Studium/Arbeit,
-- versteckte Angaben, Skills, Eigenschaften, Slider, Likes/Dislikes, Timeline).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists profile jsonb not null default '{}'::jsonb;


-- ############################################################
-- ## schema-player-profile.sql
-- ############################################################

-- Spieler*innen-Profil: Header-Bild, Skills, Slider, Likes/Dislikes (wie bei den
-- Charakteren) gesammelt in einer JSON-Spalte.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table players add column if not exists profile jsonb not null default '{}'::jsonb;


-- ############################################################
-- ## schema-app-settings.sql
-- ############################################################

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


-- ############################################################
-- ## schema-delete-player.sql
-- ############################################################

-- Konto löschen: Spieler*innen löschen ihr eigenes Konto, Admins das anderer.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
--
-- delete_player(p_id)
--  · Hat die Person nichts erstellt (keine Charaktere, Orte, Plots, Chats), verschwindet
--    sie restlos: Spieler-Eintrag und Login werden gelöscht.
--  · Sonst bleibt eine „Hülle": Der Login wird gelöscht, der Spieler-Eintrag behält nur
--    den Usernamen und ist als gelöscht markiert (deleted_at). Charaktere, Szenen und
--    Posts bleiben erhalten; die App zeigt sie klar als „gelöscht" an.
--  · Der letzte Admin lässt sich nicht löschen.
--  Rückgabe: { result: 'removed' | 'hull', auth_kept: bool } – auth_kept = der Login ließ
--  sich nicht entfernen (dann im Dashboard unter Authentication löschen).
--
-- purge_player(p_id) – nur Admins, nur für Hüllen: löscht ALLE Spuren – die Charaktere
--  der Person samt Posts, Zitaten, Chats und Anrufen, danach die Hülle selbst.

alter table players add column if not exists deleted_at timestamptz;

create or replace function public.delete_player(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me players%rowtype;
  target players%rowtype;
  has_content boolean;
  auth_removed boolean := true;
begin
  select * into me from players where auth_user_id = auth.uid();
  if me.id is null then raise exception 'Nicht angemeldet'; end if;
  select * into target from players where id = p_id;
  if target.id is null then raise exception 'Spieler*in nicht gefunden'; end if;
  if target.deleted_at is not null then raise exception 'Das Konto ist bereits gelöscht'; end if;
  if not (coalesce(me.is_admin, false) or me.id = target.id) then
    raise exception 'Keine Berechtigung';
  end if;
  if coalesce(target.is_admin, false)
     and not exists (select 1 from players where is_admin and approved and deleted_at is null and id <> target.id) then
    raise exception 'Der letzte Admin kann nicht gelöscht werden';
  end if;

  has_content :=
        exists (select 1 from characters where player_id = target.id)
     or exists (select 1 from locations where created_by = target.id)
     or exists (select 1 from plots where created_by = target.id)
     or exists (select 1 from chats where created_by = target.id);

  -- aus fremden Zuordnungen (Supporting Characters) herauslösen
  update characters
     set co_owner_ids = coalesce(
       (select jsonb_agg(v) from jsonb_array_elements_text(co_owner_ids) v where v <> target.id),
       '[]'::jsonb)
   where co_owner_ids ? target.id;
  delete from read_marks where player_id = target.id;

  -- Login entfernen
  begin
    if target.auth_user_id is not null then
      delete from auth.users where id = target.auth_user_id;
    end if;
  exception when others then
    auth_removed := false;
  end;

  if has_content then
    update players
       set deleted_at = now(),
           email = 'deleted+' || target.id || '@deleted.invalid',
           auth_user_id = null,
           avatar_url = null,
           bio = null,
           profile = '{}'::jsonb,
           approved = false,
           is_admin = false,
           current_location = null,
           dashboard_header_url = null
     where id = target.id;
  else
    delete from players where id = target.id;
  end if;

  return jsonb_build_object(
    'result', case when has_content then 'hull' else 'removed' end,
    'auth_kept', not auth_removed
  );
end;
$$;

create or replace function public.purge_player(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me players%rowtype;
  target players%rowtype;
  ids text[];
begin
  select * into me from players where auth_user_id = auth.uid();
  if me.id is null or not coalesce(me.is_admin, false) then raise exception 'Keine Berechtigung'; end if;
  select * into target from players where id = p_id;
  if target.id is null then raise exception 'Spieler*in nicht gefunden'; end if;
  if target.deleted_at is null then
    raise exception 'Nur gelöschte Konten lassen sich restlos entfernen';
  end if;

  ids := array(select id from characters where player_id = target.id);

  -- aus den Szenen herausnehmen
  update scenes
     set participant_ids = array(select x from unnest(participant_ids) x where x <> all (ids)),
         next_up = case when next_up = any (ids) then null else next_up end
   where participant_ids && ids or next_up = any (ids);

  -- Chats mit diesen Charakteren (Nachrichten hängen per Cascade daran)
  delete from chats
   where exists (select 1 from jsonb_array_elements_text(participant_ids) v where v = any (ids));

  -- Charaktere: Posts, Zitate, Anrufe und restliche Nachrichten hängen per Cascade dran
  delete from characters where id = any (ids);

  delete from players where id = target.id;
end;
$$;

revoke all on function public.delete_player(text) from public, anon;
revoke all on function public.purge_player(text) from public, anon;
grant execute on function public.delete_player(text) to authenticated;
grant execute on function public.purge_player(text) to authenticated;


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


-- ############################################################
-- ## schema-post-drafts.sql
-- ############################################################

-- Entwürfe für Antworten in Szenen: hängen unter der Szene, sind aber nur für die
-- Person sichtbar, die sie geschrieben hat – bis sie sie veröffentlicht (dann wird
-- daraus ein gewöhnlicher Post und der Entwurf gelöscht).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists post_drafts (
  id           text primary key,
  scene_id     text not null references scenes(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  player_id    text not null references players(id) on delete cascade,
  content      text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists post_drafts_player on post_drafts (player_id);

-- Jede*r sieht und ändert nur die eigenen Entwürfe
alter table post_drafts enable row level security;

drop policy if exists "post_drafts own" on post_drafts;
create policy "post_drafts own" on post_drafts for all to authenticated
  using (player_id = (select id from players where auth_user_id = auth.uid()))
  with check (player_id = (select id from players where auth_user_id = auth.uid()));

grant select, insert, update, delete on post_drafts to authenticated;
grant all on post_drafts to service_role;


-- ############################################################
-- ## schema-signup-username.sql
-- ############################################################

-- Registrierung mit Username: Wer sich registriert, gibt E-Mail, Passwort und einen
-- Username an; anmelden kann man sich danach mit Username + Passwort (oder E-Mail,
-- siehe schema-login-username.sql).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

-- Ist der Username noch frei? Muss vor dem Login (ohne Session) aufrufbar sein.
create or replace function public.username_available(name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (select 1 from players where lower(username) = lower(trim(name)));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- Neuer Auth-User → players-Eintrag mit dem gewünschten Username (steht in den
-- Metadaten der Registrierung). Gibt es zur E-Mail schon einen Eintrag, wird nur
-- verknüpft. Ohne Angabe gilt wie bisher der Teil vor dem @; ist der Name
-- inzwischen vergeben, wird eine Zahl angehängt.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing players%rowtype;
  base text;
  candidate text;
  n int := 1;
begin
  select * into existing from players where lower(email) = lower(new.email) limit 1;
  if found then
    update players set auth_user_id = new.id where id = existing.id;
  else
    base := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));
    candidate := base;
    while exists (select 1 from players where lower(username) = lower(candidate)) loop
      n := n + 1;
      candidate := base || n;
    end loop;
    insert into players (id, username, email, auth_user_id, approved)
    values (
      'p_' || substr(replace(new.id::text, '-', ''), 1, 8),
      candidate,
      new.email,
      new.id,
      false
    );
  end if;
  return new;
end $$;


-- ############################################################
-- ## schema-captic.sql
-- ############################################################

-- Captic (Foto-Netzwerk auf dem Handy): Beiträge, Kommentare, Stories und
-- Aktivitäten der Charaktere.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
-- Profilangaben (Nutzername, Bio, Follower-Zahlen, wem man folgt) liegen in
-- characters.phone – dafür ist keine Änderung nötig.

create table if not exists captic_posts (
  id           text primary key,
  character_id text not null references characters(id) on delete cascade,
  kind         text not null default 'image',          -- image | gif | video
  url          text not null,                          -- Bild, GIF oder Video
  poster_url   text,                                   -- Standbild (Video, hochgeladenes GIF) fürs Raster
  ar           real,                                   -- Seitenverhältnis Breite/Höhe
  caption      text not null default '',
  likes        integer not null default 0,             -- von Hand gesetzte Like-Zahl
  liked_by     jsonb not null default '[]'::jsonb,     -- Charakter-IDs, die zusätzlich geliket haben
  inplay_date  text,                                   -- ISO-Datum als Text (optional)
  created_at   timestamptz not null default now()
);

create table if not exists captic_comments (
  id           text primary key,
  post_id      text not null references captic_posts(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  content      text not null,
  created_at   timestamptz not null default now()
);

-- Stories: Bilder/GIFs, die bildschirmfüllend hinter dem Profilbild liegen
create table if not exists captic_stories (
  id           text primary key,
  character_id text not null references characters(id) on delete cascade,
  kind         text not null default 'image',          -- image | gif | video
  url          text not null,
  ar           real,
  caption      text not null default '',
  created_at   timestamptz not null default now()
);

-- Aktivitäten („X gefällt dein Beitrag", „X folgt dir", „X hat kommentiert"):
-- speisen die Glocke in der App und den Hinweis im Dashboard.
create table if not exists captic_events (
  id         text primary key,
  kind       text not null,                             -- like | comment | follow
  actor_id   text not null references characters(id) on delete cascade,
  target_id  text not null references characters(id) on delete cascade,  -- wen es betrifft
  post_id    text references captic_posts(id) on delete cascade,
  comment_id text references captic_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_captic_stories_character on captic_stories(character_id, created_at);
create index if not exists idx_captic_events_target on captic_events(target_id, created_at);
create index if not exists idx_captic_posts_character on captic_posts(character_id, created_at);
create index if not exists idx_captic_comments_post on captic_comments(post_id, created_at);

-- Wie beim Messenger: alle Freigeschalteten dürfen lesen und schreiben
-- (ein Like ändert die Zeile eines fremden Beitrags).
alter table captic_posts    enable row level security;
alter table captic_comments enable row level security;
alter table captic_stories  enable row level security;
alter table captic_events   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['captic_posts', 'captic_comments', 'captic_stories', 'captic_events']
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

grant select, insert, update, delete on captic_posts, captic_comments, captic_stories, captic_events to authenticated;
grant all on captic_posts, captic_comments, captic_stories, captic_events to service_role;

-- Captic: privates Profil, Story-Highlights und Ortsangabe an Beiträgen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
-- Das private Profil selbst braucht keine Änderung: der Schalter liegt in
-- characters.phone, Folgeanfragen sind Zeilen in captic_events (kind 'request').

-- Ortsangabe über dem Bild (optional)
alter table captic_posts add column if not exists location text;

-- Story-Highlights: Kreise unter der Bio. Die Stories liegen als Kopie in `items`
-- ({ id, kind, url, ar, caption, inplay_date }) und bleiben so dauerhaft erhalten.
create table if not exists captic_highlights (
  id           text primary key,
  character_id text not null references characters(id) on delete cascade,
  name         text not null default '',
  cover_url    text,                                   -- Titelbild (sonst das erste Bild)
  items        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_captic_highlights_character on captic_highlights(character_id, created_at);

alter table captic_highlights enable row level security;

drop policy if exists "captic_highlights approved all" on captic_highlights;
create policy "captic_highlights approved all" on captic_highlights for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'captic_highlights'
  ) then
    alter publication supabase_realtime add table public.captic_highlights;
  end if;
end $$;

grant select, insert, update, delete on captic_highlights to authenticated;
grant all on captic_highlights to service_role;


-- ############################################################
-- ## schema-locations-backfill.sql
-- ############################################################

-- Orte: Ortseinträge für Szenen-Orte ohne eigenen Eintrag (Altbestand) nachtragen.
-- Manche Szenen nennen einen Ort nur als Text; damit er in der Ortsübersicht
-- erscheint und ein Profil bekommt, wird je Gegend + Name ein Eintrag angelegt
-- (ohne Ersteller*in – bearbeiten können ihn Admins).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

insert into locations (id, area, name, created_at)
select
  'loc_' || substr(md5(s.location_area || '/' || s.location_name), 1, 12),
  s.location_area,
  s.location_name,
  min(s.created_at)
from scenes s
where btrim(s.location_name) <> ''
  and s.location_area <> 'phone'
  and not exists (
    select 1 from locations l
    where l.area = s.location_area and l.name = s.location_name
  )
group by s.location_area, s.location_name
on conflict (id) do nothing;


-- ## schema-sms-scenes.sql
-- SMS-Szenen: benannte Abschnitte im (einen, fortlaufenden) Chat zweier Charaktere.
-- Jede Nachricht trägt ihr Inplay-Datum; der Chat sortiert danach statt nach der
-- echten Schreibzeit. Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

create table if not exists chat_scenes (
  id          text primary key,
  chat_id     text not null references chats(id) on delete cascade,
  title       text not null,
  inplay_date text not null,                      -- ISO-Datum als Text
  summary     text,
  au          boolean not null default false,
  au_name     text,
  status      text not null default 'active',     -- active | closed
  created_by  text references players(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table chat_messages add column if not exists inplay_date text;
alter table chat_messages add column if not exists scene_id text references chat_scenes(id) on delete set null;

create index if not exists idx_chat_scenes_chat on chat_scenes(chat_id);

-- Gruppenchats: optionaler Name der Gruppe (ohne: die Vornamen der Beteiligten)
alter table chats add column if not exists name text;

-- Altbestand: Nachrichten bekommen das Datum des Tagestrenners über ihnen
update chat_messages m
set inplay_date = (
  select split_part(d.content, '|', 1)
  from chat_messages d
  where d.chat_id = m.chat_id and d.kind = 'date' and d.created_at <= m.created_at
  order by d.created_at desc
  limit 1
)
where m.kind <> 'date' and m.inplay_date is null;

alter table chat_scenes enable row level security;

drop policy if exists "chat_scenes approved all" on chat_scenes;
create policy "chat_scenes approved all" on chat_scenes for all to authenticated
  using (public.is_approved()) with check (public.is_approved());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_scenes'
  ) then
    alter publication supabase_realtime add table public.chat_scenes;
  end if;
end $$;

grant select, insert, update, delete on chat_scenes to authenticated;
grant all on chat_scenes to service_role;


-- ## schema-character-purge.sql
-- Charakter endgültig löschen, Inhalte behalten: Der Charakter verschwindet aus dem
-- Papierkorb und lässt sich nicht wiederherstellen, seine Zeile bleibt aber als
-- „Hülle" (purged_at), damit Posts, SMS, Zitate usw. erhalten bleiben – mit
-- durchgestrichenem Namen. Wer stattdessen „alles mitlöschen" wählt, löscht die
-- Zeile wie bisher samt allem, was an ihr hängt.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists purged_at timestamptz;


-- ## schema-scene-drafts.sql
-- Szenen als Entwurf: Wer beim Erstellen den ersten Post nur als Entwurf speichert,
-- legt die ganze Szene als Entwurf an. Sie ist nur für diese Person sichtbar, bis
-- der erste Post veröffentlicht wird (dann wird `draft` wieder false).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table scenes add column if not exists draft boolean not null default false;


-- ## schema-import-players.sql
-- Import aus dem alten Forum: vorab angelegte Spieler*innen übernehmen.
-- Der Import legt players-Zeilen mit E-Mail und Username an, aber ohne Login
-- (auth_user_id leer). Registriert sich jemand mit derselben E-Mail, übernimmt
-- der Trigger diese Zeile: Der vorhandene Username bleibt (der im Formular
-- eingegebene wird ignoriert), und die Person wartet auf die Freischaltung.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

-- Ist der Username noch frei? Mit for_email gilt er auch dann als frei, wenn er zur
-- eigenen, noch nicht übernommenen Zeile gehört (sonst könnten Importierte ihren
-- alten Namen bei der Registrierung nicht eingeben).
drop function if exists public.username_available(text);

create or replace function public.username_available(name text, for_email text default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from players
    where lower(username) = lower(trim(name))
      and not (
        for_email is not null
        and auth_user_id is null
        and lower(trim(email)) = lower(trim(for_email))
      )
  );
$$;

grant execute on function public.username_available(text, text) to anon, authenticated;

-- Neuer Auth-User → players-Eintrag. Gibt es zur E-Mail schon einen Eintrag, wird er
-- übernommen: Login verknüpfen, Username und alle Inhalte bleiben. Freigeschaltet
-- bleibt dabei nur ein Admin; alle anderen warten (wieder) auf die Freischaltung,
-- denn die E-Mail wird bei der Registrierung nicht bestätigt. Ohne Eintrag wird wie
-- bisher ein neuer angelegt (gewünschter Username aus den Metadaten, sonst der Teil
-- vor dem @; ist der Name vergeben, wird eine Zahl angehängt).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing players%rowtype;
  base text;
  candidate text;
  n int := 1;
begin
  select * into existing from players
   where lower(trim(email)) = lower(trim(new.email))
   limit 1;
  if found then
    update players
       set auth_user_id = new.id,
           approved = coalesce(approved, false) and coalesce(is_admin, false)
     where id = existing.id;
  else
    base := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));
    candidate := base;
    while exists (select 1 from players where lower(username) = lower(candidate)) loop
      n := n + 1;
      candidate := base || n;
    end loop;
    insert into players (id, username, email, auth_user_id, approved)
    values (
      'p_' || substr(replace(new.id::text, '-', ''), 1, 8),
      candidate,
      new.email,
      new.id,
      false
    );
  end if;
  return new;
end $$;


-- ## schema-rename-players.sql
-- Spieler*innen umbenennen: „Vera" heißt jetzt „V", „liz" heißt jetzt „envy".
-- IDs (p_vera, p_liz) und E-Mails bleiben, damit alle Verweise gültig bleiben.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

update players set username = 'V'
 where lower(username) = 'vera'
   and not exists (select 1 from players where lower(username) = 'v');

update players set username = 'envy'
 where lower(username) = 'liz'
   and not exists (select 1 from players where lower(username) = 'envy');


-- ## schema-voicemail.sql
-- Mailbox: nach einem abgelehnten Anruf kann der/die Anrufende eine Nachricht
-- hinterlassen (textbasiert). Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table calls add column if not exists voicemail text;


-- ## schema-location-category.sql
-- Orte: Kategorie je Ort (home | food | nightlife | outdoor | business | education |
-- culture | infrastructure | lodging | other – siehe lib/places.ts). Leer heißt:
-- die App errät die Kategorie aus dem Namen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table locations add column if not exists category text;


-- ## schema-scene-format.sql
-- Szenen: Darstellung der Posts. 'script' = Drehbuch-Format (Regieanweisungen und
-- Dialog, siehe lib/script.ts); leer = normaler Fließtext.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table scenes add column if not exists format text;



-- ## schema-captic-tags.sql
-- Captic: Markierungen auf Bildern und Likes an Kommentaren.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table captic_posts add column if not exists tags jsonb not null default '[]'::jsonb;
alter table captic_comments add column if not exists liked_by jsonb not null default '[]'::jsonb;


-- ## schema-scene-versions.sql
-- Charakters anlegen (anderes Bild, Name, Grunddaten – siehe lib/versions.ts)?
-- Die Versionen selbst stehen im Charakterprofil (characters.profile → versions).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table scenes add column if not exists versions boolean not null default false;


-- ## schema-au-manage.sql
-- AUs umbenennen und löschen (Admin → Welt, sowie im AU-Filter von Timeline und
-- Szenen-Übersicht). Ein AU ist nur der Name an Szenen (scenes.au_name,
-- chat_scenes.au_name); derselbe Name steht außerdem in den Plot-Filtern
-- (plots.aus) und als Schlüssel der AU-Versionen von Charakteren
-- (characters.profile → versions → au). Die Funktionen ändern alles auf einmal.
--
-- Dürfen: Admins, und wer einen Charakter (auch als Mit-Besitzer*in) in einer Szene
-- oder SMS-Szene des AUs hat oder eine SMS-Szene des AUs angelegt hat.
--
-- rename_au(old_name, new_name): Gibt es den neuen Namen schon, werden die beiden
--   AUs zusammengelegt; bei doppelten Charakter-Versionen bleibt die des Ziels.
-- delete_au(p_name): Die Szenen bleiben erhalten und bleiben AU, nur ohne Namen.
--   AU-Versionen der Charaktere fallen weg, Plots verlieren den Filter.
--
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

create or replace function public.can_manage_au(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select id, coalesce(is_admin, false) as admin
    from players where auth_user_id = auth.uid() and deleted_at is null
  ),
  my_chars as (
    select c.id from characters c, me
    where c.player_id = me.id or c.co_owner_ids ? me.id
  )
  select exists (select 1 from me where admin)
      or exists (
        select 1 from scenes s
        where s.au and s.au_name = p_name
          and exists (select 1 from my_chars m where m.id = any (s.participant_ids))
      )
      or exists (
        select 1 from chat_scenes cs
        join chats ch on ch.id = cs.chat_id
        where cs.au and cs.au_name = p_name
          and (
            cs.created_by = (select id from me)
            or exists (select 1 from my_chars m where ch.participant_ids ? m.id)
          )
      );
$$;

create or replace function public.rename_au(old_name text, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nn text := btrim(coalesce(new_name, ''));
begin
  if nn = '' then raise exception 'Der neue Name ist leer'; end if;
  if old_name is null or old_name = nn then return; end if;
  if not public.can_manage_au(old_name) then raise exception 'Keine Berechtigung'; end if;

  update scenes set au_name = nn where au and au_name = old_name;
  update chat_scenes set au_name = nn where au and au_name = old_name;

  -- Plot-Filter: Namen ersetzen, Reihenfolge behalten, doppelte zusammenfassen
  update plots p set aus = (
    select coalesce(jsonb_agg(v order by o), '[]'::jsonb)
    from (
      select case when e = old_name then nn else e end as v, min(ord) as o
      from jsonb_array_elements_text(p.aus) with ordinality t(e, ord)
      group by 1
    ) x
  )
  where p.aus ? old_name;

  -- AU-Versionen: Schlüssel umbenennen; hat der Charakter schon eine Version für
  -- den neuen Namen, bleibt diese
  update characters c set profile = jsonb_set(
    c.profile,
    '{versions,au}',
    (c.profile #> '{versions,au}') - old_name
      || case
           when (c.profile #> '{versions,au}') ? nn then '{}'::jsonb
           else jsonb_build_object(nn, c.profile #> array['versions', 'au', old_name])
         end
  )
  where (c.profile #> '{versions,au}') ? old_name;
end;
$$;

create or replace function public.delete_au(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_name is null then return; end if;
  if not public.can_manage_au(p_name) then raise exception 'Keine Berechtigung'; end if;

  update scenes set au_name = null where scenes.au and au_name = p_name;
  update chat_scenes set au_name = null where chat_scenes.au and au_name = p_name;
  update plots set aus = aus - p_name where aus ? p_name;
  update characters set profile = profile #- array['versions', 'au', p_name]
   where (profile #> '{versions,au}') ? p_name;
end;
$$;

grant execute on function public.can_manage_au(text) to authenticated;
grant execute on function public.rename_au(text, text) to authenticated;
grant execute on function public.delete_au(text) to authenticated;

-- ############################################################
-- ## schema-plots-private.sql
-- ############################################################

-- Plots: privat (nur für die Person, die ihn angelegt hat) oder mit den
-- betroffenen Spieler*innen geteilt (Standard, wie bisher)
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
alter table plots add column if not exists private boolean not null default false;

-- Lesen: alle Freigeschalteten – private Plots nur die Person, die sie angelegt hat
drop policy if exists "plots read" on plots;
create policy "plots read" on plots for select to authenticated
  using (
    public.is_approved()
    and (
      not private
      or created_by = (select id from players where auth_user_id = auth.uid())
    )
  );
