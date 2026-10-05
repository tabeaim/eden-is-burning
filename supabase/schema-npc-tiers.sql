-- Nebenfiguren in zwei Stufen: Statist*innen ('extra', liegen bei den Statist*innen
-- und können von allen bearbeitet und zeitweise bespielt werden) und Supporting
-- Characters ('supporting', bestimmten Spieler*innen zugeordnet). Main Characters
-- sind die normalen Charaktere (is_npc = false).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists npc_tier text;

-- Bisherige NPCs einordnen (nur die, die noch keine Stufe haben): zunächst alle
-- Supporting Character …
update characters set npc_tier = 'supporting' where is_npc and npc_tier is null;

-- … und, solange es noch gar keine Statist*innen gibt, die zwei ältesten
-- Supporting Characters außer Aleks zu Statist*innen machen.
update characters
set npc_tier = 'extra'
where id in (
  select id from characters
  where is_npc and npc_tier = 'supporting' and name not ilike 'aleks%'
  order by created_at
  limit 2
)
and not exists (select 1 from characters where is_npc and npc_tier = 'extra');
