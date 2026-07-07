import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVault, deleteVault, getVaultById, getVaults, renameVault } from './vaults'

/*
 * El cliente de Supabase se mockea completo (convención de CLAUDE.md: los
 * tests nunca le pegan a un proyecto real). Cada test arma un query builder
 * falso donde todos los métodos encadenan y el await resuelve al resultado
 * configurado, y después verifica la query construida y el mapeo del
 * resultado.
 */

const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}))

vi.mock('../auth/supabaseClient', () => ({
  supabase: { from: mockFrom, auth: { getSession: mockGetSession } },
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

const ROW = {
  id: 'e5e9b1de-0000-4000-8000-000000000001',
  name: 'Eldoria',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-02T12:30:00.000Z',
}

const VAULT = {
  id: ROW.id,
  name: ROW.name,
  createdAt: ROW.created_at,
  updatedAt: ROW.updated_at,
}

const DB_ERROR = { message: 'boom' }

beforeEach(() => {
  mockFrom.mockReset()
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
})

describe('getVaults', () => {
  it('lista los vaults mapeados a camelCase, ordenados por creación', async () => {
    const builder = mockQuery({ data: [ROW] })
    await expect(getVaults()).resolves.toEqual([VAULT])
    expect(mockFrom).toHaveBeenCalledWith('vaults')
    expect(builder.select).toHaveBeenCalledWith('id, name, created_at, updated_at')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('devuelve [] cuando el usuario no tiene vaults', async () => {
    mockQuery({ data: [] })
    await expect(getVaults()).resolves.toEqual([])
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getVaults()).rejects.toThrow('Revisá tu conexión')
  })
})

describe('getVaultById', () => {
  it('devuelve el vault mapeado cuando existe', async () => {
    const builder = mockQuery({ data: ROW })
    await expect(getVaultById(ROW.id)).resolves.toEqual(VAULT)
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
    expect(builder.maybeSingle).toHaveBeenCalled()
  })

  it('devuelve null si no existe (o RLS no deja verlo)', async () => {
    mockQuery({ data: null })
    await expect(getVaultById('otro-id')).resolves.toBeNull()
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(getVaultById(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})

describe('createVault', () => {
  it('inserta con owner_id de la sesión, nombre trimmeado, y devuelve el registro creado', async () => {
    const builder = mockQuery({ data: ROW })
    await expect(createVault('  Eldoria  ')).resolves.toEqual(VAULT)
    expect(builder.insert).toHaveBeenCalledWith({ name: 'Eldoria', owner_id: 'user-1' })
    expect(builder.single).toHaveBeenCalled()
  })

  it('no genera id en el cliente: lo recibe de Postgres vía insert().select()', async () => {
    const builder = mockQuery({ data: ROW })
    const vault = await createVault('Eldoria')
    expect(vault.id).toBe(ROW.id)
    const inserted = builder.insert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted).not.toHaveProperty('id')
  })

  it('rechaza nombre vacío o solo espacios sin tocar la red', async () => {
    await expect(createVault('')).rejects.toThrow('El nombre es requerido')
    await expect(createVault('   ')).rejects.toThrow('El nombre es requerido')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rechaza si no hay sesión activa', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    await expect(createVault('Eldoria')).rejects.toThrow('iniciar sesión')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(createVault('Eldoria')).rejects.toThrow('Revisá tu conexión')
  })
})

describe('renameVault', () => {
  it('actualiza nombre trimmeado y refresca updated_at (no hay trigger en la base)', async () => {
    const builder = mockQuery({ data: { ...ROW, name: 'Nueva Eldoria' } })
    const vault = await renameVault(ROW.id, '  Nueva Eldoria  ')
    expect(vault.name).toBe('Nueva Eldoria')
    expect(builder.update).toHaveBeenCalledWith({
      name: 'Nueva Eldoria',
      updated_at: expect.stringMatching(ISO_8601) as unknown,
    })
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
  })

  it('rechaza nombre vacío sin tocar la red', async () => {
    await expect(renameVault(ROW.id, '  ')).rejects.toThrow('El nombre es requerido')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lanza si Supabase falla (incluye vault inexistente: single() sin fila)', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(renameVault('no-existe', 'X')).rejects.toThrow('Revisá tu conexión')
  })
})

describe('deleteVault', () => {
  it('borra por id (la cascada de notas/conexiones/tags es de Postgres)', async () => {
    const builder = mockQuery({})
    await expect(deleteVault(ROW.id)).resolves.toBeUndefined()
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', ROW.id)
  })

  it('lanza un error amigable si Supabase falla', async () => {
    mockQuery({ error: DB_ERROR })
    await expect(deleteVault(ROW.id)).rejects.toThrow('Revisá tu conexión')
  })
})
