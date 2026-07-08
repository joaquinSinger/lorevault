import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '../../types'
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotesByCategory,
  searchNotesByTitle,
  updateNote,
} from './notes'

/*
 * Mismo esquema que vaults.test.ts: el cliente de Supabase se mockea completo
 * (convención de CLAUDE.md: los tests nunca le pegan a un proyecto real).
 * Cada test arma un query builder falso donde todos los métodos encadenan y
 * el await resuelve al resultado configurado, y después verifica la query
 * construida y el mapeo fila (snake_case, type en inglés) → Note (camelCase,
 * category en español).
 */

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../auth/supabaseClient', () => ({
  supabase: { from: mockFrom },
}))

interface SupabaseResult {
  data?: unknown
  error?: { message: string } | null
}

interface MockBuilder {
  select: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (resolve: (value: SupabaseResult) => unknown) => unknown
}

/** Builder encadenable y thenable: `await` en cualquier punto de la cadena resuelve `result`. */
function mockQuery(result: SupabaseResult): MockBuilder {
  const builder = {} as MockBuilder
  builder.select = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => builder)
  builder.then = (resolve) => resolve({ data: null, error: null, ...result })
  mockFrom.mockReturnValue(builder)
  return builder
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

const NOTE_COLUMNS = 'id, type, title, content, sort_order, created_at, updated_at'

const VAULT_ID = 'e5e9b1de-0000-4000-8000-00000000000a'

const ROW = {
  id: 'e5e9b1de-0000-4000-8000-000000000001',
  type: 'character',
  title: 'Kaelen',
  content: 'Mago',
  sort_order: null,
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-02T12:30:00.000Z',
}

const NOTE = {
  id: ROW.id,
  category: 'personaje',
  title: ROW.title,
  content: ROW.content,
  order: null,
  createdAt: ROW.created_at,
  updatedAt: ROW.updated_at,
}

/** El dominio habla en español; la columna `type` guarda el check en inglés. */
const TYPE_BY_CATEGORY: Record<Category, string> = {
  personaje: 'character',
  locacion: 'location',
  lore: 'lore',
  capitulo: 'chapter',
}

const DB_ERROR = { message: 'boom' }

beforeEach(() => {
  mockFrom.mockReset()
})

describe('createNote', () => {
  it('inserta con vault_id y type mapeado, y devuelve la nota mapeada a dominio', async () => {
    const builder = mockQuery({ data: ROW })
    await expect(
      createNote({ vaultId: VAULT_ID, category: 'personaje', title: '  Kaelen  ', content: 'Mago' }),
    ).resolves.toEqual(NOTE)
    expect(mockFrom).toHaveBeenCalledWith('notes')
    expect(builder.insert).toHaveBeenCalledWith({
      vault_id: VAULT_ID,
      type: 'character',
      title: 'Kaelen',
      content: 'Mago',
      sort_order: null,
    })
    expect(builder.select).toHaveBeenCalledWith(NOTE_COLUMNS)
    expect(builder.single).toHaveBeenCalled()
  })

  it('mapea cada categoría del dominio a su type del check de Postgres', async () => {
    for (const [category, type] of Object.entries(TYPE_BY_CATEGORY)) {
      const builder = mockQuery({ data: { ...ROW, type } })
      const note = await createNote({
        vaultId: VAULT_ID,
        category: category as Category,
        title: 'X',
      })
      const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
      expect(inserted.type).toBe(type)
      expect(note.category).toBe(category)
    }
  })

  it('content por defecto vacío y sin id generado en el cliente (lo da Postgres)', async () => {
    const builder = mockQuery({ data: { ...ROW, content: '' } })
    const note = await createNote({ vaultId: VAULT_ID, category: 'personaje', title: 'Kaelen' })
    expect(note.id).toBe(ROW.id)
    const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted).not.toHaveProperty('id')
    expect(inserted.content).toBe('')
  })

  it('persiste el orden manual cuando viene en el input (capítulos)', async () => {
    const builder = mockQuery({ data: { ...ROW, type: 'chapter', sort_order: 3 } })
    const note = await createNote({
      vaultId: VAULT_ID,
      category: 'capitulo',
      title: 'Capítulo III',
      order: 3,
    })
    const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted.sort_order).toBe(3)
    expect(note.order).toBe(3)
  })

  it('rechaza título vacío o solo espacios sin tocar la red', async () => {
    await expect(
      createNote({ vaultId: VAULT_ID, category: 'lore', title: '' }),
    ).rejects.toThrow('El título es requerido')
    await expect(
      createNote({ vaultId: VAULT_ID, category: 'lore', title: '   ' }),
    ).rejects.toThrow('El título es requerido')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(
      createNote({ vaultId: VAULT_ID, category: 'personaje', title: 'Kaelen' }),
    ).rejects.toThrow('Revisá tu conexión')
  })
})

