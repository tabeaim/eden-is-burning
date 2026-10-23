-- Szenen: dürfen die Beteiligten für diese Szene eine eigene Version ihres
-- Charakters anlegen (anderes Bild, Name, Grunddaten – siehe lib/versions.ts)?
-- Die Versionen selbst stehen im Charakterprofil (characters.profile → versions).
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table scenes add column if not exists versions boolean not null default false;
