-- Mailbox: nach einem abgelehnten Anruf kann der/die Anrufende eine Nachricht
-- hinterlassen (textbasiert). Im Supabase SQL-Editor ausführen (Run). Wiederholbar.

alter table calls add column if not exists voicemail text;
