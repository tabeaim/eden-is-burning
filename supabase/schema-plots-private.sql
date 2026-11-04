-- Plots: privat (nur für die Person, die ihn angelegt hat) oder mit den
-- betroffenen Spieler*innen geteilt (Standard, wie bisher)
-- Im Supabase SQL-Editor ausführen (Run). Wiederholbar (idempotent).
alter table plots add column if not exists private boolean not null default false;

-- Lesen: alle Freigeschalteten – private Plots nur die Person, die sie angelegt hat
drop policy if exists "plots read" on plots;
create policy "plots read" on plots for select to authenticated
  using (
    public.is_approved()
    and (
      not private
      or created_by = (select id from players where auth_user_id = auth.uid())
    )
  );
