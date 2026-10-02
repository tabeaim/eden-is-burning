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
