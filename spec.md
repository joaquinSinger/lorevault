# LoreVault — Spec Etapa 2: Supabase + Sync

## 1. Objetivo de la etapa

Reemplazar IndexedDB por Supabase como backend de datos (Postgres + Auth + RLS),
pasando de una app local single-usuario a una app online-only con autenticación
real y múltiples vaults por usuario. Sin sync en tiempo real, sin soporte
offline, sin colaboración — pero con el modelo de datos preparado para
habilitarlos en etapas futuras sin rediseñar.

## 2. Decisiones de arquitectura

| Decisión | Elección | Motivo |
|---|---|---|
| Sincronización | Reemplazo total (online-only) | Menor complejidad; no hay usuarios reales todavía que dependan de offline |
| Vaults por usuario | Múltiples | Un vault por mundo/proyecto de ficción |
| Colaboración | No implementada, RLS preparada | Se anticipa sin sobreconstruir |
| Migración de datos | No aplica | No hay datos reales en producción |
| Tags | Normalizadas (tabla propia) | Permite rename global y color-coding futuro en el grafo (Etapa 3) |
| Capa de backend | Ninguna (frontend-only) | Igual que Etapa 1; Supabase actúa como BaaS, RLS es el único perímetro de seguridad |

Nota sobre el punto anterior: a diferencia de Proposal Generator (que valida
JWT vía JWKS en un guard de NestJS), LoreVault no tiene backend propio. El
cliente habla directo con Supabase usando `supabase-js`, y la seguridad vive
enteramente en las políticas RLS de Postgres. No hay capa intermedia que
revise permisos — si una policy está mal escrita, el dato queda expuesto.

## 3. Modelo de datos

```sql
-- ============================================
-- LoreVault Etapa 2 — Schema Supabase
-- ============================================

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
```

Notas de diseño:
- `type` usa `check` en vez de un `enum` de Postgres para simplificar
  migraciones futuras si se agrega un quinto tipo (alterar un check es más
  simple que alterar un enum type).
- `connections` mantiene `vault_id` propio (no solo se infiere de las notas)
  para que las policies de RLS no necesiten un `join` — trade-off de
  denormalización a favor de policies más simples y rápidas.
- `tags` está scopeado por vault (`unique_tag_per_vault`), no es global —
  dos vaults distintos pueden tener un tag "antagonista" sin colisionar.

## 4. Seguridad — Row Level Security

```sql
alter table vaults enable row level security;
alter table notes enable row level security;
alter table connections enable row level security;
alter table tags enable row level security;
alter table note_tags enable row level security;

-- Función centralizada: toda policy de notes/connections/tags pasa por acá.
-- El día que se agregue colaboración, el cambio es solo dentro de esta función.
create or replace function user_has_vault_access(p_vault_id uuid)
returns boolean
language sql
security definer
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
```

## 5. Capa de acceso a datos (frontend)

- `notes.ts` y `connections.ts` dejan de hablarle a `idb` y pasan a usar
  `supabase-js`. Se mantienen las mismas firmas de función donde sea posible,
  para no romper la capa de UI que ya las consume.
- Nuevo módulo `tags.ts`: CRUD de tags + asociación/desasociación con notas.
- Nuevo módulo `vaults.ts`: listar, crear, renombrar, eliminar vaults del
  usuario autenticado.
- Todas las operaciones pasan de síncronas (IndexedDB local) a asíncronas
  con latencia de red real: hay que agregar estados de `loading` / `error`
  donde antes no existían.

## 6. Cambios de UX derivados del modelo

- **Pantalla de selección de vault** (nueva, obligatoria): al loguearse, el
  usuario elige un vault existente o crea uno nuevo antes de ver notas. Es
  consecuencia directa de soportar múltiples vaults, no una feature opcional.
- **Selector de tags** en el editor de notas: autocompletar sobre tags
  existentes del vault + opción de crear uno nuevo al vuelo.
- **Estados de guardado**: el autoguardado (debounce + botón "Listo") necesita
  reflejar "guardando..." / "error al guardar", algo que no existía cuando
  todo era local e instantáneo.

## 7. Explícitamente fuera de alcance en Etapa 2

- Sync en tiempo real (Supabase Realtime) — se evalúa en Etapa 3
- Soporte offline
- Colaboración/compartir un vault entre usuarios (la RLS lo deja preparado,
  no se construye la UI ni la tabla de miembros)
- Migración de datos existentes (no aplica, no hay datos reales)
- Color-coding de tags en UI (columna `color` reservada, sin consumo aún)

## 8. Próximos pasos

Generar `plan.md` con el desglose de tareas (incluyendo la pantalla de
selección de vault como tarea explícita), y arrancar la ejecución en
Claude Code siguiendo el mismo flujo de sesión-por-tarea validado en Etapa 1:
revisar y commitear antes de avanzar a la siguiente.
