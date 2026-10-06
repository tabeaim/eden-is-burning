-- Konto löschen: Spieler*innen löschen ihr eigenes Konto, Admins das anderer.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
--
-- Was passiert:
--  · Main Characters kommen in den Papierkorb und gehen an den/die Admin, der/die
--    löscht (bei Selbstlöschung an den ältesten anderen Admin). Ohne das würden sie
--    samt aller Posts mit dem Konto gelöscht (on delete cascade).
--  · Supporting Characters und Statist*innen bleiben erhalten und gehen ebenfalls an
--    den Admin; die Person verschwindet aus allen Zuordnungen.
--  · Danach werden der Spieler-Eintrag und das Login-Konto (auth.users) entfernt.
--  · Der letzte Admin lässt sich nicht löschen.
-- Rückgabe: 'ok' oder 'auth_kept' (Spieler-Eintrag gelöscht, Login-Konto ließ sich nicht
-- entfernen – dann im Dashboard unter Authentication löschen).

create or replace function public.delete_player(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me players%rowtype;
  target players%rowtype;
  heir text;
  auth_removed boolean := true;
begin
  select * into me from players where auth_user_id = auth.uid();
  if me.id is null then raise exception 'Nicht angemeldet'; end if;
  select * into target from players where id = p_id;
  if target.id is null then raise exception 'Spieler*in nicht gefunden'; end if;
  if not (coalesce(me.is_admin, false) or me.id = target.id) then
    raise exception 'Keine Berechtigung';
  end if;
  if coalesce(target.is_admin, false)
     and not exists (select 1 from players where is_admin and approved and id <> target.id) then
    raise exception 'Der letzte Admin kann nicht gelöscht werden';
  end if;

  heir := case
    when coalesce(me.is_admin, false) and me.id <> target.id then me.id
    else (select id from players where is_admin and approved and id <> target.id order by created_at limit 1)
  end;
  if heir is null then
    raise exception 'Kein Admin, an den die Charaktere übergeben werden können';
  end if;

  -- Main Characters: Papierkorb + Übergabe (vor dem Löschen, sonst Cascade)
  update characters
     set player_id = heir, deleted_at = coalesce(deleted_at, now())
   where player_id = target.id and coalesce(is_npc, false) = false;
  -- Nebenfiguren bleiben erhalten
  update characters set player_id = heir where player_id = target.id;
  -- aus allen Zuordnungen entfernen
  update characters
     set co_owner_ids = coalesce(
       (select jsonb_agg(v) from jsonb_array_elements_text(co_owner_ids) v where v <> target.id),
       '[]'::jsonb)
   where co_owner_ids ? target.id;

  delete from players where id = target.id;

  begin
    if target.auth_user_id is not null then
      delete from auth.users where id = target.auth_user_id;
    end if;
  exception when others then
    auth_removed := false;
  end;

  return case when auth_removed then 'ok' else 'auth_kept' end;
end;
$$;

revoke all on function public.delete_player(text) from public, anon;
grant execute on function public.delete_player(text) to authenticated;
