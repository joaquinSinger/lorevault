-- ============================================
-- LoreVault Etapa 2 — Orden manual de capítulos (tarea 8.5)
-- Fuente: spec.md §3 (columna sort_order en notes)
-- Aplicar en el SQL editor del dashboard de Supabase.
-- ============================================

-- Migración aditiva: la tabla ya existe en producción, no se edita la
-- migración original. Se llama `sort_order` y no `order` porque `order`
-- es palabra reservada de SQL; en el dominio el campo sigue siendo
-- `Note.order` (el mapeo vive en notes.ts). Null = sin orden asignado
-- (el capítulo va al final del listado); para las demás categorías
-- queda siempre null.
alter table notes add column sort_order integer;
