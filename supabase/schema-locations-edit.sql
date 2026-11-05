-- Orte: mehr Leute dürfen bearbeiten. Neben Admins und der Person, die den Ort
-- erstellt hat, jetzt auch:
--   * wer einen Charakter spielt, der zum Ort gehört (bei „Characters & NPCs"
--     eingetragen oder im Profil „works here"), z. B. bei Häusern
--   * wer mit einem eigenen Charakter eine Szene an dem Ort hat
-- „Spielt" heißt wie in der App (lib/characters.ts → playsAs): Main Character und
-- Supporting Character: Besitzer*in und Zugeordnete; Statist*in: wer ihn gerade
-- bespielt (co_owner_ids). Charaktere im Papierkorb zählen nicht.
-- Löschen bleibt bei Admins. Setzt schema-locations-profile.sql voraus.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create or replace function public.can_edit_location(
  p_id text, p_area text, p_name text, p_people jsonb, p_created_by text
)
returns boolean language sql security definer stable set search_path = public as $$
  with me as (
    select id from players where auth_user_id = auth.uid() and approved
  ),
  mine as (
    select c.id, c.profile
    from characters c, me
    where c.deleted_at is null
      and (
        c.co_owner_ids ? me.id
        or (coalesce(c.npc_tier, '') <> 'extra' or not c.is_npc) and c.player_id = me.id
      )
  )
  select
    public.is_admin()
    or exists (select 1 from me where me.id = p_created_by)
    or exists (
      select 1 from mine
      where coalesce(p_people, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id', mine.id))
         or mine.profile->>'employer_location_id' = p_id
    )
    or exists (
      select 1 from scenes s
      where s.location_area = p_area
        and s.location_name = p_name
        and s.participant_ids && array(select id from mine)
    );
$$;

grant execute on function public.can_edit_location(text, text, text, jsonb, text) to authenticated;

drop policy if exists "locations update" on locations;
create policy "locations update" on locations for update to authenticated
  using (public.can_edit_location(id, area, name, people, created_by))
  with check (public.is_approved());
