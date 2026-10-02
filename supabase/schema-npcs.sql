-- NPCs (Nebenfiguren ohne eigenes Profil) + „Characters & NPCs" am Ortsprofil
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).

create table if not exists npcs (
  id         text primary key,
  name       text not null,
  role       text,
  age        int,
  created_by text references players(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Am Ort hinterlegte Charaktere/NPCs: [{ kind: "character"|"npc", id, note }]
alter table locations add column if not exists people jsonb not null default '[]'::jsonb;

-- NPCs: lesen + anlegen alle Freigeschalteten; ändern/löschen Admins und Ersteller*in
alter table npcs enable row level security;

drop policy if exists "npcs read" on npcs;
drop policy if exists "npcs insert" on npcs;
drop policy if exists "npcs update" on npcs;
drop policy if exists "npcs delete" on npcs;

create policy "npcs read" on npcs for select to authenticated
  using (public.is_approved());

create policy "npcs insert" on npcs for insert to authenticated
  with check (public.is_approved());

create policy "npcs update" on npcs for update to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );

create policy "npcs delete" on npcs for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select id from players where auth_user_id = auth.uid())
  );

-- === Test-NPCs (je einem Ort zugeordnet) ====================================
insert into npcs (id, name, role, age, created_by) values
  ('npc_ron',       'Ron Kowalski',   'Diner-Besitzer', 58, 'p_tabs'),
  ('npc_dex',       'Dex',            'Türsteher',      34, 'p_tabs'),
  ('npc_abernathy', 'Mrs. Abernathy', 'Concierge',      61, 'p_tabs')
on conflict (id) do nothing;

update locations set people =
  '[{"kind":"npc","id":"npc_ron","note":"Steht seit dreißig Jahren selbst am Grill. Merkt sich jede Bestellung — und jedes Gesicht, das nachts um drei hier sitzt."}]'::jsonb
  where id = 'loc_rivers_edge_ron_s_diner' and people = '[]'::jsonb;

update locations set people =
  '[{"kind":"npc","id":"npc_dex","note":"Steht jeden Abend an der Tür. Redet wenig, sieht alles und entscheidet, wer reinkommt."}]'::jsonb
  where id = 'loc_rivers_edge_the_ember' and people = '[]'::jsonb;

update locations set people =
  '[{"kind":"npc","id":"npc_abernathy","note":"Seit Jahrzehnten an der Rezeption. Weiß, wer mit wem eincheckt, und verliert darüber kein Wort — meistens."}]'::jsonb
  where id = 'loc_belle_view_belle_view_hotel' and people = '[]'::jsonb;