describe('getNoteById', () => {
  it('devuelve la nota mapeada cuando existe', async () => {
    const builder = mockQuery({ data: ROW })
    await expect(getNoteById(ROW.id)).resolves.toEqual(NOTE)
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
    expect(builder.maybeSingle).toHaveBeenCalled()
  })

  it('devuelve undefined si no existe (o RLS no deja verla)', async () => {
    mockQuery({ data: null })
    await expect(getNoteById('otro-id')).resolves.toBeUndefined()
  })

  it('mapea sort_order de la fila a Note.order', async () => {
    mockQuery({ data: { ...ROW, type: 'chapter', sort_order: 7 } })
    const note = await getNoteById(ROW.id)
    expect(note?.order).toBe(7)
    expect(note?.category).toBe('capitulo')
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getNoteById(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('getNotesByCategory', () => {
  it('filtra por vault activo y type mapeado, ordenado por creación', async () => {
    const builder = mockQuery({ data: [ROW] })
    await expect(getNotesByCategory(VAULT_ID, 'personaje')).resolves.toEqual([NOTE])
    expect(builder.eq).toHaveBeenCalledWith('vault_id', VAULT_ID)
    expect(builder.eq).toHaveBeenCalledWith('type', 'character')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('devuelve [] cuando la categoría no tiene notas', async () => {
    mockQuery({ data: [] })
    await expect(getNotesByCategory(VAULT_ID, 'capitulo')).resolves.toEqual([])
  })

  it('capítulos: ordena por sort_order con null al final, creación como desempate', async () => {
    const builder = mockQuery({ data: [] })
    await getNotesByCategory(VAULT_ID, 'capitulo')
    expect(builder.order.mock.calls).toEqual([
      ['sort_order', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: true }],
    ])
  })

  it('las demás categorías no ordenan por sort_order', async () => {
    const builder = mockQuery({ data: [ROW] })
    await getNotesByCategory(VAULT_ID, 'personaje')
    expect(builder.order.mock.calls).toEqual([['created_at', { ascending: true }]])
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getNotesByCategory(VAULT_ID, 'lore')).rejects.toThrow('Revisá tu conexión')
  })
})

describe('updateNote', () => {
  it('actualiza título trimmeado y contenido, y refresca updated_at (no hay trigger)', async () => {
    const builder = mockQuery({ data: { ...ROW, title: 'Kaelen el Gris' } })
    const note = await updateNote(ROW.id, { title: '  Kaelen el Gris  ', content: 'Mago' })
    expect(note.title).toBe('Kaelen el Gris')
    expect(builder.update).toHaveBeenCalledWith({
      title: 'Kaelen el Gris',
      content: 'Mago',
      updated_at: expect.stringMatching(ISO_8601) as unknown,
    })
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
    expect(builder.single).toHaveBeenCalled()
  })

  it('no manda campos que no vinieron en los cambios', async () => {
    const builder = mockQuery({ data: ROW })
    await updateNote(ROW.id, { content: 'Solo contenido' })
    const patch = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch).not.toHaveProperty('title')
    expect(patch).not.toHaveProperty('sort_order')
    expect(patch.content).toBe('Solo contenido')
  })

  it('actualiza el orden manual mapeándolo a sort_order', async () => {
    const builder = mockQuery({ data: { ...ROW, type: 'chapter', sort_order: 2 } })
    const note = await updateNote(ROW.id, { order: 2 })
    const patch = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.sort_order).toBe(2)
    expect(note.order).toBe(2)
  })

  it('order: null limpia el orden (el capítulo vuelve al final)', async () => {
    const builder = mockQuery({ data: { ...ROW, type: 'chapter' } })
    const note = await updateNote(ROW.id, { order: null })
    const patch = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.sort_order).toBeNull()
    expect(note.order).toBeNull()
  })

  it('rechaza título vacío sin tocar la red', async () => {
    await expect(updateNote(ROW.id, { title: '  ' })).rejects.toThrow(
      'El título es requerido',
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lanza si Supabase falla (incluye nota inexistente: single() sin fila)', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(updateNote('no-existe', { title: 'X' })).rejects.toThrow(
      'Revisá tu conexión',
    )
  })
})

describe('deleteNote', () => {
  it('borra por id (la cascada de connections/note_tags es de Postgres)', async () => {
    const builder = mockQuery({})
    await expect(deleteNote(ROW.id)).resolves.toBeUndefined()
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(deleteNote(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('searchNotesByTitle', () => {
  const ROWS = [
    { ...ROW, id: 'e5e9b1de-0000-4000-8000-000000000011', type: 'lore', title: 'El gris eterno' },
    { ...ROW, id: 'e5e9b1de-0000-4000-8000-000000000012', title: 'Kaelen el Gris' },
    { ...ROW, id: 'e5e9b1de-0000-4000-8000-000000000013', type: 'location', title: 'Puerto Umbrío' },
  ]

  it('trae las notas del vault ordenadas por título y filtra por substring sin mayúsculas', async () => {
    const builder = mockQuery({ data: ROWS })
    const results = await searchNotesByTitle(VAULT_ID, 'GRIS')
    expect(results.map((n) => n.title)).toEqual(['El gris eterno', 'Kaelen el Gris'])
    expect(builder.eq).toHaveBeenCalledWith('vault_id', VAULT_ID)
    expect(builder.order).toHaveBeenCalledWith('title', { ascending: true })
  })

  it('no distingue tildes ni diéresis, en query ni en título (filtro del cliente)', async () => {
    mockQuery({ data: [{ ...ROW, title: 'Aldarión' }] })
    const sinTilde = await searchNotesByTitle(VAULT_ID, 'aldarion')
    expect(sinTilde.map((n) => n.title)).toEqual(['Aldarión'])

    mockQuery({ data: ROWS })
    const conTilde = await searchNotesByTitle(VAULT_ID, 'umbrío')
    expect(conTilde.map((n) => n.title)).toEqual(['Puerto Umbrío'])
  })

  it('devuelve [] para query vacía o solo espacios sin tocar la red', async () => {
    await expect(searchNotesByTitle(VAULT_ID, '')).resolves.toEqual([])
    await expect(searchNotesByTitle(VAULT_ID, '   ')).resolves.toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(searchNotesByTitle(VAULT_ID, 'gris')).rejects.toThrow('Revisá tu conexión')
  })
})
