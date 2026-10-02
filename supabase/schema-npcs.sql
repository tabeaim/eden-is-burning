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
