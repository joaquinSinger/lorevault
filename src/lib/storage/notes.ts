import { supabase } from '../auth/supabaseClient'
import type { Category, Note } from '../../types'
import { GENERIC_MESSAGE } from './errors'

/*
 * CRUD de notas sobre Supabase (antes idb). Mantiene las firmas de Etapa 1
 * donde el id alcanza (getNoteById/updateNote/deleteNote); los listados, la
 * búsqueda y la creación ahora reciben el vault activo porque un usuario
 * puede tener varios vaults. Ese filtro por vault_id es solo UX: la seguridad
 * real es la policy "notes_vault_access" (RLS).
 */

/** Fila de la tabla `notes` tal como la devuelve Postgres (snake_case). */
interface NoteRow {
  id: string
  type: string
  title: string
  content: string
  sort_order: number | null
  created_at: string
  updated_at: string
}

const NOTE_COLUMNS = 'id, type, title, content, sort_order, created_at, updated_at'

/** La columna `type` guarda la categoría en inglés (check del schema); el dominio sigue en español. */
const TYPE_BY_CATEGORY: Record<Category, string> = {
  personaje: 'character',
  locacion: 'location',
  lore: 'lore',
  capitulo: 'chapter',
}

const CATEGORY_BY_TYPE = Object.fromEntries(
  Object.entries(TYPE_BY_CATEGORY).map(([category, type]) => [type, category]),
) as Record<string, Category>

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    category: CATEGORY_BY_TYPE[row.type],
    title: row.title,
    content: row.content,
    // `sort_order` en Postgres porque `order` es palabra reservada de SQL;
    // el dominio conserva el nombre de Etapa 1 (spec.md §3).
    order: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface CreateNoteInput {
  vaultId: string
  category: Category
  title: string
  content?: string
  /** Orden manual, solo con sentido para capítulos; null u omitido = sin orden. */
  order?: number | null
}

/** `id`, `category`, `vaultId` y `createdAt` son inmutables tras la creación. */
export type UpdateNoteInput = Partial<Pick<Note, 'title' | 'content' | 'order'>>

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const title = input.title.trim()
  if (!title) {
    throw new Error('El título es requerido')
  }
  const { data, error } = await supabase
    .from('notes')
    .insert({
      vault_id: input.vaultId,
      type: TYPE_BY_CATEGORY[input.category],
      title,
      content: input.content ?? '',
      sort_order: input.order ?? null,
    })
    .select(NOTE_COLUMNS)
    .single()
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return toNote(data as NoteRow)
}

/** `undefined` si no existe o si RLS no deja verla (para el cliente es lo mismo). */
export async function getNoteById(id: string): Promise<Note | undefined> {
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return data ? toNote(data as NoteRow) : undefined
}

export async function getNotesByCategory(
  vaultId: string,
  category: Category,
): Promise<Note[]> {
  let query = supabase
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('vault_id', vaultId)
    .eq('type', TYPE_BY_CATEGORY[category])
  // Capítulos: orden manual primero (sin orden asignado al final), fecha de
  // creación como desempate (spec.md §6). Las demás categorías, por creación.
  if (category === 'capitulo') {
    query = query.order('sort_order', { ascending: true, nullsFirst: false })
  }
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return ((data ?? []) as NoteRow[]).map(toNote)
}

export async function updateNote(id: string, changes: UpdateNoteInput): Promise<Note> {
  if (changes.title !== undefined && !changes.title.trim()) {
    throw new Error('El título es requerido')
  }
  // No hay trigger de updated_at en el schema: lo refresca el cliente.
  const patch: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  }
  if (changes.title !== undefined) {
    patch.title = changes.title.trim()
  }
  if (changes.content !== undefined) {
    patch.content = changes.content
  }
  if (changes.order !== undefined) {
    patch.sort_order = changes.order
  }
  const { data, error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select(NOTE_COLUMNS)
    .single()
  // single() también falla si no hubo fila actualizada (nota inexistente o ajena).
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return toNote(data as NoteRow)
}

/** Postgres borra en cascada sus connections (de ambos lados) y note_tags. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
}

/** Minúsculas y sin diacríticos: "Aldarión" y "aldarion" comparan igual. */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Búsqueda por substring del título, sin distinguir mayúsculas ni tildes.
 * Postgres no tiene `unaccent` habilitado, así que se traen las notas del
 * vault (en orden alfabético) y el filtro insensible a diacríticos se hace
 * acá, igual que en Etapa 1 — escala de sobra para vaults personales.
 */
export async function searchNotesByTitle(vaultId: string, query: string): Promise<Note[]> {
  const q = normalizeForSearch(query.trim())
  if (!q) {
    return []
  }
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('vault_id', vaultId)
    .order('title', { ascending: true })
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return ((data ?? []) as NoteRow[])
    .map(toNote)
    .filter((note) => normalizeForSearch(note.title).includes(q))
}
