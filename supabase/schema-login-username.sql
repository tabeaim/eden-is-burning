-- Login mit Username ODER E-Mail ermöglichen
-- --------------------------------------------------------------------------
-- Supabase-Auth meldet intern immer per E-Mail an. Diese Funktion übersetzt
-- eine Eingabe (Username oder E-Mail) in die zugehörige E-Mail, damit sich
-- Spieler*innen auch mit ihrem Username anmelden können.
-- Im SQL-Editor ausführen (Run).

create or replace function public.email_for_login(identifier text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from players
  where lower(email) = lower(identifier)
     or lower(username) = lower(identifier)
  limit 1;
$$;

-- Muss vor dem Login (ohne Session) aufrufbar sein:
grant execute on function public.email_for_login(text) to anon, authenticated;
