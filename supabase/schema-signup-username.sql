-- Registrierung mit Username: Wer sich registriert, gibt E-Mail, Passwort und einen
-- Username an; anmelden kann man sich danach mit Username + Passwort (oder E-Mail,
-- siehe schema-login-username.sql).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

-- Ist der Username noch frei? Muss vor dem Login (ohne Session) aufrufbar sein.
create or replace function public.username_available(name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (select 1 from players where lower(username) = lower(trim(name)));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- Neuer Auth-User → players-Eintrag mit dem gewünschten Username (steht in den
-- Metadaten der Registrierung). Gibt es zur E-Mail schon einen Eintrag, wird nur
-- verknüpft. Ohne Angabe gilt wie bisher der Teil vor dem @; ist der Name
-- inzwischen vergeben, wird eine Zahl angehängt.
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
  select * into existing from players where lower(email) = lower(new.email) limit 1;
  if found then
    update players set auth_user_id = new.id where id = existing.id;
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
