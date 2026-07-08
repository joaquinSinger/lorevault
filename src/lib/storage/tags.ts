import { supabase } from '../auth/supabaseClient'
import type { Tag } from '../../types'
import { GENERIC_MESSAGE } from './errors'

/*
 * Tags sobre Supabase (módulo nuevo de Etapa 2, sin equivalente en idb):
 * CRUD de la tabla `tags` + asociación con notas vía `note_tags`. Los tags
 * son por vault (unique_tag_per_vault) y normalizados en tabla propia, lo
 * que habilita rename global y el color-coding del grafo en Etapa 3 (la
 * columna `color` no se lee ni escribe todavía). Como en el resto de la
 * capa, filtrar por vault_id es solo UX: la seguridad real son las policies
 * "tags_vault_access" y "note_tags_vault_access".
 */

/** Fila de la tabla `tags` tal como la devuelve Postgres (snake_case). */
interface TagRow {
  id: string
  name: string
  created_at: string
}

const TAG_COLUMNS = 'id, name, created_at'

/** Código de Postgres para violación de unique (unique_tag_per_vault, PK de note_tags). */
const UNIQUE_VIOLATION = '23505'

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }
}

/** Tags del vault en orden alfabético, para el autocompletar del selector. */
export async function getTagsByVaultId(vaultId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select(TAG_COLUMNS)
    .eq('vault_id', vaultId)
    .order('name', { ascending: true })
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return ((data ?? []) as TagRow[]).map(toTag)
}

export async function createTag(vaultId: string, name: string): Promise<Tag> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('El nombre es requerido')
  }
  const { data, error } = await supabase
    .from('tags')
    .insert({ vault_id: vaultId, name: trimmed })
    .select(TAG_COLUMNS)
    .single()
  if (error) {
    // unique_tag_per_vault: el duplicado es un error del usuario, no de red.
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error('Ya existe un tag con ese nombre en este vault')
    }
    throw new Error(GENERIC_MESSAGE)
  }
  return toTag(data as TagRow)
}

/** Rename global: afecta a todas las notas que tengan el tag (tabla normalizada). */
export async function renameTag(id: string, name: string): Promise<Tag> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('El nombre es requerido')
  }
  const { data, error } = await supabase
    .from('tags')
    .update({ name: trimmed })
    .eq('id', id)
    .select(TAG_COLUMNS)
    .single()
  // single() también falla si no hubo fila actualizada (tag inexistente o ajeno).
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error('Ya existe un tag con ese nombre en este vault')
    }
    throw new Error(GENERIC_MESSAGE)
  }
  return toTag(data as TagRow)
}

/** Postgres borra en cascada sus note_tags: el tag desaparece de todas las notas. */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
}

/** Fila de `note_tags` con el tag embebido (select anidado de PostgREST). */
interface NoteTagRow {
  tags: TagRow | null
}

/** Tags de una nota en orden alfabético (es), resueltos a través de note_tags. */
export async function getTagsByNoteId(noteId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('note_tags')
    .select(`tags (${TAG_COLUMNS})`)
    .eq('note_id', noteId)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  // El embed no es ordenable desde PostgREST sin más ceremonia; se ordena acá.
  // Cast vía unknown: sin tipos generados de la base, supabase-js no sabe que
  // el embed por FK note_tags→tags es un objeto (many-to-one) y asume array.
  return ((data ?? []) as unknown as NoteTagRow[])
    .flatMap((row) => (row.tags ? [toTag(row.tags)] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function addTagToNote(noteId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('note_tags')
    .insert({ note_id: noteId, tag_id: tagId })
  if (error) {
    // PK (note_id, tag_id): reasociar un tag ya presente es idempotente para la UI.
    if (error.code === UNIQUE_VIOLATION) {
      return
    }
    throw new Error(GENERIC_MESSAGE)
  }
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('note_tags')
    .delete()
    .eq('note_id', noteId)
    .eq('tag_id', tagId)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
}
