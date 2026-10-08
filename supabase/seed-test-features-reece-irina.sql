-- Test-Beispiele zwischen Reece & Irina für die neuen Features: Sprachnachricht,
-- Mailbox und Drehbuch-Format. Im Supabase SQL-Editor ausführen (Run). Wiederholbar.
-- Vorher ausführen: schema-voicemail.sql und schema-scene-format.sql.
-- Gibt es den Chat bzw. die beiden Charaktere nicht, passiert nichts.
-- Wieder entfernen:
--   delete from chat_messages where id like 'msg_seed_feat_%';
--   delete from calls         where id like 'call_seed_feat_%';
--   delete from scenes        where id = 'scene_seed_feat_script';

begin;

-- ## 1. Sprachnachrichten ------------------------------------------------------
-- Zwei lose Nachrichten im bestehenden Chat (Handy → Nachrichten → Reece & Irina,
-- 12.11.2021): Play-Symbol, Wellenform, Dauer; „Text ausklappen" zeigt den Text.
insert into chat_messages (id, chat_id, character_id, kind, content, inplay_time, inplay_date, created_at)
select v.id, 'chat_g6ejpp9', v.character_id, 'voice', v.content, v.inplay_time, '2021-11-12', v.created_at
from (values
  ('msg_seed_feat_01', 'c_irina', 'okay, ich tipp das jetzt nicht alles. also: ich steh vor deinem büro, die tür ist zu, und auf dem zettel steht „gleich zurück“. der zettel ist vergilbt, reece. wie lange hängt der da schon?', '16:42', now() - interval '2 minutes'),
  ('msg_seed_feat_02', 'c_reece', 'Seit 2019. Er funktioniert hervorragend. Bleib, wo du bist, ich bin in fünf Minuten da.', '16:44', now() - interval '1 minute')
) as v(id, character_id, content, inplay_time, created_at)
where exists (select 1 from chats c where c.id = 'chat_g6ejpp9')
  and exists (select 1 from characters c where c.id = v.character_id)
on conflict (id) do nothing;

-- ## 2. Mailbox ----------------------------------------------------------------
-- · Irina ruft Reece an, er lehnt ab, sie spricht auf die Mailbox → steht bei
--   beiden in der Anrufliste; Reece bekommt den Hinweis „Anhören" aufs Dashboard.
-- · Reece ruft Irina an, sie lehnt ab, noch nichts aufgesprochen → Reece bekommt
--   „Auf die Mailbox sprechen" aufs Dashboard (zum Selbst-Ausprobieren).
-- Die Hinweise erscheinen nur für Anrufe der letzten 7 Tage – deshalb now().
insert into calls (id, caller_id, callee_id, inplay_date, inplay_time, status, voicemail, created_at)
select v.id, v.caller_id, v.callee_id, '2021-11-13', v.inplay_time, 'declined', v.voicemail, v.created_at
from (values
  ('call_seed_feat_01', 'c_irina', 'c_reece', '09:15', 'guten morgen, professor. du hast deinen schal bei mir vergessen. ich trag ihn jetzt, bis du drangehst. ruf zurück.', now() - interval '4 minutes'),
  ('call_seed_feat_02', 'c_reece', 'c_irina', '09:40', null, now() - interval '3 minutes')
) as v(id, caller_id, callee_id, inplay_time, voicemail, created_at)
where exists (select 1 from characters c where c.id = 'c_reece')
  and exists (select 1 from characters c where c.id = 'c_irina')
on conflict (id) do nothing;

-- ## 3. Drehbuch-Format --------------------------------------------------------
-- Telefonszene „Der Schal" mit zwei Posts: Regieanweisungen, Dialog beider
-- Charaktere und eine Nebenfigur mit freiem Namen. Reece ist als Nächster dran.
insert into scenes (id, title, location_area, location_name, inplay_date, inplay_time, status, trigger_warning, participant_ids, summary, format, created_at)
select 'scene_seed_feat_script', 'Der Schal', 'phone', 'am Telefon', '2021-11-13', '11:05', 'active', false,
       array['c_reece', 'c_irina'], 'Reece ruft wegen des Schals zurück. (Test: Drehbuch-Format)', 'script', now() - interval '10 minutes'
where exists (select 1 from characters c where c.id = 'c_reece')
  and exists (select 1 from characters c where c.id = 'c_irina')
on conflict (id) do nothing;

insert into posts (id, scene_id, character_id, content, post_number, created_at)
select v.id, 'scene_seed_feat_script', v.character_id, v.content, v.post_number, v.created_at
from (values
  ('post_seed_feat_01', 'c_reece', 1,
   '{"script":[{"k":"dir","text":"Reece steht im Flur des Instituts, das Handy am Ohr, und sucht mit der freien Hand seine Manteltaschen ab."},{"k":"line","who":"c_reece","text":"Du hast meinen Schal."},{"k":"line","who":"c_reece","text":"Das ist kein Vorwurf. Das ist eine Feststellung. Draußen sind vier Grad."}]}',
   now() - interval '9 minutes'),
  ('post_seed_feat_02', 'c_irina', 2,
   '{"script":[{"k":"dir","text":"Irina sitzt im Café, den Schal zweimal um den Hals gewickelt. Sie lässt es dreimal klingeln, bevor sie abnimmt."},{"k":"line","who":"c_irina","text":"ich hab einen schal. ob es deiner ist, müsste man prüfen."},{"k":"line","name":"Kellnerin","text":"Noch einen Kaffee?"},{"k":"line","who":"c_irina","text":"zwei. er kommt gleich vorbei, er weiß es nur noch nicht."},{"k":"dir","text":"Sie legt auf."}]}',
   now() - interval '8 minutes')
) as v(id, character_id, post_number, content, created_at)
where exists (select 1 from scenes s where s.id = 'scene_seed_feat_script')
on conflict (id) do nothing;

commit;
