-- Szenen: manuelle Zug-Übergabe + Pausieren
-- Im Supabase SQL-Editor ausführen (Run).

-- Wer ist als Nächstes dran (überschreibt die automatische Reihenfolge; einmalig,
-- wird beim nächsten Post wieder geleert). NULL = normale Reihenfolge.
alter table scenes add column if not exists next_up text;

-- Pausierte Szenen erscheinen nicht im Dashboard-Tracker.
alter table scenes add column if not exists paused boolean not null default false;
