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
