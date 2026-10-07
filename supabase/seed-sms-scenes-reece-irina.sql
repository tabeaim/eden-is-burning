-- Test-Szenen (SMS) im Chat von Reece & Irina – zum Ausprobieren der SMS-Szenen.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar; vorher
-- supabase/schema-sms-scenes.sql ausführen. Gedacht für die Live-DB (auf Stage
-- steckt derselbe Block schon in stage-chats-from-live.sql).
-- Legt fünf SMS-Szenen und 16 ausgedachte Test-Nachrichten im bestehenden Chat an
-- und zieht drei vorhandene Nachrichten in die Szene „Zimt im Flur". Gibt es den
-- Chat nicht, passiert nichts.
-- Wieder entfernen:
--   delete from chat_messages where id like 'msg_seed_ri_%';
--   delete from chat_scenes   where id like 'sms_seed_ri_%';

begin;

-- ## Test-Szenen im Chat von Reece & Irina ------------------------------------
-- · „Zimt im Flur" (beendet): aus vorhandenen Nachrichten herausgezogen
-- · „Alles Gute, Professor" (beendet, mit Zusammenfassung)
-- · „Nach dem Konzert" (aktiv, 2019 – Reece schrieb zuletzt)
-- · „Soundcheck" (aktiv, 2021 – Irina schrieb zuletzt, Reece ist dran)
-- · „Das Telegramm" (aktiv, AU „Noir 1947" – Reece ist dran)
-- Der Rest des Chats bleibt lose.
insert into chat_scenes (id, chat_id, title, inplay_date, summary, au, au_name, status, created_by, created_at)
select v.id, v.chat_id, v.title, v.inplay_date, v.summary, v.au, v.au_name, v.status,
       (select p.id from players p where p.id = 'p_tabs'), v.created_at
from (values
  ('sms_seed_ri_zimt', 'chat_g6ejpp9', 'Zimt im Flur', '2021-10-22', 'Reece wundert sich über den Geruch im Treppenhaus.', false, null, 'closed', '2026-10-07T11:59:00+00'::timestamptz),
  ('sms_seed_ri_geb', 'chat_g6ejpp9', 'Alles Gute, Professor', '2021-09-01', 'Irina gratuliert – und hat das Foto auf der Uni-Seite gefunden.', false, null, 'closed', '2026-10-07T11:59:01+00'::timestamptz),
  ('sms_seed_ri_konzert', 'chat_g6ejpp9', 'Nach dem Konzert', '2019-06-14', null, false, null, 'active', '2026-10-07T11:59:02+00'::timestamptz),
  ('sms_seed_ri_sound', 'chat_g6ejpp9', 'Soundcheck', '2021-11-05', null, false, null, 'active', '2026-10-07T11:59:03+00'::timestamptz),
  ('sms_seed_ri_noir', 'chat_g6ejpp9', 'Das Telegramm', '1947-03-02', 'Ein Treffen am Hafen.', true, 'Noir 1947', 'active', '2026-10-07T11:59:04+00'::timestamptz)
) as v(id, chat_id, title, inplay_date, summary, au, au_name, status, created_at)
where exists (select 1 from chats c where c.id = v.chat_id)
on conflict (id) do nothing;

update chat_messages set scene_id = 'sms_seed_ri_zimt'
where id in ('msg_9rs0zjq', 'msg_5038uvp', 'msg_ygrqibu')
  and scene_id is null
  and exists (select 1 from chat_scenes where id = 'sms_seed_ri_zimt');

insert into chat_messages (id, chat_id, character_id, kind, content, inplay_time, inplay_date, scene_id, created_at)
select v.id, 'chat_g6ejpp9', v.character_id, 'text', v.content, v.inplay_time, v.inplay_date, v.scene_id, v.created_at
from (values
  ('msg_seed_ri_01', 'sms_seed_ri_geb', 'c_irina', 'alles gute, professor', '08:02', '2021-09-01', '2026-10-07T12:00:00+00'::timestamptz),
  ('msg_seed_ri_02', 'sms_seed_ri_geb', 'c_reece', 'Woher weißt du das', '08:40', '2021-09-01', '2026-10-07T12:00:01+00'::timestamptz),
  ('msg_seed_ri_03', 'sms_seed_ri_geb', 'c_irina', 'steht auf der uni-seite. mit foto. schlimmes foto', '08:41', '2021-09-01', '2026-10-07T12:00:02+00'::timestamptz),
  ('msg_seed_ri_04', 'sms_seed_ri_geb', 'c_reece', 'Danke. Für beides.', '08:45', '2021-09-01', '2026-10-07T12:00:03+00'::timestamptz),
  ('msg_seed_ri_05', 'sms_seed_ri_konzert', 'c_irina', 'du warst gut heute', '23:52', '2019-06-14', '2026-10-07T12:00:04+00'::timestamptz),
  ('msg_seed_ri_06', 'sms_seed_ri_konzert', 'c_reece', 'Du warst da?', '23:58', '2019-06-14', '2026-10-07T12:00:05+00'::timestamptz),
  ('msg_seed_ri_07', 'sms_seed_ri_konzert', 'c_irina', 'ganz hinten. bin vor der zugabe gegangen', '00:03', '2019-06-15', '2026-10-07T12:00:06+00'::timestamptz),
  ('msg_seed_ri_08', 'sms_seed_ri_konzert', 'c_reece', 'Dann hast du das Beste verpasst.', '00:04', '2019-06-15', '2026-10-07T12:00:07+00'::timestamptz),
  ('msg_seed_ri_09', 'sms_seed_ri_sound', 'c_reece', 'Soundcheck ist um vier. Kommst du?', '13:10', '2021-11-05', '2026-10-07T12:00:08+00'::timestamptz),
  ('msg_seed_ri_10', 'sms_seed_ri_sound', 'c_irina', 'kommt drauf an', '13:25', '2021-11-05', '2026-10-07T12:00:09+00'::timestamptz),
  ('msg_seed_ri_11', 'sms_seed_ri_sound', 'c_reece', 'Worauf', '13:25', '2021-11-05', '2026-10-07T12:00:10+00'::timestamptz),
  ('msg_seed_ri_12', 'sms_seed_ri_sound', 'c_irina', 'ob es kaffee gibt', '13:31', '2021-11-05', '2026-10-07T12:00:11+00'::timestamptz),
  ('msg_seed_ri_13', 'sms_seed_ri_sound', 'c_irina', 'und ob du diesmal pünktlich bist', '13:31', '2021-11-05', '2026-10-07T12:00:12+00'::timestamptz),
  ('msg_seed_ri_14', 'sms_seed_ri_noir', 'c_reece', 'Das Telegramm ist angekommen.', '21:15', '1947-03-02', '2026-10-07T12:00:13+00'::timestamptz),
  ('msg_seed_ri_15', 'sms_seed_ri_noir', 'c_irina', 'dann weißt du ja, was zu tun ist', '21:40', '1947-03-02', '2026-10-07T12:00:14+00'::timestamptz),
  ('msg_seed_ri_16', 'sms_seed_ri_noir', 'c_irina', 'mitternacht. am hafen. allein', '21:41', '1947-03-02', '2026-10-07T12:00:15+00'::timestamptz)
) as v(id, scene_id, character_id, content, inplay_time, inplay_date, created_at)
where exists (select 1 from chat_scenes s where s.id = v.scene_id)
  and exists (select 1 from characters c where c.id = v.character_id)
on conflict (id) do nothing;

commit;
