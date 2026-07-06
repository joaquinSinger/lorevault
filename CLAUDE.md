# CLAUDE.md — LoreVault

Content Vault para escritores de fantasía: notas en 4 categorías fijas
(`personaje`, `locacion`, `lore`, `capitulo`), conexiones entre notas, tags
personalizados, organizadas en múltiples vaults por usuario. Etapa 2 = backend
real con Supabase (Postgres + Auth + RLS), online-only, sin sync en tiempo
real ni soporte offline.

**Fuente de verdad:** `spec.md` (especificación técnica) y `plan.md` (orden de
ejecución de tareas). Ante cualquier duda de alcance o comportamiento, esos dos
archivos mandan. Las tareas del plan se ejecutan una por una, en orden.

## Stack

- **Frontend:** React + TypeScript + Vite (sin cambios respecto a Etapa 1)
- **Estilos:** Tailwind CSS (sin cambios)
- **Backend:** Supabase (Postgres + Auth + Row Level Security). No hay
  servidor propio: el cliente habla directo con Supabase vía `supabase-js`.
  **RLS es el único perímetro de seguridad** — no hay guard ni middleware que
  valide permisos, así que ningún filtro del lado del cliente debe asumirse
  como protección real.
- **Persistencia:** reemplaza IndexedDB/`idb` de Etapa 1. La capa propia en
  `src/lib/storage/` ahora envuelve `supabase-js` en vez de `idb`, manteniendo
  las mismas firmas de función donde fue posible para no romper la UI.
- **IDs:** `uuid` v4, generados por Postgres (`default gen_random_uuid()` en
  cada tabla). El cliente ya no genera IDs al crear una entidad — usa
  `insert().select()` para recibir el registro con su id recién creado.
- **Auth:** Supabase Auth (email/password). Sesión manejada por un hook o
  contexto (`useAuth`); rutas protegidas redirigen a `/login` si no hay
  sesión activa.
- **Markdown:** `react-markdown` (componente `Markdown`, estilos propios del
  vault). Editor con guardado híbrido: autoguardado con debounce ~1s +
  Ctrl/Cmd+S; toggle Escribir/Vista previa. El guardado ahora es una llamada
  de red, no una escritura local instantánea — mostrar siempre estado de
  guardando/guardado/error.
- **Ruteo:** React Router. Rutas nuevas: `/login`, `/signup`, `/vaults`
  (selección/creación de vault), y luego `/vaults/:vaultId/...` para todo lo
  que antes vivía en la raíz.
- **Estado global:** Context API. `AuthContext` (sesión) + `VaultContext`
  ahora expone también el vault activo (`activeVaultId`), además de la señal
  de invalidación (`revision`/`invalidate`) que ya existía en Etapa 1. Seguir
  sin sumar Zustand ni otra librería de estado.
- **Tests:** Vitest, capa de persistencia. Mockear el cliente de Supabase en
  los tests — nunca pegarle a un proyecto real de Supabase desde CI.
- **CI:** GitHub Actions, mismo workflow único (lint + build en cada push).
  Si más adelante hacen falta tests de integración contra Supabase, se evalúan
  los secrets de CI recién en ese momento — no anticipar.

## Dirección visual — "Tinta y musgo"

Tokens definidos en `src/index.css` (`@theme`, Tailwind v4 — no hay
`tailwind.config.js`). Tema oscuro único por decisión de diseño.

- **Materiales:** `noche` (fondo, negro azulado), `pizarra` (superficies),
  `trazo` (bordes), `pergamino` (texto), `sepia` (texto secundario).
- **Musgo es el acento primario** y se reserva para lo accionable (enlaces,
  foco, acciones primarias). Nunca decora ni marca categoría.
- **Dorado es el acento secundario**, de uso puntual: el marcador de
  capítulos (`tinta-capitulo` comparte su valor) y detalles de jerarquía.
- **Tintas de categoría** (`tinta-personaje`, `tinta-locacion`, `tinta-lore`,
  `tinta-capitulo`): codifican categoría en nav, encabezados y conexiones.
  Nunca marcan acción.
