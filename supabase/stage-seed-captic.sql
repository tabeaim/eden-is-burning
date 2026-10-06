-- Testdaten für Captic (für Stage gedacht): Profile, Beiträge, Kommentare,
-- Stories und Aktivitäten zwischen Irina, Reece, Elliot, Liam, Alexander, Nila und Riley.
-- Vorher supabase/schema-captic.sql ausführen. Wiederholbar (idempotent).
-- Die Bilder sind Platzhalter-Fotos von picsum.photos (zufällige Motive, belegen
-- keinen eigenen Speicher) – die Bildunterschriften passen deshalb nur ungefähr.

-- Profile: Captic einschalten, Nutzername, Bio, Zahlen und wem sie folgen.
-- Was ein Charakter schon selbst eingetragen hat, bleibt stehen (z.B. Irinas
-- Nutzername und Bio); die Testwerte füllen nur, was fehlt.
update characters c
set phone = coalesce(c.phone, '{}'::jsonb)
  || jsonb_build_object('captic', v.captic || coalesce(c.phone -> 'captic', '{}'::jsonb) || '{"enabled": true}'::jsonb)
from (values
  ('c_irina', '{"handle": "irikalina", "bio": "she/her.\nthis is what it is to be happy.", "followers": 842, "following": 311,
    "follows": ["c_reece", "c_liam", "c_nila", "c_riley"]}'::jsonb),
  ('c_reece', '{"handle": "reecemalone", "bio": "songs about people who will never hear them.\nbooking: dm", "followers": 18400, "following": 502,
    "follows": ["c_irina", "c_elliot", "c_liam", "c_riley"]}'::jsonb),
  ('c_elliot', '{"handle": "elliot.simmons", "bio": "BRAND NEW MORAL CODE", "followers": 5230, "following": 187,
    "follows": ["c_reece", "c_alexander", "c_riley"]}'::jsonb),
  ('c_liam', '{"handle": "liamcarter.jpg", "bio": "photographer. eden & elsewhere.\nprints on request.", "followers": 12900, "following": 940,
    "follows": ["c_irina", "c_nila", "c_reece", "c_riley", "c_elliot"]}'::jsonb),
  ('c_alexander', '{"handle": "a.m.voss", "bio": "Voss & Partner.", "followers": 96, "following": 12,
    "follows": ["c_elliot"]}'::jsonb),
  ('c_nila', '{"handle": "nila.okafor", "bio": "paints what the city keeps quiet.\ngallery: washington district", "followers": 7610, "following": 428,
    "follows": ["c_liam", "c_irina", "c_riley"]}'::jsonb),
  ('c_riley', '{"handle": "rileyonespresso", "bio": "runs on caffeine and bad ideas ☕\nyes we are open. no i am not awake.", "followers": 1340, "following": 1207,
    "follows": ["c_irina", "c_reece", "c_elliot", "c_liam", "c_nila", "c_alexander"]}'::jsonb)
) as v(id, captic)
where c.id = v.id;

