-- AUs umbenennen und löschen (Admin → Welt, sowie im AU-Filter von Timeline und
-- Szenen-Übersicht). Ein AU ist nur der Name an Szenen (scenes.au_name,
-- chat_scenes.au_name); derselbe Name steht außerdem in den Plot-Filtern
-- (plots.aus) und als Schlüssel der AU-Versionen von Charakteren
-- (characters.profile → versions → au). Die Funktionen ändern alles auf einmal.
--
-- Dürfen: Admins, und wer einen Charakter (auch als Mit-Besitzer*in) in einer Szene
-- oder SMS-Szene des AUs hat oder eine SMS-Szene des AUs angelegt hat.
--
-- rename_au(old_name, new_name): Gibt es den neuen Namen schon, werden die beiden
--   AUs zusammengelegt; bei doppelten Charakter-Versionen bleibt die des Ziels.
-- delete_au(p_name): Die Szenen bleiben erhalten und bleiben AU, nur ohne Namen.
--   AU-Versionen der Charaktere fallen weg, Plots verlieren den Filter.
--
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

create or replace function public.can_manage_au(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select id, coalesce(is_admin, false) as admin
    from players where auth_user_id = auth.uid() and deleted_at is null
  ),
  my_chars as (
    select c.id from characters c, me
    where c.player_id = me.id or c.co_owner_ids ? me.id
  )
  select exists (select 1 from me where admin)
      or exists (
        select 1 from scenes s
        where s.au and s.au_name = p_name
          and exists (select 1 from my_chars m where m.id = any (s.participant_ids))
      )
      or exists (
        select 1 from chat_scenes cs
        join chats ch on ch.id = cs.chat_id
        where cs.au and cs.au_name = p_name
          and (
            cs.created_by = (select id from me)
            or exists (select 1 from my_chars m where ch.participant_ids ? m.id)
          )
      );
$$;

create or replace function public.rename_au(old_name text, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nn text := btrim(coalesce(new_name, ''));
begin
  if nn = '' then raise exception 'Der neue Name ist leer'; end if;
  if old_name is null or old_name = nn then return; end if;
  if not public.can_manage_au(old_name) then raise exception 'Keine Berechtigung'; end if;

  update scenes set au_name = nn where au and au_name = old_name;
  update chat_scenes set au_name = nn where au and au_name = old_name;

  -- Plot-Filter: Namen ersetzen, Reihenfolge behalten, doppelte zusammenfassen
  update plots p set aus = (
    select coalesce(jsonb_agg(v order by o), '[]'::jsonb)
    from (
      select case when e = old_name then nn else e end as v, min(ord) as o
      from jsonb_array_elements_text(p.aus) with ordinality t(e, ord)
      group by 1
    ) x
  )
  where p.aus ? old_name;

  -- AU-Versionen: Schlüssel umbenennen; hat der Charakter schon eine Version für
  -- den neuen Namen, bleibt diese
  update characters c set profile = jsonb_set(
    c.profile,
    '{versions,au}',
    (c.profile #> '{versions,au}') - old_name
      || case
           when (c.profile #> '{versions,au}') ? nn then '{}'::jsonb
           else jsonb_build_object(nn, c.profile #> array['versions', 'au', old_name])
         end
  )
  where (c.profile #> '{versions,au}') ? old_name;
end;
$$;

create or replace function public.delete_au(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_name is null then return; end if;
  if not public.can_manage_au(p_name) then raise exception 'Keine Berechtigung'; end if;

  update scenes set au_name = null where scenes.au and au_name = p_name;
  update chat_scenes set au_name = null where chat_scenes.au and au_name = p_name;
  update plots set aus = aus - p_name where aus ? p_name;
  update characters set profile = profile #- array['versions', 'au', p_name]
   where (profile #> '{versions,au}') ? p_name;
end;
$$;

grant execute on function public.can_manage_au(text) to authenticated;
grant execute on function public.rename_au(text, text) to authenticated;
grant execute on function public.delete_au(text) to authenticated;
