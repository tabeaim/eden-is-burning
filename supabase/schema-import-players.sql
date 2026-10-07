-- Import aus dem alten Forum: vorab angelegte Spieler*innen übernehmen.
-- Der Import legt players-Zeilen mit E-Mail und Username an, aber ohne Login
-- (auth_user_id leer). Registriert sich jemand mit derselben E-Mail, übernimmt
-- der Trigger diese Zeile: Der vorhandene Username bleibt (der im Formular
-- eingegebene wird ignoriert), und die Person wartet auf die Freischaltung.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

-- Ist der Username noch frei? Mit for_email gilt er auch dann als frei, wenn er zur
-- eigenen, noch nicht übernommenen Zeile gehört (sonst könnten Importierte ihren
-- alten Namen bei der Registrierung nicht eingeben).
drop function if exists public.username_available(text);

create or replace function public.username_available(name text, for_email text default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from players
    where lower(username) = lower(trim(name))
      and not (
        for_email is not null
        and auth_user_id is null
        and lower(trim(email)) = lower(trim(for_email))
      )
  );
$$;

grant execute on function public.username_available(text, text) to anon, authenticated;

-- Neuer Auth-User → players-Eintrag. Gibt es zur E-Mail schon einen Eintrag, wird er
-- übernommen: Login verknüpfen, Username und alle Inhalte bleiben. Freigeschaltet
-- bleibt dabei nur ein Admin; alle anderen warten (wieder) auf die Freischaltung,
-- denn die E-Mail wird bei der Registrierung nicht bestätigt. Ohne Eintrag wird wie
-- bisher ein neuer angelegt (gewünschter Username aus den Metadaten, sonst der Teil
-- vor dem @; ist der Name vergeben, wird eine Zahl angehängt).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing players%rowtype;
  base text;
  candidate text;
  n int := 1;
begin
  select * into existing from players
   where lower(trim(email)) = lower(trim(new.email))
   limit 1;
  if found then
    update players
       set auth_user_id = new.id,
           approved = coalesce(approved, false) and coalesce(is_admin, false)
     where id = existing.id;
  else
    base := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));
    candidate := base;
    while exists (select 1 from players where lower(username) = lower(candidate)) loop
      n := n + 1;
      candidate := base || n;
    end loop;
    insert into players (id, username, email, auth_user_id, approved)
    values (
      'p_' || substr(replace(new.id::text, '-', ''), 1, 8),
      candidate,
      new.email,
      new.id,
      false
    );
  end if;
  return new;
end $$;