-- Beiträge – nur von Charakteren, die es in dieser Datenbank gibt
insert into captic_posts (id, character_id, kind, url, ar, caption, likes, liked_by, inplay_date, created_at)
select v.*
from (values
  ('cap_seed_irina_1', 'c_irina', 'image', 'https://picsum.photos/seed/eden-irina-1/1080/1350', 0.8::real,
    'double shift. send help or tips 🖤', 61, '["c_reece", "c_riley"]'::jsonb, '2021-11-12', '2026-10-06T09:00:00+00'::timestamptz),
  ('cap_seed_irina_2', 'c_irina', 'image', 'https://picsum.photos/seed/eden-irina-2/1080/1080', 1::real,
    'river''s edge, 6am. nobody talks. perfect.', 94, '["c_liam", "c_nila"]'::jsonb, '2021-11-19', '2026-10-06T09:01:00+00'::timestamptz),
  ('cap_seed_irina_3', 'c_irina', 'image', 'https://picsum.photos/seed/eden-irina-3/1080/1350', 0.8::real,
    'photo by @liamcarter.jpg. apparently i don''t look friendly in a single one', 213, '["c_liam", "c_reece", "c_riley", "c_nila"]'::jsonb, '2021-11-23', '2026-10-06T09:02:00+00'::timestamptz),

  ('cap_seed_reece_1', 'c_reece', 'image', 'https://picsum.photos/seed/eden-reece-1/1080/1080', 1::real,
    'soundcheck. the room is empty and it still sounds better than last night', 1840, '["c_irina", "c_elliot"]'::jsonb, '2021-11-10', '2026-10-06T09:03:00+00'::timestamptz),
  ('cap_seed_reece_2', 'c_reece', 'image', 'https://picsum.photos/seed/eden-reece-2/1080/1350', 0.8::real,
    '3am. wrote something. might be good. might be the wine.', 2310, '["c_irina", "c_riley", "c_liam"]'::jsonb, '2021-11-18', '2026-10-06T09:04:00+00'::timestamptz),
  ('cap_seed_reece_3', 'c_reece', 'image', 'https://picsum.photos/seed/eden-reece-3/1920/1005', 1.91::real,
    'saturday. belle view. doors at 9. bring someone you''ll regret.', 3120, '["c_elliot", "c_riley"]'::jsonb, '2021-11-24', '2026-10-06T09:05:00+00'::timestamptz),

  ('cap_seed_elliot_1', 'c_elliot', 'image', 'https://picsum.photos/seed/eden-elliot-1/1080/1080', 1::real,
    'home.', 702, '["c_alexander", "c_reece"]'::jsonb, '2021-11-08', '2026-10-06T09:06:00+00'::timestamptz),
  ('cap_seed_elliot_2', 'c_elliot', 'image', 'https://picsum.photos/seed/eden-elliot-2/1080/1350', 0.8::real,
    'finals week. define "fine".', 518, '["c_riley"]'::jsonb, '2021-11-21', '2026-10-06T09:07:00+00'::timestamptz),

  ('cap_seed_liam_1', 'c_liam', 'image', 'https://picsum.photos/seed/eden-liam-1/1080/1350', 0.8::real,
    'washington district, after rain.', 2740, '["c_nila", "c_irina"]'::jsonb, '2021-11-09', '2026-10-06T09:08:00+00'::timestamptz),
  ('cap_seed_liam_2', 'c_liam', 'image', 'https://picsum.photos/seed/eden-liam-2/1920/1005', 1.91::real,
    'eden from the bridge. 1/30s, no tripod, don''t ask.', 3980, '["c_reece", "c_riley", "c_nila"]'::jsonb, '2021-11-16', '2026-10-06T09:09:00+00'::timestamptz),
  ('cap_seed_liam_3', 'c_liam', 'image', 'https://picsum.photos/seed/eden-liam-3/1080/1080', 1::real,
    'from saturday. she hates all of them. i think the third one is really good.', 4410, '["c_irina", "c_nila", "c_riley"]'::jsonb, '2021-11-23', '2026-10-06T09:10:00+00'::timestamptz),

  ('cap_seed_alexander_1', 'c_alexander', 'image', 'https://picsum.photos/seed/eden-alexander-1/1080/1080', 1::real,
    'Orchid Valley.', 14, '["c_elliot"]'::jsonb, '2021-10-30', '2026-10-06T09:11:00+00'::timestamptz),

  ('cap_seed_nila_1', 'c_nila', 'image', 'https://picsum.photos/seed/eden-nila-1/1080/1350', 0.8::real,
    'work in progress. do not ask me what it is yet.', 1290, '["c_liam", "c_irina"]'::jsonb, '2021-11-14', '2026-10-06T09:12:00+00'::timestamptz),
  ('cap_seed_nila_2', 'c_nila', 'image', 'https://picsum.photos/seed/eden-nila-2/1080/1080', 1::real,
    'eleven days until the opening and not a single finished painting 🙃', 1675, '["c_liam", "c_riley", "c_irina"]'::jsonb, '2021-11-23', '2026-10-06T09:13:00+00'::timestamptz),

  ('cap_seed_riley_1', 'c_riley', 'image', 'https://picsum.photos/seed/eden-riley-1/1080/1080', 1::real,
    'last cinnamon roll. i am defending it with my life', 188, '["c_irina", "c_elliot", "c_nila"]'::jsonb, '2021-11-22', '2026-10-06T09:14:00+00'::timestamptz),
  ('cap_seed_riley_2', 'c_riley', 'image', 'https://picsum.photos/seed/eden-riley-2/1080/1350', 0.8::real,
    'opening shift. the espresso machine and i are not on speaking terms ☕', 142, '["c_reece", "c_liam"]'::jsonb, '2021-11-24', '2026-10-06T09:15:00+00'::timestamptz)
) as v(id, character_id, kind, url, ar, caption, likes, liked_by, inplay_date, created_at)
where exists (select 1 from characters c where c.id = v.character_id)
on conflict (id) do nothing;

