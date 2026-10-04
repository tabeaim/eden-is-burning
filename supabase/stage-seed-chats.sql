-- Testdaten für den Messenger (nur Stage): ein paar Chats, sodass jeder Charakter
-- aus stage-seed.sql mindestens einen Chat hat.
-- Vorher supabase/schema-messenger.sql ausführen. Wiederholbar (idempotent).

insert into chats (id, participant_ids, created_at)
values
  ('chat_seed_elliot_julius', '["c_elliot", "c_julius"]'::jsonb, '2026-10-01T10:00:00+00'::timestamptz),
  ('chat_seed_nigel_lou', '["c_nigel", "c_lou"]'::jsonb, '2026-10-01T10:01:00+00'::timestamptz),
  ('chat_seed_riley_roach', '["c_riley", "c_roach"]'::jsonb, '2026-10-01T10:02:00+00'::timestamptz),
  ('chat_seed_sam_riley', '["c_sam", "c_riley"]'::jsonb, '2026-10-01T10:03:00+00'::timestamptz),
  ('chat_seed_nila_cassandra', '["c_nila", "c_cassandra"]'::jsonb, '2026-10-01T10:04:00+00'::timestamptz),
  ('chat_seed_irina_liam', '["c_irina", "c_liam"]'::jsonb, '2026-10-01T10:05:00+00'::timestamptz),
  ('chat_seed_reece_elliot', '["c_reece", "c_elliot"]'::jsonb, '2026-10-01T10:06:00+00'::timestamptz),
  ('chat_seed_alexander_cassandra', '["c_alexander", "c_cassandra"]'::jsonb, '2026-10-01T10:07:00+00'::timestamptz)
on conflict (id) do nothing;

