-- Konto löschen: Spieler*innen löschen ihr eigenes Konto, Admins das anderer.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
--
-- delete_player(p_id)
--  · Hat die Person nichts erstellt (keine Charaktere, Orte, Plots, Chats), verschwindet
--    sie restlos: Spieler-Eintrag und Login werden gelöscht.
--  · Sonst bleibt eine „Hülle": Der Login wird gelöscht, der Spieler-Eintrag behält nur
--    den Usernamen und ist als gelöscht markiert (deleted_at). Charaktere, Szenen und
--    Posts bleiben erhalten; die App zeigt sie klar als „gelöscht" an.
--  · Der letzte Admin lässt sich nicht löschen.
--  Rückgabe: { result: 'removed' | 'hull', auth_kept: bool } – auth_kept = der Login ließ
--  sich nicht entfernen (dann im Dashboard unter Authentication löschen).
--
-- purge_player(p_id) – nur Admins, nur für Hüllen: löscht ALLE Spuren – die Charaktere
--  der Person samt Posts, Zitaten, Chats und Anrufen, danach die Hülle selbst.

alter table players add column if not exists deleted_at timestamptz;

create or replace function public.delete_player(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me players%rowtype;
  target players%rowtype;
  has_content boolean;
  auth_removed boolean := true;
begin
  select * into me from players where auth_user_id = auth.uid();
  if me.id is null then raise exception 'Nicht angemeldet'; end if;
  select * into target from players where id = p_id;
  if target.id is null then raise exception 'Spieler*in nicht gefunden'; end if;
  if target.deleted_at is not null then raise exception 'Das Konto ist bereits gelöscht'; end if;
  if not (coalesce(me.is_admin, false) or me.id = target.id) then
    raise exception 'Keine Berechtigung';
  end if;
  if coalesce(target.is_admin, false)
     and not exists (select 1 from players where is_admin and approved and deleted_at is null and id <> target.id) then
    raise exception 'Der letzte Admin kann nicht gelöscht werden';
  end if;

  has_content :=
        exists (select 1 from characters where player_id = target.id)
     or exists (select 1 from locations where created_by = target.id)
     or exists (select 1 from plots where created_by = target.id)
     or exists (select 1 from chats where created_by = target.id);

  -- aus fremden Zuordnungen (Supporting Characters) herauslösen
  update characters
     set co_owner_ids = coalesce(
       (select jsonb_agg(v) from jsonb_array_elements_text(co_owner_ids) v where v <> target.id),
       '[]'::jsonb)
   where co_owner_ids ? target.id;
  delete from read_marks where player_id = target.id;

  -- Login entfernen
  begin
    if target.auth_user_id is not null then
      delete from auth.users where id = target.auth_user_id;
    end if;
  exception when others then
    auth_removed := false;
  end;

  if has_content then
    update players
       set deleted_at = now(),
           email = 'deleted+' || target.id || '@deleted.invalid',
           auth_user_id = null,
           avatar_url = null,
           bio = null,
           profile = '{}'::jsonb,
           approved = false,
           is_admin = false,
           current_location = null,
           dashboard_header_url = null
     where id = target.id;
  else
    delete from players where id = target.id;
  end if;

  return jsonb_build_object(
    'result', case when has_content then 'hull' else 'removed' end,
    'auth_kept', not auth_removed
  );
end;
$$;

create or replace function public.purge_player(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me players%rowtype;
  target players%rowtype;
  ids text[];
begin
  select * into me from players where auth_user_id = auth.uid();
  if me.id is null or not coalesce(me.is_admin, false) then raise exception 'Keine Berechtigung'; end if;
  select * into target from players where id = p_id;
  if target.id is null then raise exception 'Spieler*in nicht gefunden'; end if;
  if target.deleted_at is null then
    raise exception 'Nur gelöschte Konten lassen sich restlos entfernen';
  end if;

  ids := array(select id from characters where player_id = target.id);

  -- aus den Szenen herausnehmen
  update scenes
     set participant_ids = array(select x from unnest(participant_ids) x where x <> all (ids)),
         next_up = case when next_up = any (ids) then null else next_up end
   where participant_ids && ids or next_up = any (ids);

  -- Chats mit diesen Charakteren (Nachrichten hängen per Cascade daran)
  delete from chats
   where exists (select 1 from jsonb_array_elements_text(participant_ids) v where v = any (ids));

  -- Charaktere: Posts, Zitate, Anrufe und restliche Nachrichten hängen per Cascade dran
  delete from characters where id = any (ids);

  delete from players where id = target.id;
end;
$$;

revoke all on function public.delete_player(text) from public, anon;
revoke all on function public.purge_player(text) from public, anon;
grant execute on function public.delete_player(text) to authenticated;
grant execute on function public.purge_player(text) to authenticated;
