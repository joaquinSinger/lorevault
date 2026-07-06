-- ============================================
-- LoreVault Etapa 2 — Schema Supabase
-- Fuente: spec.md §3 (modelo de datos) y §4 (RLS)
-- Aplicar en el SQL editor del dashboard de Supabase.
-- ============================================

-- --------------------------------------------
-- §3 Modelo de datos
-- --------------------------------------------

create table vaults (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table notes (
  id          uuid primary key default gen_random_uuid(),
  vault_id    uuid not null references vaults(id) on delete cascade,
  type        text not null check (type in ('character', 'location', 'lore', 'chapter')),
  title       text not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table connections (
  id                uuid primary key default gen_random_uuid(),
  vault_id          uuid not null references vaults(id) on delete cascade,
  source_note_id    uuid not null references notes(id) on delete cascade,
  target_note_id    uuid not null references notes(id) on delete cascade,
  created_at        timestamptz not null default now(),

  constraint no_self_connection check (source_note_id <> target_note_id)
);

create table tags (
  id          uuid primary key default gen_random_uuid(),
  vault_id    uuid not null references vaults(id) on delete cascade,
  name        text not null,
  color       text,  -- opcional, sin uso en Etapa 2; reservado para grafo en Etapa 3
  created_at  timestamptz not null default now(),

  constraint unique_tag_per_vault unique (vault_id, name)
);

create table note_tags (
  note_id     uuid not null references notes(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- --------------------------------------------
-- §4 Row Level Security
-- --------------------------------------------

alter table vaults enable row level security;
alter table notes enable row level security;
alter table connections enable row level security;
alter table tags enable row level security;
alter table note_tags enable row level security;

-- Función centralizada: toda policy de notes/connections/tags pasa por acá.
-- El día que se agregue colaboración, el cambio es solo dentro de esta función.
-- `security definer` para leer vaults sin recursión de RLS; `search_path`
-- fijado para que no sea hijackeable (lo exige el linter de Supabase).
create or replace function user_has_vault_access(p_vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from vaults
    where id = p_vault_id and owner_id = auth.uid()
  );
$$;

create policy "vaults_owner_access" on vaults
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "notes_vault_access" on notes
  for all
  using (user_has_vault_access(vault_id))
  with check (user_has_vault_access(vault_id));

create policy "connections_vault_access" on connections
  for all
  using (user_has_vault_access(vault_id))
  with check (user_has_vault_access(vault_id));

create policy "tags_vault_access" on tags
  for all
  using (user_has_vault_access(vault_id))
  with check (user_has_vault_access(vault_id));

-- note_tags no tiene vault_id propio: valida a través de la nota asociada
create policy "note_tags_vault_access" on note_tags
  for all
  using (
    exists (
      select 1 from notes n
      where n.id = note_tags.note_id
        and user_has_vault_access(n.vault_id)
    )
  )
  with check (
    exists (
      select 1 from notes n
      where n.id = note_tags.note_id
        and user_has_vault_access(n.vault_id)
    )
  );
