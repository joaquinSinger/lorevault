import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConnection, deleteConnection, getConnectionsByNoteId } from './connections'

/*
 * Mismo esquema que notes.test.ts: cliente de Supabase mockeado completo
 * (convención de CLAUDE.md: los tests nunca le pegan a un proyecto real).
 * A diferencia de notes, createConnection hace dos queries (chequeo de
 * duplicado + insert), así que los builders se encolan con
 * mockReturnValueOnce en orden de llamada.
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
  or: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (value: SupabaseResult) => unknown) => unknown
}

/**
 * Builder encadenable y thenable: `await` en cualquier punto de la cadena
 * resuelve `result`. Cada llamada a mockQuery encola un builder para la
 * siguiente llamada a `from()`.
 */
function mockQuery(result: SupabaseResult): MockBuilder {
  const builder = {} as MockBuilder
  builder.select = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.then = (resolve) => resolve({ data: null, error: null, ...result })
  mockFrom.mockReturnValueOnce(builder)
  return builder
}

const CONNECTION_COLUMNS = 'id, source_note_id, target_note_id, created_at'

const VAULT_ID = 'e5e9b1de-0000-4000-8000-00000000000a'
const NOTE_A = 'e5e9b1de-0000-4000-8000-000000000001'
const NOTE_B = 'e5e9b1de-0000-4000-8000-000000000002'

const ROW = {
  id: 'e5e9b1de-0000-4000-8000-0000000000c1',
  source_note_id: NOTE_A,
  target_note_id: NOTE_B,
  created_at: '2026-07-01T10:00:00.000Z',
}

const CONNECTION = {
  id: ROW.id,
  sourceNoteId: NOTE_A,
  targetNoteId: NOTE_B,
  createdAt: ROW.created_at,
}

const DB_ERROR = { message: 'boom' }

beforeEach(() => {
  mockFrom.mockReset()
})

describe('createConnection', () => {
  it('inserta con vault_id y sin id generado en el cliente (lo da Postgres)', async () => {
    mockQuery({ data: [] }) // chequeo de duplicado: sin conexiones previas
    const builder = mockQuery({ data: ROW })
    await expect(createConnection(VAULT_ID, NOTE_A, NOTE_B)).resolves.toEqual(CONNECTION)
    expect(mockFrom).toHaveBeenCalledWith('connections')
    expect(builder.insert).toHaveBeenCalledWith({
      vault_id: VAULT_ID,
      source_note_id: NOTE_A,
      target_note_id: NOTE_B,
    })
    const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted).not.toHaveProperty('id')
    expect(builder.select).toHaveBeenCalledWith(CONNECTION_COLUMNS)
    expect(builder.single).toHaveBeenCalled()
  })

  it('rechaza conectar una nota consigo misma sin tocar la red', async () => {
    await expect(createConnection(VAULT_ID, NOTE_A, NOTE_A)).rejects.toThrow(
      'consigo misma',
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rechaza duplicados en ambos sentidos (no dirigida) sin insertar', async () => {
    // Ya existe A→B: conectar A→B de nuevo choca contra el chequeo…
    mockQuery({ data: [ROW] })
    await expect(createConnection(VAULT_ID, NOTE_A, NOTE_B)).rejects.toThrow(
      'ya están conectadas',
    )
    // …y conectar B→A también, porque la conexión existente involucra a B.
    mockQuery({ data: [ROW] })
    await expect(createConnection(VAULT_ID, NOTE_B, NOTE_A)).rejects.toThrow(
      'ya están conectadas',
    )
    expect(mockFrom).toHaveBeenCalledTimes(2) // solo los dos chequeos, ningún insert
  })

  it('lanza un error amigable si el insert falla (incluye notas inexistentes: FK)', async () => {
    mockQuery({ data: [] })
    mockQuery({ error: DB_ERROR })
    await expect(createConnection(VAULT_ID, NOTE_A, NOTE_B)).rejects.toThrow(
      'Revisá tu conexión',
    )
  })

  it('lanza un error amigable si falla el chequeo de duplicado', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(createConnection(VAULT_ID, NOTE_A, NOTE_B)).rejects.toThrow(
      'Revisá tu conexión',
    )
  })
})

describe('getConnectionsByNoteId', () => {
  it('busca la nota en ambos lados y mapea snake_case → dominio', async () => {
    const builder = mockQuery({ data: [ROW] })
    await expect(getConnectionsByNoteId(NOTE_A)).resolves.toEqual([CONNECTION])
    expect(builder.or).toHaveBeenCalledWith(
      `source_note_id.eq.${NOTE_A},target_note_id.eq.${NOTE_A}`,
    )
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('devuelve [] cuando la nota no tiene conexiones', async () => {
    mockQuery({ data: [] })
    await expect(getConnectionsByNoteId(NOTE_A)).resolves.toEqual([])
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getConnectionsByNoteId(NOTE_A)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('deleteConnection', () => {
  it('borra por id sin tocar las notas', async () => {
    const builder = mockQuery({})
    await expect(deleteConnection(ROW.id)).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('connections')
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(deleteConnection(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})