-- Kommentare – nur, wenn es Beitrag und Charakter gibt
insert into captic_comments (id, post_id, character_id, content, created_at)
select v.*
from (values
  ('capc_seed_01', 'cap_seed_irina_1', 'c_riley', 'solidarity from the other side of the counter 🫡', '2026-10-06T10:00:00+00'::timestamptz),
  ('capc_seed_02', 'cap_seed_irina_1', 'c_reece', 'i tip in songs', '2026-10-06T10:00:01+00'::timestamptz),
  ('capc_seed_03', 'cap_seed_irina_1', 'c_irina', '@reecemalone the landlord doesn''t take those', '2026-10-06T10:00:02+00'::timestamptz),
  ('capc_seed_04', 'cap_seed_irina_2', 'c_liam', 'the light there at 6 is unreal', '2026-10-06T10:01:00+00'::timestamptz),
  ('capc_seed_05', 'cap_seed_irina_3', 'c_liam', 'that was not a compliment', '2026-10-06T10:02:00+00'::timestamptz),
  ('capc_seed_06', 'cap_seed_irina_3', 'c_irina', 'for me it was 🖤', '2026-10-06T10:02:01+00'::timestamptz),
  ('capc_seed_07', 'cap_seed_irina_3', 'c_nila', 'can i paint this', '2026-10-06T10:02:02+00'::timestamptz),
  ('capc_seed_08', 'cap_seed_irina_3', 'c_reece', '🔥🔥🔥', '2026-10-06T10:02:03+00'::timestamptz),

  ('capc_seed_09', 'cap_seed_reece_1', 'c_elliot', 'it was fine last night. you were the problem', '2026-10-06T10:03:00+00'::timestamptz),
  ('capc_seed_10', 'cap_seed_reece_1', 'c_reece', '@elliot.simmons noted. uninvited.', '2026-10-06T10:03:01+00'::timestamptz),
  ('capc_seed_11', 'cap_seed_reece_2', 'c_irina', 'it''s the wine', '2026-10-06T10:04:00+00'::timestamptz),
  ('capc_seed_12', 'cap_seed_reece_2', 'c_riley', 'play it saturday!!! 😭', '2026-10-06T10:04:01+00'::timestamptz),
  ('capc_seed_13', 'cap_seed_reece_3', 'c_riley', 'i''m bringing everyone', '2026-10-06T10:05:00+00'::timestamptz),
  ('capc_seed_14', 'cap_seed_reece_3', 'c_liam', 'need someone with a camera?', '2026-10-06T10:05:01+00'::timestamptz),
  ('capc_seed_15', 'cap_seed_reece_3', 'c_irina', 'working. save me a song.', '2026-10-06T10:05:02+00'::timestamptz),

  ('capc_seed_16', 'cap_seed_elliot_1', 'c_alexander', 'Call your father.', '2026-10-06T10:06:00+00'::timestamptz),
  ('capc_seed_17', 'cap_seed_elliot_1', 'c_reece', 'one word and a full stop. who hurt you', '2026-10-06T10:06:01+00'::timestamptz),
  ('capc_seed_18', 'cap_seed_elliot_2', 'c_riley', 'your usual is on the house today. you look terrible', '2026-10-06T10:07:00+00'::timestamptz),
  ('capc_seed_19', 'cap_seed_elliot_2', 'c_elliot', '@rileyonespresso the nicest thing anyone said to me all week', '2026-10-06T10:07:01+00'::timestamptz),

  ('capc_seed_20', 'cap_seed_liam_1', 'c_nila', 'my street!! 😍', '2026-10-06T10:08:00+00'::timestamptz),
  ('capc_seed_21', 'cap_seed_liam_2', 'c_reece', 'album cover. i''m serious.', '2026-10-06T10:09:00+00'::timestamptz),
  ('capc_seed_22', 'cap_seed_liam_2', 'c_riley', 'HOW', '2026-10-06T10:09:01+00'::timestamptz),
  ('capc_seed_23', 'cap_seed_liam_3', 'c_irina', 'delete this', '2026-10-06T10:10:00+00'::timestamptz),
  ('capc_seed_24', 'cap_seed_liam_3', 'c_nila', 'do NOT delete this', '2026-10-06T10:10:01+00'::timestamptz),
  ('capc_seed_25', 'cap_seed_liam_3', 'c_liam', '@irikalina no 🙂', '2026-10-06T10:10:02+00'::timestamptz),

  ('capc_seed_26', 'cap_seed_alexander_1', 'c_elliot', 'he posts', '2026-10-06T10:11:00+00'::timestamptz),
  ('capc_seed_27', 'cap_seed_alexander_1', 'c_riley', 'welcome to the internet mr voss 👋', '2026-10-06T10:11:01+00'::timestamptz),

  ('capc_seed_28', 'cap_seed_nila_1', 'c_liam', 'i know what it is', '2026-10-06T10:12:00+00'::timestamptz),
  ('capc_seed_29', 'cap_seed_nila_1', 'c_nila', '@liamcarter.jpg you do not', '2026-10-06T10:12:01+00'::timestamptz),
  ('capc_seed_30', 'cap_seed_nila_2', 'c_irina', 'you say this every time and every time it works out', '2026-10-06T10:13:00+00'::timestamptz),
  ('capc_seed_31', 'cap_seed_nila_2', 'c_riley', 'i''ll bring coffee. all of it.', '2026-10-06T10:13:01+00'::timestamptz),
  ('capc_seed_32', 'cap_seed_nila_2', 'c_liam', 'need photos for the opening?', '2026-10-06T10:13:02+00'::timestamptz),

  ('capc_seed_33', 'cap_seed_riley_1', 'c_irina', 'i would too', '2026-10-06T10:14:00+00'::timestamptz),
  ('capc_seed_34', 'cap_seed_riley_1', 'c_elliot', 'name your price', '2026-10-06T10:14:01+00'::timestamptz),
  ('capc_seed_35', 'cap_seed_riley_1', 'c_riley', '@elliot.simmons you can''t afford it rich boy', '2026-10-06T10:14:02+00'::timestamptz),
  ('capc_seed_36', 'cap_seed_riley_2', 'c_reece', 'who is even awake at this hour', '2026-10-06T10:15:00+00'::timestamptz),
  ('capc_seed_37', 'cap_seed_riley_2', 'c_nila', 'on my way. double shot please 🙏', '2026-10-06T10:15:01+00'::timestamptz)
) as v(id, post_id, character_id, content, created_at)
where exists (select 1 from captic_posts p where p.id = v.post_id)
  and exists (select 1 from characters c where c.id = v.character_id)
