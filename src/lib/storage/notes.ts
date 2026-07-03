import { v4 as uuidv4 } from 'uuid'
import type { Category, Note } from '../../types'
import { getDB } from './db'

export interface CreateNoteInput {
  category: Category
  title: string
  content?: string
  order?: number | null
}

/** `id`, `category` y `createdAt` son inmutables tras la creación. */
export type UpdateNoteInput = Partial<Pick<Note, 'title' | 'content' | 'order'>>

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const title = input.title.trim()
  if (!title) {
    throw new Error('El título es requerido')
  }
  const now = new Date().toISOString()
  const note: Note = {
    id: uuidv4(),
    category: input.category,
    title,
    content: input.content ?? '',
    order: input.order ?? null,
    createdAt: now,
    updatedAt: now,
  }
  const db = await getDB()
  await db.add('notes', note)
  return note
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function getNotesByCategory(category: Category): Promise<Note[]> {
  const db = await getDB()
  return db.getAllFromIndex('notes', 'category', category)
}

export async function updateNote(id: string, changes: UpdateNoteInput): Promise<Note> {
  if (changes.title !== undefined && !changes.title.trim()) {
    throw new Error('El título es requerido')
  }
  const db = await getDB()
  const existing = await db.get('notes', id)
  if (!existing) {
    throw new Error(`No existe una nota con id ${id}`)
  }
  const updated: Note = {
    ...existing,
    ...changes,
    title: changes.title?.trim() ?? existing.title,
    id: existing.id,
    category: existing.category,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await db.put('notes', updated)
  return updated
}

/**
 * Borra la nota y, en cascada, todas sus conexiones (como source o target).
 * Todo ocurre en una única transacción: o se borra todo o no se borra nada.
 */
export async function deleteNote(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'connections'], 'readwrite')
  const connections = tx.objectStore('connections')
  const [asSource, asTarget] = await Promise.all([
    connections.index('sourceNoteId').getAllKeys(id),
    connections.index('targetNoteId').getAllKeys(id),
  ])
  await Promise.all([
    tx.objectStore('notes').delete(id),
    ...[...asSource, ...asTarget].map((key) => connections.delete(key)),
  ])
  await tx.done
}

/** Minúsculas y sin diacríticos: "Aldarión" y "aldarion" comparan igual. */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Filtro in-memory (substring, sin distinguir mayúsculas ni tildes) sobre el
 * índice `title`, que además devuelve los resultados en orden alfabético.
 */
export async function searchNotesByTitle(query: string): Promise<Note[]> {
  const q = normalizeForSearch(query.trim())
  if (!q) {
    return []
  }
  const db = await getDB()
  const all = await db.getAllFromIndex('notes', 'title')
  return all.filter((note) => normalizeForSearch(note.title).includes(q))
}
