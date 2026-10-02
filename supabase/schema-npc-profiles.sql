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
