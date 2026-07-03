# CLAUDE.md — LoreVault

Content Vault local para escritores de fantasía: notas en 4 categorías fijas
(`personaje`, `locacion`, `lore`, `capitulo`), conexiones entre notas, buscador
por título y backup manual en JSON. Etapa 1 = MVP 100% local, sin backend.

**Fuente de verdad:** `spec.md` (especificación técnica) y `plan.md` (orden de
ejecución de tareas). Ante cualquier duda de alcance o comportamiento, esos dos
archivos mandan. Las tareas del plan se ejecutan una por una, en orden.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Estilos:** Tailwind CSS
- **Persistencia:** IndexedDB vía `idb`, envuelta en capa propia (`src/lib/storage/`)
- **IDs:** `uuid` v4
- **Ruteo:** React Router
- **Estado global:** a decidir en la tarea 3 (Context API vs Zustand) — no asumir uno
- **Tests:** Vitest (obligatorios para la capa de persistencia)
- **CI:** GitHub Actions, un solo workflow: lint + build en cada push. No agregar más pasos.

## Estructura de carpetas

```
src/
  types/        # Tipos de dominio: Note, Connection, Category (centralizados acá)
  lib/
    storage/    # Capa de persistencia (único punto de acceso a IndexedDB)
  components/   # Componentes de UI
  pages/        # Vistas ruteadas (listado por categoría, nota individual)
```

## Convenciones (no negociables, vienen de spec.md)

### UUID v4 para todos los IDs

Nunca usar autoincrement de IndexedDB. Los UUIDs permiten migrar a Supabase
en Etapa 2 sin remapear foreign keys. Generar con `uuid` al crear la entidad.

### Capa de persistencia aislada

Todos los componentes hablan **solo** con `src/lib/storage/`, nunca
directamente con IndexedDB ni con `idb`. Esta capa es lo que hace viable
reemplazar la implementación por Supabase en Etapa 2 sin tocar UI.

### Borrado en cascada

Al eliminar una nota, se eliminan todas las `connections` donde esa nota sea
`sourceNoteId` o `targetNoteId`, en **una única transacción de IndexedDB**
(sin conexiones huérfanas). La UI de borrado siempre confirma, avisando que
se pierden las conexiones.

### Modelo de datos

- Store `notes`: `id`, `category`, `title` (requerido), `content` (markdown
  plano), `order` (solo `capitulo`), `createdAt`, `updatedAt` (ISO 8601).
  Índices: `category`, `title`, `updatedAt`.
- Store `connections`: `id`, `sourceNoteId`, `targetNoteId`, `createdAt`.
  Índices: `sourceNoteId` y `targetNoteId` (queries bidireccionales).
- Conexiones: store separado (no array embebido en `notes`), **no dirigidas
  y sin etiqueta** en Etapa 1. `category` es fija tras crear la nota.

### TypeScript y código

- `strict: true`, sin excepciones.
- Tipos de dominio solo en `src/types/`; el resto los importa de ahí.
- Fechas siempre como string ISO 8601.

## Fuera de alcance en Etapa 1 (no implementar aunque parezca natural)

Autenticación, sync en la nube, multi-vault, vista de grafo, asistente de IA,
fusión en el import (solo reemplazo total con confirmación), categorías
personalizadas.

## Comandos

```
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # ESLint
npm run test     # Vitest
```
