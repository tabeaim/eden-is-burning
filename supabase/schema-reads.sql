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
