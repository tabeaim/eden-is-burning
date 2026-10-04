-- Test-Zugänge für Stage: legt für alle Beispiel-Spieler*innen einen Login an und
-- verknüpft ihn mit dem Spieler-Eintrag (und damit mit dessen Charakteren), sodass
-- der Schnellzugang auf dem Login-Bildschirm (components/LoginScreen.tsx) für alle
-- funktioniert. Alle bekommen das Test-Passwort aus LoginScreen.tsx.
--
-- NUR in „eden stage" ausführen, NICHT in der Live-DB. Vorher stage-setup.sql und
-- stage-seed.sql ausführen. Wiederholbar (idempotent).
--
-- Ein Konto, das es schon gibt (z.B. dein eigenes), behält sein Passwort — außer
-- du setzt unten `reset_existing` auf true.

do $$
declare
  reset_existing boolean := false;   -- true: auch vorhandene Konten aufs Test-Passwort setzen
  test_password  text := 'Eden1234!';
  mail text;
  uid  uuid;
begin
  foreach mail in array array[
    'tabeaim@gmail.com',
    'vera@example.com',
    'liz@example.com',
    'abby@example.com',
    'jule@example.com',
    'kat@example.com'
  ]
  loop
    select id into uid from auth.users where lower(email) = lower(mail) limit 1;

    if uid is null then
      uid := gen_random_uuid();
      -- Der Trigger on_auth_user_created verknüpft den neuen Login per E-Mail mit
      -- dem vorhandenen Spieler-Eintrag.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
        extensions.crypt(test_password, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
        '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
        now(), now(), now()
      );
    elsif reset_existing then
      update auth.users
        set encrypted_password = extensions.crypt(test_password, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
        where id = uid;
    end if;

    -- Verknüpfen und freischalten (falls der Trigger nichts zu verknüpfen fand,
    -- hat er einen neuen Spieler-Eintrag angelegt — auch der wird freigeschaltet)
    update players set auth_user_id = uid, approved = true where lower(email) = lower(mail);
  end loop;

  update players set is_admin = true where lower(email) = 'tabeaim@gmail.com';
end $$;

-- Kontrolle: jede Zeile sollte login = true, approved = true und Charaktere > 0 zeigen
select p.username,
       p.email,
       p.auth_user_id is not null as login,
       p.approved,
       p.is_admin,
       (select count(*) from characters c where c.player_id = p.id and not coalesce(c.is_npc, false)) as charaktere,
       (select string_agg(c.name, ', ' order by c.name) from characters c
         where c.player_id = p.id and not coalesce(c.is_npc, false)) as namen
from players p
order by p.username;
