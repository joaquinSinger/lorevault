# LoreVault — Plan de Ejecución (Etapa 1: MVP Local)

**Fuente de verdad:** `spec.md`
**Ejecución:** tareas pensadas para correr una por una con Claude Code,
en orden. No saltar tareas: cada una asume que la anterior está cerrada.

---

## 0. Setup del repo

- [x] Crear repo `lorevault` en GitHub (repo propio, fuera del monorepo pausado)
- [x] Inicializar proyecto Vite + React + TypeScript
- [x] Instalar y configurar Tailwind CSS
- [x] Instalar `idb` (wrapper de IndexedDB) y `uuid`
- [x] Configurar ESLint + Prettier (básico, sin reglas exóticas)
- [x] Workflow de GitHub Actions: lint + build en cada push
- [x] Generar `CLAUDE.md` en la raíz con: stack, estructura de carpetas,
      convenciones de `spec.md` (UUID, borrado en cascada, capa de
      persistencia aislada)

---

## 1. Capa de persistencia (`lib/storage/`)

- [ ] Definir tipos de dominio en `src/types/`: `Note`, `Connection`, `Category`
- [ ] Implementar wrapper de IndexedDB: apertura de DB, creación de
      stores `notes` y `connections` con sus índices (según spec.md §2)
- [ ] Funciones CRUD de `notes`: create, getById, getByCategory, update, delete
- [ ] Función de `delete` de nota dispara borrado en cascada de
      `connections` asociadas (transacción única)
- [ ] Funciones de `connections`: create, getByNoteId (bidireccional), delete
- [ ] Función de búsqueda por título (filtro in-memory sobre índice `title`)
- [ ] Funciones de export (`exportVault`) e import (`importVault`,
      reemplazo total con confirmación)
- [ ] **Tests con Vitest** para toda esta capa: CRUD, cascada de borrado,
      round-trip export→import sin pérdida de datos

---

## 2. Dirección visual (skill de frontend-design)

- [ ] Definir brief de diseño: subject (worldbuilding de fantasía),
      audiencia (vos como escritor), trabajo de la página
- [ ] Generar sistema de tokens: paleta (4-6 hex), tipografía (display +
      body + utility), concepto de layout, elemento firma
- [ ] Revisar el sistema contra el brief antes de construir (evitar
      defaults genéricos de IA)
- [ ] Configurar tokens en Tailwind (colores, fuentes, escala tipográfica)

---

## 3. Layout base y navegación

- [ ] Shell de la app: navegación entre las 4 categorías + buscador global
- [ ] Ruteo con React Router: listado por categoría, vista de nota individual
- [ ] Estado global (decidir Context API vs Zustand al llegar a esta tarea,
      según cuánto estado se termine compartiendo)

---

## 4. CRUD de notas (UI)

- [ ] Listado de notas por categoría
- [ ] Formulario de creación (categoría fija según sección, título requerido)
- [ ] Vista/edición de nota individual
- [ ] Confirmación de borrado (mencionando que se pierden las conexiones)

---

## 5. Editor Markdown

- [ ] Textarea de edición + panel de preview renderizado
- [ ] Decidir y confirmar: autoguardado con debounce vs guardado explícito
- [ ] Indicador de estado de guardado

---

## 6. Conexiones entre notas

- [ ] Selector de búsqueda para elegir nota a conectar
- [ ] Lista de notas conectadas, visible desde ambos lados
- [ ] Acción de quitar conexión (sin borrar las notas)

---

## 7. Buscador

- [ ] Input de búsqueda global por título, resultados en tiempo real

---

## 8. Backup

- [ ] Botón de exportar vault completo a `.json`
- [ ] Botón de importar `.json` con confirmación de reemplazo total
- [ ] Validación básica de estructura del archivo importado

---

## 9. Cierre de Etapa 1

- [ ] Revisar checklist de "Definición de hecho" de `spec.md` §7
- [ ] Deploy a Vercel (o similar, gratuito)
- [ ] Escribir README del proyecto siguiendo la convención del portfolio
- [ ] Actualizar tabla de proyectos en el README del repo principal
