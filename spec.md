# LoreVault — Especificación Técnica (Etapa 1: MVP Local)

**Estado:** Aprobada para desarrollo
**Última actualización:** 2026-07-01

---

## 1. Visión y alcance

LoreVault es un Content Vault para escritores de fantasía y ficción: permite
estructurar personajes, locaciones, elementos de lore y capítulos, y
conectarlos entre sí para mantener consistencia narrativa.

**Etapa 1** entrega un MVP 100% local (sin backend, sin costo de
infraestructura), usable en un único navegador, con:

- CRUD de notas en 4 categorías fijas
- Editor de texto plano con renderizado Markdown
- Conexiones simples entre notas
- Buscador por título
- Export/import de todos los datos en JSON (backup manual)

**No incluye** (ver sección 6): autenticación, sync en la nube, multi-vault,
vista de grafo, asistente de IA. Esas capacidades llegan en Etapas 2 y 3.

---

## 2. Modelo de datos (IndexedDB)

Se usa `uuid v4` para todos los IDs. Motivo: si en Etapa 1 usáramos
autoincrement de IndexedDB, migrar a Supabase en Etapa 2 obligaría a
remapear todas las foreign keys. Con UUID, el ID de una nota es el mismo
en el navegador y en Postgres el día que migre.

### Store: `notes`

| Campo     | Tipo                                              | Notas                          |
| --------- | ------------------------------------------------- | ------------------------------ |
| id        | string (uuid v4)                                  | PK                             |
| category  | 'personaje' \| 'locacion' \| 'lore' \| 'capitulo' | fija en Etapa 1, no editable   |
| title     | string                                            | requerido, indexado            |
| content   | string                                            | markdown plano                 |
| order     | number \| null                                    | solo relevante para 'capitulo' |
| createdAt | string (ISO 8601)                                 |                                |
| updatedAt | string (ISO 8601)                                 |                                |

Índices: `category`, `title` (búsqueda), `updatedAt`.

### Store: `connections`

| Campo        | Tipo              | Notas         |
| ------------ | ----------------- | ------------- |
| id           | string (uuid v4)  | PK            |
| sourceNoteId | string            | FK → notes.id |
| targetNoteId | string            | FK → notes.id |
| createdAt    | string (ISO 8601) |               |

Índices: `sourceNoteId`, `targetNoteId` (para queries bidireccionales,
necesarias cuando se construya la vista de grafo en Etapa 3).

Diseño intencional: se guarda como store separado, no como array embebido
dentro de `notes`. Así, en Etapa 3, la vista de grafo puede consultar todas
las aristas sin recorrer cada nota. Conexión es **no dirigida y sin
etiqueta** en Etapa 1 (decisión tomada); si más adelante se necesita
tipar la relación ("aparece en", "gobierna"), se agrega el campo `label`
sin romper el modelo existente.

### Borrado en cascada

Al eliminar una nota, se eliminan también todas las `connections` donde
esa nota sea `sourceNoteId` o `targetNoteId`. Esto ocurre en una única
transacción IndexedDB para evitar conexiones huérfanas.

### Export / Import (backup)

- **Export**: genera un `.json` con `{ version, exportedAt, notes[],
connections[] }` y dispara la descarga del archivo.
- **Import**: valida estructura básica (version soportada, arrays
  presentes) y ofrece reemplazar o fusionar con los datos actuales.
  Para Etapa 1, alcanza con **reemplazar** (fusionar queda para Etapa 2,
  donde hay backend para resolver conflictos).

---

## 3. Arquitectura frontend

- **Stack**: React + TypeScript + Vite + Tailwind CSS
- **Persistencia**: capa de abstracción propia (`lib/storage/`) que
  envuelve `idb` (wrapper de IndexedDB). Todos los componentes hablan
  contra esta capa, nunca directamente contra IndexedDB. Esto es lo que
  hace viable reemplazar la implementación por llamadas a Supabase en
  Etapa 2 sin tocar UI.
- **Estado**: Context API o Zustand (a definir en plan.md) — sin
  necesidad de librería pesada dado que no hay estado de servidor real.
- **Ruteo**: React Router, rutas por categoría y por nota individual.

---

## 4. Funcionalidades y criterios de aceptación

### 4.1 CRUD de notas

- Crear nota eligiendo categoría, con título obligatorio
- Editar título y contenido
- Eliminar nota (con confirmación, dado el borrado en cascada de conexiones)
- Listar notas agrupadas por categoría

### 4.2 Editor Markdown

- Textarea de texto plano para edición
- Toggle o panel dividido con preview renderizado (soporta encabezados,
  listas, negrita/itálica, enlaces)
- Autoguardado (debounce ~1s) o guardado explícito — a definir en plan.md

### 4.3 Conexiones entre notas

- Selector de búsqueda para elegir otra nota existente y conectarla
- Ver, desde una nota, la lista de notas conectadas (bidireccional: si A
  se conecta con B, aparece en ambas)
- Quitar una conexión sin eliminar las notas

### 4.4 Buscador

- Input de búsqueda por título, resultados en tiempo real (sin backend,
  filtro in-memory sobre el índice `title`)

### 4.5 Backup

- Botón de exportar todo el vault a `.json`
- Botón de importar `.json`, con reemplazo total tras confirmación

---

## 5. Convenciones de código

- TypeScript estricto (`strict: true`)
- Tipos de dominio (`Note`, `Connection`, `Category`) centralizados en
  `src/types/`
- Sin sobrecomplejizar CI: un workflow simple de GitHub Actions que
  corra lint + build en cada push, nada más por ahora
- README del repo siguiendo la plantilla estándar del portfolio (qué
  problema resuelve, cómo funciona, stack, cómo correrlo local, link
  deployado)

---

## 6. Fuera de alcance (explícito)

- Autenticación / multi-usuario
- Sincronización en la nube
- Múltiples vaults por usuario
- Vista de grafo visual
- Asistente de IA para continuidad narrativa
- Fusión inteligente de datos en el import (solo reemplazo total)
- Categorías personalizadas (las 4 categorías son fijas en Etapa 1)

---

## 7. Definición de "hecho" para Etapa 1

El MVP se considera completo cuando:

1. Se pueden crear, editar, eliminar y listar notas de las 4 categorías
2. El contenido markdown se edita y previsualiza correctamente
3. Se pueden crear y eliminar conexiones entre dos notas cualesquiera,
   visibles desde ambos lados
4. El buscador filtra por título en tiempo real
5. Exportar e importar el vault completo funciona sin pérdida de datos
6. Los datos persisten entre sesiones del navegador (recargar la página
   no borra nada)
7. El repo tiene README siguiendo la convención del portfolio
