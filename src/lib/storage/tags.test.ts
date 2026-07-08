import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addTagToNote,
  createTag,
  deleteTag,
  getTagsByNoteId,
  getTagsByVaultId,
  removeTagFromNote,
  renameTag,
} from './tags'

/*
 * Mismo esquema que notes.test.ts: cliente de Supabase mockeado completo
 * (convención de CLAUDE.md: los tests nunca le pegan a un proyecto real).
 * Además del error genérico, acá se cubre el mapeo del código 23505
 * (unique_tag_per_vault y PK de note_tags) a comportamiento propio:
 * mensaje de duplicado al crear/renombrar, no-op al reasociar.
 */

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../auth/supabaseClient', () => ({
  supabase: { from: mockFrom },
}))

interface SupabaseResult {
  data?: unknown
  error?: { message: string; code?: string } | null
}

interface MockBuilder {
  select: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
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
  builder.then = (resolve) => resolve({ data: null, error: null, ...result })
  mockFrom.mockReturnValue(builder)
  return builder
}

const TAG_COLUMNS = 'id, name, created_at'

const VAULT_ID = 'e5e9b1de-0000-4000-8000-00000000000a'
const NOTE_ID = 'e5e9b1de-0000-4000-8000-000000000001'

const ROW = {
  id: 'e5e9b1de-0000-4000-8000-0000000000t1',
  name: 'antagonista',
  created_at: '2026-07-01T10:00:00.000Z',
}

const TAG = {
  id: ROW.id,
  name: ROW.name,
  createdAt: ROW.created_at,
}

const DB_ERROR = { message: 'boom' }
const DUPLICATE_ERROR = { message: 'duplicate key value', code: '23505' }

beforeEach(() => {
  mockFrom.mockReset()
})

describe('getTagsByVaultId', () => {
  it('filtra por vault, ordena por nombre y mapea snake_case → dominio', async () => {
    const builder = mockQuery({ data: [ROW] })
    await expect(getTagsByVaultId(VAULT_ID)).resolves.toEqual([TAG])
    expect(mockFrom).toHaveBeenCalledWith('tags')
    expect(builder.select).toHaveBeenCalledWith(TAG_COLUMNS)
    expect(builder.eq).toHaveBeenCalledWith('vault_id', VAULT_ID)
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('devuelve [] cuando el vault no tiene tags', async () => {
    mockQuery({ data: [] })
    await expect(getTagsByVaultId(VAULT_ID)).resolves.toEqual([])
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getTagsByVaultId(VAULT_ID)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('createTag', () => {
  it('inserta con vault_id y nombre trimmeado, sin id generado en el cliente', async () => {
    const builder = mockQuery({ data: ROW })
    await expect(createTag(VAULT_ID, '  antagonista  ')).resolves.toEqual(TAG)
    expect(builder.insert).toHaveBeenCalledWith({
      vault_id: VAULT_ID,
      name: 'antagonista',
    })
    const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted).not.toHaveProperty('id')
    expect(inserted).not.toHaveProperty('color')
    expect(builder.select).toHaveBeenCalledWith(TAG_COLUMNS)
    expect(builder.single).toHaveBeenCalled()
  })

  it('rechaza el nombre vacío sin tocar la red', async () => {
    await expect(createTag(VAULT_ID, '   ')).rejects.toThrow('requerido')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('mapea la violación de unique_tag_per_vault a un mensaje de duplicado', async () => {
    mockQuery({ error: DUPLICATE_ERROR })
    await expect(createTag(VAULT_ID, 'antagonista')).rejects.toThrow(
      'Ya existe un tag con ese nombre',
    )
  })

  it('lanza un error amigable si Supabase falla por otra causa', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(createTag(VAULT_ID, 'antagonista')).rejects.toThrow(
      'Revisá tu conexión',
    )
  })
})

describe('renameTag', () => {
  it('actualiza el nombre trimmeado por id y devuelve el tag mapeado', async () => {
    const renamed = { ...ROW, name: 'villano' }
    const builder = mockQuery({ data: renamed })
    await expect(renameTag(ROW.id, '  villano  ')).resolves.toEqual({
      ...TAG,
      name: 'villano',
    })
    expect(builder.update).toHaveBeenCalledWith({ name: 'villano' })
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
    expect(builder.single).toHaveBeenCalled()
  })

  it('rechaza el nombre vacío sin tocar la red', async () => {
    await expect(renameTag(ROW.id, '')).rejects.toThrow('requerido')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('mapea la violación de unique_tag_per_vault a un mensaje de duplicado', async () => {
    mockQuery({ error: DUPLICATE_ERROR })
    await expect(renameTag(ROW.id, 'villano')).rejects.toThrow(
      'Ya existe un tag con ese nombre',
    )
  })

  it('lanza un error amigable si Supabase falla por otra causa', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(renameTag(ROW.id, 'villano')).rejects.toThrow('Revisá tu conexión')
  })
})

describe('deleteTag', () => {
  it('borra por id (note_tags cae por cascada en Postgres)', async () => {
    const builder = mockQuery({})
    await expect(deleteTag(ROW.id)).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('tags')
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(deleteTag(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('getTagsByNoteId', () => {
  it('resuelve los tags embebidos vía note_tags y los ordena por nombre (es)', async () => {
    const zeta = { id: 'e5e9b1de-0000-4000-8000-0000000000t2', name: 'zeta', created_at: ROW.created_at }
    const builder = mockQuery({ data: [{ tags: zeta }, { tags: ROW }] })
    await expect(getTagsByNoteId(NOTE_ID)).resolves.toEqual([
      TAG,
      { id: zeta.id, name: 'zeta', createdAt: zeta.created_at },
    ])
    expect(mockFrom).toHaveBeenCalledWith('note_tags')
    expect(builder.select).toHaveBeenCalledWith(`tags (${TAG_COLUMNS})`)
    expect(builder.eq).toHaveBeenCalledWith('note_id', NOTE_ID)
  })

  it('ignora filas cuyo tag embebido venga null y devuelve [] sin tags', async () => {
    mockQuery({ data: [{ tags: null }] })
    await expect(getTagsByNoteId(NOTE_ID)).resolves.toEqual([])
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getTagsByNoteId(NOTE_ID)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('addTagToNote', () => {
  it('inserta el par (note_id, tag_id)', async () => {
    const builder = mockQuery({})
    await expect(addTagToNote(NOTE_ID, ROW.id)).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('note_tags')
    expect(builder.insert).toHaveBeenCalledWith({ note_id: NOTE_ID, tag_id: ROW.id })
  })

  it('trata la violación de PK (tag ya asociado) como no-op', async () => {
    mockQuery({ error: DUPLICATE_ERROR })
    await expect(addTagToNote(NOTE_ID, ROW.id)).resolves.toBeUndefined()
  })

  it('lanza un error amigable si Supabase falla por otra causa', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(addTagToNote(NOTE_ID, ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('removeTagFromNote', () => {
  it('borra el par exacto sin tocar el tag del vault', async () => {
    const builder = mockQuery({})
    await expect(removeTagFromNote(NOTE_ID, ROW.id)).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('note_tags')
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('note_id', NOTE_ID)
    expect(builder.eq).toHaveBeenCalledWith('tag_id', ROW.id)
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(removeTagFromNote(NOTE_ID, ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})
