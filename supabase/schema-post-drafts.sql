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