- **Tags:** sin color propio en Etapa 2 (la columna `color` existe en la
  tabla pero no se consume todavía, reservada para el grafo de Etapa 3). Se
  renderizan neutros con `pizarra`/`trazo`/`sepia`, como cualquier otro
  elemento de chrome. No usar las tintas de categoría para tags.
- **Pantallas nuevas** (login, signup, selección de vault): usan los mismos
  tokens y tipografía que el resto del vault. No son un "área de cuenta"
  con estética distinta al resto de la app.
- **Tipografía:** `font-serif` (Alegreya) para títulos y contenido del vault
  (incluido el editor); `font-sans` (Alegreya Sans) para el chrome de la UI;
  etiquetas con `text-label` + mayúsculas. Fuentes self-hosted vía
  `@fontsource`, importadas en `index.css`.
- **Layout ("códice abierto"):** rail de navegación izquierdo (categorías +
  buscador), columna de lectura ≤65ch (`text-reading`), marginalia derecha
  con las conexiones de la nota. Elemento firma: cintas marcapáginas con
  corte en V y su tinta, repetidas en nav / encabezado de nota / conexiones.
- Evitar: texturas de pergamino falso, ornamento medieval, neones.

## Estructura de carpetas

```
src/
  types/        # Tipos de dominio: Note, Connection, Category, Tag, Vault
  lib/
    storage/    # Envuelve supabase-js (antes idb). Único punto de acceso a datos
    auth/       # Cliente Supabase + hook de sesión (useAuth)
  state/        # AuthContext, VaultContext (activeVaultId + revision/invalidate)
  components/   # Componentes de UI
  pages/        # Vistas ruteadas: login, signup, selección de vault, listado
                # por categoría, nota individual
```

## Convenciones (no negociables, vienen de spec.md)

### RLS como único perímetro de seguridad

Toda policy de `notes`, `connections` y `tags` pasa por la función
`user_has_vault_access(vault_id)` definida en spec.md §4. Ningún filtro del
lado del cliente (por ejemplo, filtrar por `vault_id` en una query) debe
asumirse como medida de seguridad — es solo UX. La seguridad real vive en
Postgres.

### IDs generados por Postgres

Todas las tablas usan `default gen_random_uuid()`. El cliente nunca genera
un id antes de insertar: usa `insert().select()` (o `.select().single()`)
para obtener el registro creado, incluido su id.

### Capa de persistencia aislada

Todos los componentes hablan **solo** con `src/lib/storage/`, nunca
directamente con `supabase-js`. Esta capa es lo que permitiría, a futuro,
reemplazar Supabase por otra cosa sin tocar la UI.

### Borrado en cascada

Al eliminar una nota, se eliminan sus `connections` (como `source_note_id` o
`target_note_id`) y sus `note_tags`, mediante `on delete cascade` a nivel de
Postgres — ya no es una transacción manual del cliente como en Etapa 1. La
UI de borrado sigue confirmando siempre, avisando que se pierden las
conexiones.

### Modelo de datos

Definido completo en spec.md §3. Resumen: `vaults` (uno o varios por
usuario) → `notes` (categoría fija, `vault_id`) → `connections` (no
dirigidas, `vault_id` propio) y `tags` + `note_tags` (relación muchos a
muchos, tags scopeados por vault).

### TypeScript y código

- `strict: true`, sin excepciones.
- Tipos de dominio solo en `src/types/`; el resto los importa de ahí.
- Fechas siempre como string ISO 8601 (vienen de `timestamptz` de Postgres,
  mismo formato que en Etapa 1).

## Fuera de alcance en Etapa 2 (no implementar aunque parezca natural)

Sync en tiempo real (Supabase Realtime), soporte offline, colaboración o
compartir un vault entre usuarios (la RLS está preparada pero no se
construye la UI ni tabla de miembros), migración de datos existentes (no
aplica, no hay datos reales de Etapa 1 en producción), color-coding de tags
en la UI.

## Comandos

```
npm run dev      # servidor de desarrollo (requiere .env.local con SUPABASE_URL y SUPABASE_ANON_KEY)
npm run build    # build de producción
npm run lint     # ESLint
npm run test     # Vitest (cliente de Supabase mockeado)
```
