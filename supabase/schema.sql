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
