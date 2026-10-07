-- Charakter endgültig löschen, Inhalte behalten: Der Charakter verschwindet aus dem
-- Papierkorb und lässt sich nicht wiederherstellen, seine Zeile bleibt aber als
-- „Hülle" (purged_at), damit Posts, SMS, Zitate usw. erhalten bleiben – mit
-- durchgestrichenem Namen. Wer stattdessen „alles mitlöschen" wählt, löscht die
-- Zeile wie bisher samt allem, was an ihr hängt.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists purged_at timestamptz;
