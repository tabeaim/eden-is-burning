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
