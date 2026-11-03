-- Hochkant-Banner im Charakterprofil (profile.side_banner_url, links im Reiter
-- General): einmalig bei allen Charakteren das bisherige Header-Bild (banner_url)
-- übernehmen. Der gewählte Ausschnitt des Headers (#y=…) fällt dabei weg – der
-- Hochkant-Banner zeigt das Bild mittig.
-- Wer schon einen Hochkant-Banner hat, behält ihn. Statist*innen haben keine
-- Profil-Reiter und bleiben außen vor.
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

update characters
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{side_banner_url}',
  to_jsonb(regexp_replace(banner_url, '#y=\d+$', ''))
)
where banner_url is not null
  and banner_url <> ''
  and coalesce(npc_tier, '') <> 'extra'
  and coalesce(profile ->> 'side_banner_url', '') = '';
