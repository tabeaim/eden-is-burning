-- Orte: Ortseinträge für Szenen-Orte ohne eigenen Eintrag (Altbestand) nachtragen.
-- Manche Szenen nennen einen Ort nur als Text; damit er in der Ortsübersicht
-- erscheint und ein Profil bekommt, wird je Gegend + Name ein Eintrag angelegt
-- (ohne Ersteller*in – bearbeiten können ihn Admins).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

insert into locations (id, area, name, created_at)
select
  'loc_' || substr(md5(s.location_area || '/' || s.location_name), 1, 12),
  s.location_area,
  s.location_name,
  min(s.created_at)
from scenes s
where btrim(s.location_name) <> ''
  and s.location_area <> 'phone'
  and not exists (
    select 1 from locations l
    where l.area = s.location_area and l.name = s.location_name
  )
group by s.location_area, s.location_name
on conflict (id) do nothing;
