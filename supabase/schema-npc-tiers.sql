-- Nebenfiguren in zwei Stufen: Statist*innen ('extra', noch nicht bespielt, liegen
-- im Statisten-Pool) und Supporting Characters ('supporting', bestimmten
-- Spieler*innen zugeordnet und von ihnen bespielt). Main Characters sind die
-- normalen Charaktere (is_npc = false).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists npc_tier text;

-- Bisherige NPCs einordnen (nur die, die noch keine Stufe haben): Aleks ist
-- Supporting Character, alle anderen werden zufällig verteilt.
update characters
set npc_tier = case
  when name ilike 'aleks%' then 'supporting'
  when random() < 0.5 then 'supporting'
  else 'extra'
end
where is_npc and npc_tier is null;