on conflict (id) do nothing;

-- Stories (Hochformat) – nur von Charakteren, die es gibt
insert into captic_stories (id, character_id, kind, url, ar, caption, created_at)
select v.*
from (values
  ('caps_seed_riley_1', 'c_riley', 'image', 'https://picsum.photos/seed/eden-story-riley-1/1080/1920', 0.5625::real, 'first customer of the day asked for "just a coffee". sir this is a menu', '2026-10-06T11:00:00+00'::timestamptz),
  ('caps_seed_riley_2', 'c_riley', 'image', 'https://picsum.photos/seed/eden-story-riley-2/1080/1920', 0.5625::real, 'break. 4 minutes. do not talk to me', '2026-10-06T11:01:00+00'::timestamptz),
  ('caps_seed_reece_1', 'c_reece', 'image', 'https://picsum.photos/seed/eden-story-reece-1/1080/1920', 0.5625::real, 'saturday. be there.', '2026-10-06T11:02:00+00'::timestamptz),
  ('caps_seed_liam_1', 'c_liam', 'image', 'https://picsum.photos/seed/eden-story-liam-1/1080/1920', 0.5625::real, '', '2026-10-06T11:03:00+00'::timestamptz),
  ('caps_seed_liam_2', 'c_liam', 'image', 'https://picsum.photos/seed/eden-story-liam-2/1080/1920', 0.5625::real, 'golden hour, washington', '2026-10-06T11:04:00+00'::timestamptz),
  ('caps_seed_nila_1', 'c_nila', 'image', 'https://picsum.photos/seed/eden-story-nila-1/1080/1920', 0.5625::real, 'studio day 🎨', '2026-10-06T11:05:00+00'::timestamptz),
  ('caps_seed_irina_1', 'c_irina', 'image', 'https://picsum.photos/seed/eden-story-irina-1/1080/1920', 0.5625::real, 'closing shift 🖤', '2026-10-06T11:06:00+00'::timestamptz),
  ('caps_seed_elliot_1', 'c_elliot', 'image', 'https://picsum.photos/seed/eden-story-elliot-1/1080/1920', 0.5625::real, 'library. day three.', '2026-10-06T11:07:00+00'::timestamptz)
) as v(id, character_id, kind, url, ar, caption, created_at)
where exists (select 1 from characters c where c.id = v.character_id)
on conflict (id) do nothing;