-- Nur Nachrichten von Charakteren einfügen, die es in dieser Datenbank gibt
insert into chat_messages (id, chat_id, character_id, kind, content, inplay_time, created_at)
select v.*
from (values
  ('chat_seed_elliot_julius_d', 'chat_seed_elliot_julius', 'c_elliot', 'date', '2021-11-20', null, '2026-10-01T10:00:00+00'::timestamptz),
  ('chat_seed_elliot_julius_1', 'chat_seed_elliot_julius', 'c_elliot', 'text', 'bist du noch im studio?', '22:14', '2026-10-01T10:00:01+00'::timestamptz),
  ('chat_seed_elliot_julius_2', 'chat_seed_elliot_julius', 'c_julius', 'text', 'bis mindestens 2. warum', '22:16', '2026-10-01T10:00:02+00'::timestamptz),
  ('chat_seed_elliot_julius_3', 'chat_seed_elliot_julius', 'c_elliot', 'text', 'brauch nen ort wo mein vater mich nicht findet', '22:16', '2026-10-01T10:00:03+00'::timestamptz),
  ('chat_seed_elliot_julius_4', 'chat_seed_elliot_julius', 'c_julius', 'text', '😂', '22:17', '2026-10-01T10:00:04+00'::timestamptz),
  ('chat_seed_elliot_julius_5', 'chat_seed_elliot_julius', 'c_julius', 'text', 'tür ist offen. bring kaffee mit', '22:17', '2026-10-01T10:00:05+00'::timestamptz),
  ('chat_seed_elliot_julius_6', 'chat_seed_elliot_julius', 'c_elliot', 'text', '20 min', '22:19', '2026-10-01T10:00:06+00'::timestamptz),
  ('chat_seed_nigel_lou_d', 'chat_seed_nigel_lou', 'c_nigel', 'date', '2021-11-21', null, '2026-10-01T10:01:00+00'::timestamptz),
  ('chat_seed_nigel_lou_1', 'chat_seed_nigel_lou', 'c_nigel', 'text', 'Ist heute Abend dein Chef da?', '18:02', '2026-10-01T10:01:01+00'::timestamptz),
  ('chat_seed_nigel_lou_2', 'chat_seed_nigel_lou', 'c_lou', 'text', 'kommt drauf an wer fragt', '18:05', '2026-10-01T10:01:02+00'::timestamptz),
  ('chat_seed_nigel_lou_3', 'chat_seed_nigel_lou', 'c_nigel', 'text', 'Ein Freund.', '18:05', '2026-10-01T10:01:03+00'::timestamptz),
  ('chat_seed_nigel_lou_4', 'chat_seed_nigel_lou', 'c_lou', 'text', 'du bist journalist nigel. du hast keine freunde, du hast quellen', '18:07', '2026-10-01T10:01:04+00'::timestamptz),
  ('chat_seed_nigel_lou_5', 'chat_seed_nigel_lou', 'c_nigel', 'text', 'Autsch.', '18:08', '2026-10-01T10:01:05+00'::timestamptz),
  ('chat_seed_nigel_lou_6', 'chat_seed_nigel_lou', 'c_lou', 'text', 'ab 23 uhr ist er weg. ich hab nichts gesagt 🤐', '18:09', '2026-10-01T10:01:06+00'::timestamptz),
  ('chat_seed_riley_roach_d', 'chat_seed_riley_roach', 'c_riley', 'date', '2021-11-22', null, '2026-10-01T10:02:00+00'::timestamptz),
  ('chat_seed_riley_roach_1', 'chat_seed_riley_roach', 'c_riley', 'text', 'dein auto steht schon wieder vor dem café und blockiert den lieferanten', '07:41', '2026-10-01T10:02:01+00'::timestamptz),
  ('chat_seed_riley_roach_2', 'chat_seed_riley_roach', 'c_roach', 'text', 'das ist nicht mein auto', '07:55', '2026-10-01T10:02:02+00'::timestamptz),
  ('chat_seed_riley_roach_3', 'chat_seed_riley_roach', 'c_riley', 'text', 'es hat deinen aufkleber', '07:55', '2026-10-01T10:02:03+00'::timestamptz),
  ('chat_seed_riley_roach_4', 'chat_seed_riley_roach', 'c_roach', 'text', 'ok es ist mein auto', '07:58', '2026-10-01T10:02:04+00'::timestamptz),
  ('chat_seed_riley_roach_5', 'chat_seed_riley_roach', 'c_roach', 'text', '5 min', '07:58', '2026-10-01T10:02:05+00'::timestamptz),
  ('chat_seed_riley_roach_6', 'chat_seed_riley_roach', 'c_riley', 'text', 'du kriegst trotzdem einen kaffee. aber nur weil ich nett bin ☕', '07:59', '2026-10-01T10:02:06+00'::timestamptz),
  ('chat_seed_sam_riley_d', 'chat_seed_sam_riley', 'c_sam', 'date', '2021-11-22', null, '2026-10-01T10:03:00+00'::timestamptz),
  ('chat_seed_sam_riley_1', 'chat_seed_sam_riley', 'c_sam', 'text', 'Nachtschicht vorbei. Habt ihr noch von den Zimtschnecken?', '14:30', '2026-10-01T10:03:01+00'::timestamptz),
  ('chat_seed_sam_riley_2', 'chat_seed_sam_riley', 'c_riley', 'text', 'eine. ich verteidige sie mit meinem leben', '14:33', '2026-10-01T10:03:02+00'::timestamptz),
  ('chat_seed_sam_riley_3', 'chat_seed_sam_riley', 'c_sam', 'text', 'Bin in 10 Minuten da.', '14:34', '2026-10-01T10:03:03+00'::timestamptz),
  ('chat_seed_sam_riley_4', 'chat_seed_sam_riley', 'c_riley', 'text', '🔥', '14:34', '2026-10-01T10:03:04+00'::timestamptz),
  ('chat_seed_nila_cassandra_d', 'chat_seed_nila_cassandra', 'c_cassandra', 'date', '2021-11-23', null, '2026-10-01T10:04:00+00'::timestamptz),
  ('chat_seed_nila_cassandra_1', 'chat_seed_nila_cassandra', 'c_cassandra', 'text', 'Die Leihgabe aus Richmond ist bestätigt. Vernissage bleibt beim 4. Dezember.', '10:12', '2026-10-01T10:04:01+00'::timestamptz),
  ('chat_seed_nila_cassandra_2', 'chat_seed_nila_cassandra', 'c_nila', 'text', 'du bist ein engel', '10:20', '2026-10-01T10:04:02+00'::timestamptz),
  ('chat_seed_nila_cassandra_3', 'chat_seed_nila_cassandra', 'c_nila', 'text', 'und ich hab noch kein einziges bild fertig 🙃', '10:20', '2026-10-01T10:04:03+00'::timestamptz),
  ('chat_seed_nila_cassandra_4', 'chat_seed_nila_cassandra', 'c_cassandra', 'text', 'Du hast elf Tage.', '10:22', '2026-10-01T10:04:04+00'::timestamptz),
  ('chat_seed_nila_cassandra_5', 'chat_seed_nila_cassandra', 'c_cassandra', 'text', 'Das war kein Trost, das war eine Frist.', '10:22', '2026-10-01T10:04:05+00'::timestamptz),
  ('chat_seed_nila_cassandra_6', 'chat_seed_nila_cassandra', 'c_nila', 'text', 'verstanden chefin', '10:25', '2026-10-01T10:04:06+00'::timestamptz),
  ('chat_seed_irina_liam_d', 'chat_seed_irina_liam', 'c_liam', 'date', '2021-11-23', null, '2026-10-01T10:05:00+00'::timestamptz),
  ('chat_seed_irina_liam_1', 'chat_seed_irina_liam', 'c_liam', 'text', 'die fotos von samstag sind fertig. du siehst auf keinem einzigen freundlich aus', '16:48', '2026-10-01T10:05:01+00'::timestamptz),
  ('chat_seed_irina_liam_2', 'chat_seed_irina_liam', 'c_irina', 'text', 'gut', '16:52', '2026-10-01T10:05:02+00'::timestamptz),
  ('chat_seed_irina_liam_3', 'chat_seed_irina_liam', 'c_liam', 'text', 'das war kein kompliment', '16:52', '2026-10-01T10:05:03+00'::timestamptz),
  ('chat_seed_irina_liam_4', 'chat_seed_irina_liam', 'c_irina', 'text', 'für mich schon', '16:53', '2026-10-01T10:05:04+00'::timestamptz),
  ('chat_seed_irina_liam_5', 'chat_seed_irina_liam', 'c_liam', 'text', 'schick ich dir heute abend. das dritte ist wirklich gut', '16:55', '2026-10-01T10:05:05+00'::timestamptz),
  ('chat_seed_irina_liam_6', 'chat_seed_irina_liam', 'c_irina', 'text', 'danke 🖤', '17:01', '2026-10-01T10:05:06+00'::timestamptz),
  ('chat_seed_reece_elliot_d', 'chat_seed_reece_elliot', 'c_reece', 'date', '2021-11-24', null, '2026-10-01T10:06:00+00'::timestamptz),
  ('chat_seed_reece_elliot_1', 'chat_seed_reece_elliot', 'c_reece', 'text', 'alter wo bist du', '01:12', '2026-10-01T10:06:01+00'::timestamptz),
  ('chat_seed_reece_elliot_2', 'chat_seed_reece_elliot', 'c_reece', 'text', 'wir spielen in 20 min und du wolltest kommen', '01:12', '2026-10-01T10:06:02+00'::timestamptz),
  ('chat_seed_reece_elliot_3', 'chat_seed_reece_elliot', 'c_elliot', 'text', 'steh draußen. der türsteher glaubt mir nicht dass ich auf der liste bin', '01:19', '2026-10-01T10:06:03+00'::timestamptz),
  ('chat_seed_reece_elliot_4', 'chat_seed_reece_elliot', 'c_reece', 'text', 'weil du nicht auf der liste bist 😂', '01:20', '2026-10-01T10:06:04+00'::timestamptz),
  ('chat_seed_reece_elliot_5', 'chat_seed_reece_elliot', 'c_reece', 'text', 'komm zum hintereingang', '01:20', '2026-10-01T10:06:05+00'::timestamptz),
  ('chat_seed_reece_elliot_6', 'chat_seed_reece_elliot', 'c_elliot', 'text', '❤️', '01:21', '2026-10-01T10:06:06+00'::timestamptz),
  ('chat_seed_alexander_cassandra_d', 'chat_seed_alexander_cassandra', 'c_alexander', 'date', '2021-11-24', null, '2026-10-01T10:07:00+00'::timestamptz),
  ('chat_seed_alexander_cassandra_1', 'chat_seed_alexander_cassandra', 'c_alexander', 'text', 'Der Vertragsentwurf liegt in Ihrem Postfach. Bitte bis Freitag gegenlesen.', '09:03', '2026-10-01T10:07:01+00'::timestamptz),
  ('chat_seed_alexander_cassandra_2', 'chat_seed_alexander_cassandra', 'c_cassandra', 'text', 'Seit wann siezen wir uns wieder?', '09:40', '2026-10-01T10:07:02+00'::timestamptz),
  ('chat_seed_alexander_cassandra_3', 'chat_seed_alexander_cassandra', 'c_alexander', 'text', 'Seit dein Bruder mitliest.', '09:42', '2026-10-01T10:07:03+00'::timestamptz),
  ('chat_seed_alexander_cassandra_4', 'chat_seed_alexander_cassandra', 'c_cassandra', 'text', 'Verstehe.', '09:43', '2026-10-01T10:07:04+00'::timestamptz),
  ('chat_seed_alexander_cassandra_5', 'chat_seed_alexander_cassandra', 'c_cassandra', 'text', 'Dann sehr geehrter Herr Voss: Mittagessen um eins?', '09:43', '2026-10-01T10:07:05+00'::timestamptz),
  ('chat_seed_alexander_cassandra_6', 'chat_seed_alexander_cassandra', 'c_alexander', 'text', 'Mit Vergnügen.', '09:45', '2026-10-01T10:07:06+00'::timestamptz)
) as v(id, chat_id, character_id, kind, content, inplay_time, created_at)
join characters c on c.id = v.character_id
on conflict (id) do nothing;

-- Chats ohne Nachrichten (fehlende Charaktere) wieder entfernen
delete from chats ch
where ch.id like 'chat_seed_%'
  and not exists (select 1 from chat_messages m where m.chat_id = ch.id);
