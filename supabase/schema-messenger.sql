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