-- Aktivitäten zu den Testdaten (Glocke in der App, Hinweis im Dashboard):
-- je ein Eintrag pro Kommentar, Herz und Follower – nie für eigene Beiträge.
insert into captic_events (id, kind, actor_id, target_id, post_id, comment_id, created_at)
select 'cape_c_' || k.id, 'comment', k.character_id, p.character_id, p.id, k.id, k.created_at
from captic_comments k
join captic_posts p on p.id = k.post_id
where k.id like 'capc_seed_%' and k.character_id <> p.character_id
on conflict (id) do nothing;

insert into captic_events (id, kind, actor_id, target_id, post_id, created_at)
select 'cape_like_' || p.id || '_' || l.actor, 'like', l.actor, p.character_id, p.id, p.created_at + interval '30 minutes'
from captic_posts p
cross join lateral jsonb_array_elements_text(p.liked_by) as l(actor)
where p.id like 'cap_seed_%' and l.actor <> p.character_id
  and exists (select 1 from characters c where c.id = l.actor)
on conflict (id) do nothing;

insert into captic_events (id, kind, actor_id, target_id, created_at)
select 'cape_follow_' || f.target || '_' || c.id, 'follow', c.id, f.target, '2026-10-06T08:00:00+00'::timestamptz
from characters c
cross join lateral jsonb_array_elements_text(coalesce(c.phone -> 'captic' -> 'follows', '[]'::jsonb)) as f(target)
where c.id in ('c_irina', 'c_reece', 'c_elliot', 'c_liam', 'c_alexander', 'c_nila', 'c_riley')
  and f.target <> c.id
  and exists (select 1 from characters t where t.id = f.target)
on conflict (id) do nothing;
