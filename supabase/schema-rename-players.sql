-- Spieler*innen umbenennen: „Vera" heißt jetzt „V", „liz" heißt jetzt „envy".
-- IDs (p_vera, p_liz) und E-Mails bleiben, damit alle Verweise gültig bleiben.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

update players set username = 'V'
 where lower(username) = 'vera'
   and not exists (select 1 from players where lower(username) = 'v');

update players set username = 'envy'
 where lower(username) = 'liz'
   and not exists (select 1 from players where lower(username) = 'envy');
