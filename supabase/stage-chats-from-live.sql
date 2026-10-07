-- Chats aus der Live-DB (Stand 2026-10-07) nach Stage übertragen und ein paar
-- SMS-Test-Szenen zwischen Reece & Irina anlegen. Im Supabase SQL-Editor von
-- „eden stage" ausführen (Run). NICHT in der Live-DB. Wiederholbar.
-- Vorher supabase/schema-sms-scenes.sql ausführen.
-- Übernommen werden nur Chats, deren Beteiligte es auf Stage gibt. Hat Stage für
-- dasselbe Paar schon einen anderen Chat, wandern dessen Nachrichten in den
-- übernommenen (je Paar gibt es nur einen Chat). Sonst wird auf Stage nichts
-- gelöscht. Bilder liegen weiter im Speicher der Live-Umgebung.

begin;

create temp table _live_chats on commit drop as
select l.*
from jsonb_populate_recordset(null::chats, $live$[
 {
  "id": "chat_seed_elliot_julius",
  "participant_ids": [
   "c_elliot",
   "c_julius"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:00:00+00:00",
  "left_on_read": {},
  "archived_by": [
   "c_elliot"
  ]
 },
 {
  "id": "chat_seed_nigel_lou",
  "participant_ids": [
   "c_nigel",
   "c_lou"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:01:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_seed_riley_roach",
  "participant_ids": [
   "c_riley",
   "c_roach"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:02:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_seed_sam_riley",
  "participant_ids": [
   "c_sam",
   "c_riley"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:03:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_seed_nila_cassandra",
  "participant_ids": [
   "c_nila",
   "c_cassandra"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:04:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_seed_reece_elliot",
  "participant_ids": [
   "c_reece",
   "c_elliot"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:06:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_seed_alexander_cassandra",
  "participant_ids": [
   "c_alexander",
   "c_cassandra"
  ],
  "created_by": null,
  "created_at": "2026-10-01T10:07:00+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_g6ejpp9",
  "participant_ids": [
   "c_reece",
   "c_irina"
  ],
  "created_by": "p_tabs",
  "created_at": "2026-10-04T22:25:10.231+00:00",
  "left_on_read": {},
  "archived_by": []
 },
 {
  "id": "chat_zknjg6h",
  "participant_ids": [
   "c_elliot",
   "c_liam"
  ],
  "created_by": "p_tabs",
  "created_at": "2026-10-04T22:55:12.711+00:00",
  "left_on_read": {
   "c_elliot": "msg_fd4gzcb"
  },
  "archived_by": []
 },
 {
  "id": "chat_jta4b6g",
  "participant_ids": [
   "npc_0gon43a",
   "c_irina"
  ],
  "created_by": "p_kat",
  "created_at": "2026-10-06T10:30:13.92+00:00",
  "left_on_read": {
   "c_irina": "msg_dznsdoz"
  },
  "archived_by": []
 }
]$live$::jsonb) l
where not exists (
  select 1 from jsonb_array_elements_text(l.participant_ids) p
  where not exists (select 1 from characters c where c.id = p)
);

insert into chats (id, participant_ids, created_by, created_at, left_on_read, archived_by)
select l.id, l.participant_ids,
       (select p.id from players p where p.id = l.created_by),
       l.created_at, coalesce(l.left_on_read, '{}'::jsonb), coalesce(l.archived_by, '[]'::jsonb)
from _live_chats l
on conflict (id) do update set
  participant_ids = excluded.participant_ids,
  left_on_read = excluded.left_on_read,
  archived_by = excluded.archived_by;

-- Stage-Chats desselben Paars (andere ID) in den übernommenen Chat zusammenführen
create temp table _dupes on commit drop as
select s.id as old_id, l.id as new_id
from chats s
join _live_chats l on l.id <> s.id
 and (select array_agg(x order by x) from jsonb_array_elements_text(s.participant_ids) x)
   = (select array_agg(x order by x) from jsonb_array_elements_text(l.participant_ids) x)
where s.id not in (select id from _live_chats);

update chat_messages m set chat_id = d.new_id from _dupes d where m.chat_id = d.old_id;
update chat_scenes   c set chat_id = d.new_id from _dupes d where c.chat_id = d.old_id;
delete from chats where id in (select old_id from _dupes);

insert into chat_messages (id, chat_id, character_id, kind, content, reply_to, reactions, inplay_time, created_at)
select l.id, l.chat_id, l.character_id, l.kind, l.content, l.reply_to,
       coalesce(l.reactions, '{}'::jsonb), l.inplay_time, l.created_at
from jsonb_populate_recordset(null::chat_messages, $live$[
 {
  "id": "chat_seed_elliot_julius_d",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_elliot",
  "kind": "date",
  "content": "2021-11-20",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_elliot_julius_1",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "bist du noch im studio?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:01+00:00",
  "inplay_time": "22:14"
 },
 {
  "id": "chat_seed_elliot_julius_2",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_julius",
  "kind": "text",
  "content": "bis mindestens 2. warum",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:02+00:00",
  "inplay_time": "22:16"
 },
 {
  "id": "chat_seed_elliot_julius_3",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "brauch nen ort wo mein vater mich nicht findet",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:03+00:00",
  "inplay_time": "22:16"
 },
 {
  "id": "chat_seed_elliot_julius_4",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_julius",
  "kind": "text",
  "content": "😂",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:04+00:00",
  "inplay_time": "22:17"
 },
 {
  "id": "chat_seed_elliot_julius_5",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_julius",
  "kind": "text",
  "content": "tür ist offen. bring kaffee mit",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:05+00:00",
  "inplay_time": "22:17"
 },
 {
  "id": "chat_seed_elliot_julius_6",
  "chat_id": "chat_seed_elliot_julius",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "20 min",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:00:06+00:00",
  "inplay_time": "22:19"
 },
 {
  "id": "chat_seed_nigel_lou_d",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_nigel",
  "kind": "date",
  "content": "2021-11-21",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_nigel_lou_1",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_nigel",
  "kind": "text",
  "content": "Ist heute Abend dein Chef da?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:01+00:00",
  "inplay_time": "18:02"
 },
 {
  "id": "chat_seed_nigel_lou_2",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_lou",
  "kind": "text",
  "content": "kommt drauf an wer fragt",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:02+00:00",
  "inplay_time": "18:05"
 },
 {
  "id": "chat_seed_nigel_lou_3",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_nigel",
  "kind": "text",
  "content": "Ein Freund.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:03+00:00",
  "inplay_time": "18:05"
 },
 {
  "id": "chat_seed_nigel_lou_4",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_lou",
  "kind": "text",
  "content": "du bist journalist nigel. du hast keine freunde, du hast quellen",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:04+00:00",
  "inplay_time": "18:07"
 },
 {
  "id": "chat_seed_nigel_lou_5",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_nigel",
  "kind": "text",
  "content": "Autsch.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:05+00:00",
  "inplay_time": "18:08"
 },
 {
  "id": "chat_seed_nigel_lou_6",
  "chat_id": "chat_seed_nigel_lou",
  "character_id": "c_lou",
  "kind": "text",
  "content": "ab 23 uhr ist er weg. ich hab nichts gesagt 🤐",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:01:06+00:00",
  "inplay_time": "18:09"
 },
 {
  "id": "chat_seed_riley_roach_d",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_riley",
  "kind": "date",
  "content": "2021-11-22",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_riley_roach_1",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_riley",
  "kind": "text",
  "content": "dein auto steht schon wieder vor dem café und blockiert den lieferanten",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:01+00:00",
  "inplay_time": "07:41"
 },
 {
  "id": "chat_seed_riley_roach_2",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_roach",
  "kind": "text",
  "content": "das ist nicht mein auto",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:02+00:00",
  "inplay_time": "07:55"
 },
 {
  "id": "chat_seed_riley_roach_3",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_riley",
  "kind": "text",
  "content": "es hat deinen aufkleber",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:03+00:00",
  "inplay_time": "07:55"
 },
 {
  "id": "chat_seed_riley_roach_4",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_roach",
  "kind": "text",
  "content": "ok es ist mein auto",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:04+00:00",
  "inplay_time": "07:58"
 },
 {
  "id": "chat_seed_riley_roach_5",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_roach",
  "kind": "text",
  "content": "5 min",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:05+00:00",
  "inplay_time": "07:58"
 },
 {
  "id": "chat_seed_riley_roach_6",
  "chat_id": "chat_seed_riley_roach",
  "character_id": "c_riley",
  "kind": "text",
  "content": "du kriegst trotzdem einen kaffee. aber nur weil ich nett bin ☕",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:02:06+00:00",
  "inplay_time": "07:59"
 },
 {
  "id": "chat_seed_sam_riley_d",
  "chat_id": "chat_seed_sam_riley",
  "character_id": "c_sam",
  "kind": "date",
  "content": "2021-11-22",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:03:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_sam_riley_1",
  "chat_id": "chat_seed_sam_riley",
  "character_id": "c_sam",
  "kind": "text",
  "content": "Nachtschicht vorbei. Habt ihr noch von den Zimtschnecken?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:03:01+00:00",
  "inplay_time": "14:30"
 },
 {
  "id": "chat_seed_sam_riley_2",
  "chat_id": "chat_seed_sam_riley",
  "character_id": "c_riley",
  "kind": "text",
  "content": "eine. ich verteidige sie mit meinem leben",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:03:02+00:00",
  "inplay_time": "14:33"
 },
 {
  "id": "chat_seed_sam_riley_3",
  "chat_id": "chat_seed_sam_riley",
  "character_id": "c_sam",
  "kind": "text",
  "content": "Bin in 10 Minuten da.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:03:03+00:00",
  "inplay_time": "14:34"
 },
 {
  "id": "chat_seed_sam_riley_4",
  "chat_id": "chat_seed_sam_riley",
  "character_id": "c_riley",
  "kind": "text",
  "content": "🔥",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:03:04+00:00",
  "inplay_time": "14:34"
 },
 {
  "id": "chat_seed_nila_cassandra_d",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_cassandra",
  "kind": "date",
  "content": "2021-11-23",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_nila_cassandra_1",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Die Leihgabe aus Richmond ist bestätigt. Vernissage bleibt beim 4. Dezember.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:01+00:00",
  "inplay_time": "10:12"
 },
 {
  "id": "chat_seed_nila_cassandra_2",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_nila",
  "kind": "text",
  "content": "du bist ein engel",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:02+00:00",
  "inplay_time": "10:20"
 },
 {
  "id": "chat_seed_nila_cassandra_3",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_nila",
  "kind": "text",
  "content": "und ich hab noch kein einziges bild fertig 🙃",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:03+00:00",
  "inplay_time": "10:20"
 },
 {
  "id": "chat_seed_nila_cassandra_4",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Du hast elf Tage.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:04+00:00",
  "inplay_time": "10:22"
 },
 {
  "id": "chat_seed_nila_cassandra_5",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Das war kein Trost, das war eine Frist.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:05+00:00",
  "inplay_time": "10:22"
 },
 {
  "id": "chat_seed_nila_cassandra_6",
  "chat_id": "chat_seed_nila_cassandra",
  "character_id": "c_nila",
  "kind": "text",
  "content": "verstanden chefin",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:04:06+00:00",
  "inplay_time": "10:25"
 },
 {
  "id": "chat_seed_reece_elliot_d",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_reece",
  "kind": "date",
  "content": "2021-11-24",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_reece_elliot_1",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_reece",
  "kind": "text",
  "content": "alter wo bist du",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:01+00:00",
  "inplay_time": "01:12"
 },
 {
  "id": "chat_seed_reece_elliot_2",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_reece",
  "kind": "text",
  "content": "wir spielen in 20 min und du wolltest kommen",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:02+00:00",
  "inplay_time": "01:12"
 },
 {
  "id": "chat_seed_reece_elliot_3",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "steh draußen. der türsteher glaubt mir nicht dass ich auf der liste bin",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:03+00:00",
  "inplay_time": "01:19"
 },
 {
  "id": "chat_seed_reece_elliot_4",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_reece",
  "kind": "text",
  "content": "weil du nicht auf der liste bist 😂",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:04+00:00",
  "inplay_time": "01:20"
 },
 {
  "id": "chat_seed_reece_elliot_5",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_reece",
  "kind": "text",
  "content": "komm zum hintereingang",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:05+00:00",
  "inplay_time": "01:20"
 },
 {
  "id": "chat_seed_reece_elliot_6",
  "chat_id": "chat_seed_reece_elliot",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "❤️",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:06:06+00:00",
  "inplay_time": "01:21"
 },
 {
  "id": "chat_seed_alexander_cassandra_d",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_alexander",
  "kind": "date",
  "content": "2021-11-24",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:00+00:00",
  "inplay_time": null
 },
 {
  "id": "chat_seed_alexander_cassandra_1",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_alexander",
  "kind": "text",
  "content": "Der Vertragsentwurf liegt in Ihrem Postfach. Bitte bis Freitag gegenlesen.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:01+00:00",
  "inplay_time": "09:03"
 },
 {
  "id": "chat_seed_alexander_cassandra_2",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Seit wann siezen wir uns wieder?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:02+00:00",
  "inplay_time": "09:40"
 },
 {
  "id": "chat_seed_alexander_cassandra_3",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_alexander",
  "kind": "text",
  "content": "Seit dein Bruder mitliest.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:03+00:00",
  "inplay_time": "09:42"
 },
 {
  "id": "chat_seed_alexander_cassandra_4",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Verstehe.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:04+00:00",
  "inplay_time": "09:43"
 },
 {
  "id": "chat_seed_alexander_cassandra_5",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_cassandra",
  "kind": "text",
  "content": "Dann sehr geehrter Herr Voss: Mittagessen um eins?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:05+00:00",
  "inplay_time": "09:43"
 },
 {
  "id": "chat_seed_alexander_cassandra_6",
  "chat_id": "chat_seed_alexander_cassandra",
  "character_id": "c_alexander",
  "kind": "text",
  "content": "Mit Vergnügen.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-01T10:07:06+00:00",
  "inplay_time": "09:45"
 },
 {
  "id": "msg_s1bgivz",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "date",
  "content": "2021-10-22",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-04T22:25:10.232+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_9rs0zjq",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "Wieso riecht es hier nach Zimt?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-04T22:25:10.233+00:00",
  "inplay_time": "12:00"
 },
 {
  "id": "msg_5zoh4b7",
  "chat_id": "chat_zknjg6h",
  "character_id": "c_elliot",
  "kind": "date",
  "content": "2021-10-06",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-04T22:55:12.712+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_l1da4su",
  "chat_id": "chat_zknjg6h",
  "character_id": "c_elliot",
  "kind": "text",
  "content": "yo",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-04T22:55:12.713+00:00",
  "inplay_time": "12:00"
 },
 {
  "id": "msg_5038uvp",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "gif",
  "content": "https://media1.giphy.com/media/v1.Y2lkPWYwZDk5Y2ZhczNicDcxOXlmZ3U2bG8xaHdiejNyZDJqN214bGI3OWV0NW5scW1sZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l4EaS0pON3oRD1mnjM/giphy-downsized.gif",
  "reply_to": null,
  "reactions": {
   "❤️": [
    "c_irina"
   ]
  },
  "created_at": "2026-10-04T23:45:25.5+00:00",
  "inplay_time": "12:01"
 },
 {
  "id": "msg_ygrqibu",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "Let‘s not, actually",
  "reply_to": null,
  "reactions": {
   "😂": [
    "c_irina"
   ]
  },
  "created_at": "2026-10-04T23:46:04.755+00:00",
  "inplay_time": "12:03"
 },
 {
  "id": "msg_dprtx0x",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "image",
  "content": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/chat/muuuder7-k73v0h2.webp",
  "reply_to": null,
  "reactions": {
   "👍": [
    "c_reece"
   ]
  },
  "created_at": "2026-10-05T06:01:20.139+00:00",
  "inplay_time": "12:04"
 },
 {
  "id": "msg_6afh0a1",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "date",
  "content": "2021-10-22",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T06:01:32.006+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_iksh2t0",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Test test",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T06:01:42.906+00:00",
  "inplay_time": "12:05"
 },
 {
  "id": "msg_z7sb2en",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Abc ❤️ Def 💐  GHIJ längere Nachricht längere Nachricht lorem ipsum dolor sit amet längere Nachricht (ich denke mir jetzt nichts Richtiges hier aus, es ist acht Uhr morgens und ich sollte arbeiten)",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T06:02:32.152+00:00",
  "inplay_time": "12:18"
 },
 {
  "id": "msg_0u50qw1",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Aber wieso nicht?",
  "reply_to": "msg_ygrqibu",
  "reactions": {
   "🤔": [
    "c_reece"
   ]
  },
  "created_at": "2026-10-05T06:02:51.268+00:00",
  "inplay_time": "12:19"
 },
 {
  "id": "msg_fd4gzcb",
  "chat_id": "chat_zknjg6h",
  "character_id": "c_liam",
  "kind": "text",
  "content": "yo",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T06:03:44.635+00:00",
  "inplay_time": "12:01"
 },
 {
  "id": "msg_2vsnwoe",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "gif",
  "content": "https://media2.giphy.com/media/v1.Y2lkPWYwZDk5Y2ZhYzkzZGhiZjJncjRvdGFmMW1hemplbXY5YXV0emxqcWR0NjVjZGZuYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TE1Pvswu6A5eGZy6w0/giphy-downsized.gif",
  "reply_to": null,
  "reactions": {
   "😂": [
    "c_reece"
   ]
  },
  "created_at": "2026-10-05T06:07:33.149+00:00",
  "inplay_time": "12:20"
 },
 {
  "id": "msg_u2yg5us",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "🤣",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T16:07:20.479+00:00",
  "inplay_time": "12:21"
 },
 {
  "id": "msg_fskyeqk",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "was ist ein Reece approppriate Emoji",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-05T16:07:30.771+00:00",
  "inplay_time": "12:22"
 },
 {
  "id": "msg_n4cwq4b",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "(keiner)",
  "reply_to": null,
  "reactions": {
   "❤️": [
    "c_irina"
   ]
  },
  "created_at": "2026-10-05T16:13:48.927+00:00",
  "inplay_time": "12:23"
 },
 {
  "id": "msg_6ysd15w",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Test?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:14:59.838+00:00",
  "inplay_time": "12:24"
 },
 {
  "id": "msg_dh621u6",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "date",
  "content": "2021-09-13",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:30:13.921+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_4xyfdki",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Hello",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:30:13.922+00:00",
  "inplay_time": "12:00"
 },
 {
  "id": "msg_wl4yh0h",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "What are we giving Mom for her birthday this year?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:30:24.937+00:00",
  "inplay_time": "12:01"
 },
 {
  "id": "msg_kbu3tsg",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Except for heartache and pain because you're still single and a workaholic",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:30:47.316+00:00",
  "inplay_time": "12:02"
 },
 {
  "id": "msg_yr92x7k",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "date",
  "content": "2021-09-15",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:31:45.395+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_zqc7j11",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Sorry, just saw this. I've got a present, since her birthday is literally two days away, I don't know about you, though.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:31:54.738+00:00",
  "inplay_time": "17:15"
 },
 {
  "id": "msg_fjz7sm6",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "You got her something without asking me if I wanted to CashApp you money?!?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:32:16.098+00:00",
  "inplay_time": "17:19"
 },
 {
  "id": "msg_oy7xp8g",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "She's your mother too, you know?",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:32:45.001+00:00",
  "inplay_time": "18:08"
 },
 {
  "id": "msg_1u3jwe9",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Stop ghosting me like I'm one of your spark matches",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:33:00.515+00:00",
  "inplay_time": "18:09"
 },
 {
  "id": "msg_mhn1f84",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Her birthday is so soon, what are you getting her? Can I get in on it? I'll even FaceTime you when I hand it to her",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:33:35.235+00:00",
  "inplay_time": "18:10"
 },
 {
  "id": "msg_5yavsf3",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Those wait days for a response, I've got things to do?!",
  "reply_to": "msg_1u3jwe9",
  "reactions": {},
  "created_at": "2026-10-06T10:34:18.083+00:00",
  "inplay_time": "19:13"
 },
 {
  "id": "msg_a15rhfd",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Get her a Rituals gift basket or something, idc, I listened to her and got her something she'll like",
  "reply_to": "msg_mhn1f84",
  "reactions": {},
  "created_at": "2026-10-06T10:34:34.408+00:00",
  "inplay_time": "19:14"
 },
 {
  "id": "msg_ffl1x2p",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Oh and my sole purpose in life is to text you about Mom's birthday or what",
  "reply_to": "msg_5yavsf3",
  "reactions": {},
  "created_at": "2026-10-06T10:34:52.061+00:00",
  "inplay_time": "19:15"
 },
 {
  "id": "msg_bn3r1if",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "That's what she got for mother's day, can't repeat that already",
  "reply_to": "msg_a15rhfd",
  "reactions": {},
  "created_at": "2026-10-06T10:35:07.323+00:00",
  "inplay_time": "19:16"
 },
 {
  "id": "msg_yytfkkv",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Also she put the shower gel in the guest bathroom, I'm afraid she's getting sick of their Sakura line",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:36:04.653+00:00",
  "inplay_time": "19:17"
 },
 {
  "id": "msg_iwvpniz",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Yes?",
  "reply_to": "msg_ffl1x2p",
  "reactions": {
   "🙄": [
    "npc_0gon43a"
   ]
  },
  "created_at": "2026-10-06T10:36:21.036+00:00",
  "inplay_time": "19:27"
 },
 {
  "id": "msg_1ga8qvx",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Jesus Christ, she's getting a scarf she'll never wear because it's \"too nice\", CashApp me $50 and I'll put your name on the card.",
  "reply_to": null,
  "reactions": {
   "👍": [
    "npc_0gon43a"
   ]
  },
  "created_at": "2026-10-06T10:37:11.537+00:00",
  "inplay_time": "19:28"
 },
 {
  "id": "msg_k7e4kvl",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "And send me a picture of your kid so she's reminded one of us is happily coupled up and she needn't worry about an heir anymore.",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T10:37:33.992+00:00",
  "inplay_time": "19:29"
 },
 {
  "id": "msg_nyez08c",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "Just check Diana's Captic and pick one",
  "reply_to": "msg_k7e4kvl",
  "reactions": {},
  "created_at": "2026-10-06T10:38:12.889+00:00",
  "inplay_time": "19:36"
 },
 {
  "id": "msg_03x8n58",
  "chat_id": "chat_jta4b6g",
  "character_id": "c_irina",
  "kind": "text",
  "content": "Is there anything I can delegate to you, ever?",
  "reply_to": "msg_nyez08c",
  "reactions": {},
  "created_at": "2026-10-06T10:38:24.451+00:00",
  "inplay_time": "19:37"
 },
 {
  "id": "msg_dznsdoz",
  "chat_id": "chat_jta4b6g",
  "character_id": "npc_0gon43a",
  "kind": "text",
  "content": "No, thanks and good night",
  "reply_to": "msg_03x8n58",
  "reactions": {},
  "created_at": "2026-10-06T10:38:40.452+00:00",
  "inplay_time": "19:38"
 },
 {
  "id": "msg_qj6np7l",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "Test",
  "reply_to": null,
  "reactions": {
   "❤️": [
    "c_irina"
   ]
  },
  "created_at": "2026-10-06T10:41:19.077+00:00",
  "inplay_time": "12:25"
 },
 {
  "id": "msg_i0tdo74",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "date",
  "content": "2021-08-04",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-06T16:36:30.678+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_cxo7na0",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "lalaa vom Handy gehts auch",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T00:31:41.002+00:00",
  "inplay_time": "12:26"
 },
 {
  "id": "msg_0687jo8",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "date",
  "content": "2021-08-12",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T00:32:26.688+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_uhj6ln4",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "aber das ergibt ja keinen Sinn",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T00:32:39.321+00:00",
  "inplay_time": "13:18"
 },
 {
  "id": "msg_0dlu512",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "date",
  "content": "2021-07-05",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T00:32:51.297+00:00",
  "inplay_time": null
 },
 {
  "id": "msg_p573do9",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "time gravelers",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T00:32:58.668+00:00",
  "inplay_time": "13:19"
 },
 {
  "id": "msg_pw8zkww",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "ja, deswegen hatte ich das ausprobiert",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T06:19:21.009+00:00",
  "inplay_time": "13:20"
 },
 {
  "id": "msg_y2yckvh",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_irina",
  "kind": "text",
  "content": "aber automatisch nach (tag + zeit) ordnen zu lassen ist auch dumm, dann schickt man ne nachricht ab und die springt irgendwo hin",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T06:19:37.53+00:00",
  "inplay_time": "13:21"
 },
 {
  "id": "msg_dg4i29t",
  "chat_id": "chat_g6ejpp9",
  "character_id": "c_reece",
  "kind": "text",
  "content": "hmmmmm",
  "reply_to": null,
  "reactions": {},
  "created_at": "2026-10-07T07:59:38.815+00:00",
  "inplay_time": "13:22"
 }
]$live$::jsonb) l
where l.chat_id in (select id from _live_chats)
  and exists (select 1 from characters c where c.id = l.character_id)
on conflict (id) do update set
  kind = excluded.kind,
  content = excluded.content,
  reply_to = excluded.reply_to,
  reactions = excluded.reactions,
  inplay_time = excluded.inplay_time,
  created_at = excluded.created_at;

-- Inplay-Datum aus dem Tagestrenner darüber (wie in schema-sms-scenes.sql)
update chat_messages m
set inplay_date = (
  select split_part(d.content, '|', 1)
  from chat_messages d
  where d.chat_id = m.chat_id and d.kind = 'date' and d.created_at <= m.created_at
  order by d.created_at desc
  limit 1
)
where m.kind <> 'date' and m.inplay_date is null;

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
  ('msg_seed_ri_07', 'sms_seed_ri_konzert', 'c_irina', 'ganz hinten. bin vor der zugabe gegangen', '00:03', '2019-06-14', '2026-10-07T12:00:06+00'::timestamptz),
  ('msg_seed_ri_08', 'sms_seed_ri_konzert', 'c_reece', 'Dann hast du das Beste verpasst.', '00:04', '2019-06-14', '2026-10-07T12:00:07+00'::timestamptz),
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
