-- Papierkorb für Charaktere (alle Stufen): „löschen" setzt nur deleted_at; der
-- Charakter verschwindet aus allen Listen, bleibt aber mit Posts, Chats usw.
-- erhalten und lässt sich wiederherstellen. Endgültig gelöscht wird erst aus dem
-- Papierkorb heraus.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

alter table characters add column if not exists deleted_at timestamptz;
