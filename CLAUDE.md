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
- **Markdown:** `react-markdown` (componente `Markdown`, estilos propios del
  vault). Editor con guardado híbrido (decidido en la tarea 5): autoguardado
  con debounce ~1s + Ctrl/Cmd+S; toggle Escribir/Vista previa.
- **Ruteo:** React Router
- **Estado global:** Context API (decidido en la tarea 3). El estado compartido
  es mínimo: `VaultContext` (`src/state/`) expone solo una señal de invalidación
  (`revision`/`invalidate`) para releer de storage tras mutaciones. No sumar
  Zustand ni otra librería de estado.
- **Tests:** Vitest (obligatorios para la capa de persistencia)
- **CI:** GitHub Actions, un solo workflow: lint + build en cada push. No agregar más pasos.

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
  types/        # Tipos de dominio: Note, Connection, Category (centralizados acá)
  lib/
    storage/    # Capa de persistencia (único punto de acceso a IndexedDB)
  state/        # Estado global (VaultContext + VaultProvider)
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
