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
