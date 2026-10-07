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
