# LoreVault — Plan Etapa 2: Supabase + Sync

Desglose de tareas para Etapa 2, siguiendo el flujo validado en Etapa 1:
una sesión de Claude Code por tarea, revisar y commitear antes de avanzar
a la siguiente. Cada tarea referencia la sección correspondiente de `spec.md`.

## Tarea 0 — Actualizar CLAUDE.md (prerequisito, sin código)

No es una sesión de Claude Code: es la actualización del documento de
contexto que cada sesión va a leer antes de escribir código. Tiene que
reflejar el modelo de datos nuevo (§3 de spec.md), las políticas RLS (§4) y
que ya no hay capa `idb` — hoy CLAUDE.md todavía describe Etapa 1.

**Bloquea todo lo demás.** Si arrancás una sesión de Claude Code sin esto
actualizado, la sesión va a confirmar contra un modelo de datos viejo.

## Tarea 1 — Setup de Supabase

- Crear proyecto en Supabase
- Instalar y configurar `supabase-js` en el frontend
- Variables de entorno (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) en `.env.local`
  y documentadas en el README del proyecto
- Cliente Supabase inicializado en un módulo único (`supabaseClient.ts`)

*Referencia: spec.md §2, §5*

## Tarea 2 — Migraciones SQL

- Crear las tablas `vaults`, `notes`, `connections`, `tags`, `note_tags`
- Aplicar RLS: `enable row level security` + función `user_has_vault_access`
  + policies de las 5 tablas
- Verificar manualmente en el SQL editor de Supabase que un usuario no puede
  leer vaults de otro usuario (probar con dos usuarios de prueba)

*Referencia: spec.md §3, §4*

## Tarea 3 — Autenticación

- Pantallas de signup / login / logout con Supabase Auth
- Hook o contexto de sesión (`useAuth` o similar) disponible en toda la app
- Rutas protegidas: sin sesión, redirige a login
- Manejo de estado de carga durante el chequeo inicial de sesión

*Referencia: spec.md §2*

## Tarea 4 — Vaults: datos + UI

- `vaults.ts`: listar, crear, renombrar, eliminar vaults del usuario logueado
- Pantalla de selección/creación de vault (paso obligatorio post-login)
- Vault activo disponible en contexto global para el resto de la app

*Referencia: spec.md §3, §6*

## Tarea 5 — Notes: migración a Supabase

- Reemplazar la implementación de `notes.ts` (antes sobre `idb`) por
  `supabase-js`, manteniendo las firmas de función existentes donde sea
  posible
- Adaptar las queries para que siempre filtren por el `vault_id` activo
- Confirmar que los componentes de UI existentes siguen funcionando sin
  cambios más allá del data layer

*Referencia: spec.md §3, §5*

## Tarea 6 — Connections: migración a Supabase

- Mismo criterio que Tarea 5, aplicado a `connections.ts`
- Verificar el constraint `no_self_connection` desde la UI (no se debería
  poder ofrecer conectar una nota consigo misma)

*Referencia: spec.md §3, §5*

## Tarea 7 — Tags: nuevo módulo

- `tags.ts`: CRUD de tags + asociar/desasociar tags a una nota
- Selector de tags en el editor de notas: autocompletar sobre tags
  existentes del vault + crear uno nuevo al vuelo
- Sin UI de color todavía (columna `color` queda sin consumo, reservada
  para Etapa 3)

*Referencia: spec.md §3, §4, §6*

## Tarea 8 — Estados de carga y error

- Estados de `loading` / `saving` / `error` en: crear nota, guardar nota,
  borrar nota, crear/borrar conexión, crear/borrar tag
- Feedback visual del autoguardado ("guardando..." / "guardado" / "error
  al guardar") en el editor
- Manejo de error de red genérico (reintentar o mensaje claro, sin
  sobrediseñar una estrategia de retry compleja)

*Referencia: spec.md §6*

## Tarea 8.5 — Orden manual de capítulos

Feature nueva decidida durante la etapa (2026-07-07, al cerrar la Tarea 5):
el schema original de Etapa 2 no tenía columna de orden y la UI para
asignarlo nunca existió — incluso en Etapa 1, `Note.order` solo se leía en
el listado de capítulos, nadie lo escribía. Va antes del deploy para que
producción arranque con el schema final.

- Migración nueva y aditiva (la tabla `notes` ya existe en producción):
  `alter table notes add column sort_order integer`
- `notes.ts`: sumar `sort_order` a las columnas y al mapeo (columna
  `sort_order` ↔ campo de dominio `Note.order`), re-admitir el campo en los
  inputs de creación/edición, y ordenar capítulos por `sort_order` en la
  query (null al final)
- Actualizar los comentarios que hoy documentan "siempre null" en
  `src/types/index.ts` (`Note.order`) y en el mapeo de `notes.ts`
- UI mínima: campo numérico "Orden" en el editor de notas, visible solo
  para capítulos (reordenar con flechas o drag & drop queda para Etapa 3
  si hace falta)
- CategoryPage ya ordena capítulos en memoria por `Note.order`: verificar
  que el listado refleje el orden sin tocarla
- Tests en `notes.test.ts` para el mapeo y la edición del campo

*Referencia: spec.md §3, §6*

## Tarea 9 — Deploy

- Variables de entorno de Supabase configuradas en Vercel
- Verificar el flujo completo en producción: signup → crear vault → crear
  nota → tag → conexión → logout → login → los datos persisten
- Actualizar el README del proyecto con el link deployado y el stack
  actualizado (spec.md §3 de la convención de documentación)

---

## Fuera de este plan

Lo listado en spec.md §7 (Realtime, offline, colaboración, migración de
datos, color-coding de tags) no tiene tareas acá — se retoma si Etapa 3
lo requiere.

El export/import de vault de Etapa 1 se retiró en la Tarea 6 junto con la
capa `idb`: su motivo original (datos atrapados en el IndexedDB de un solo
navegador) desaparece con Postgres como backend. Si se quiere backup/
portabilidad de un vault como feature, se rediseña sobre Supabase en
Etapa 3.
