import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { v4 as uuidv4 } from 'uuid'
import type { Note } from '../../types'
import {
  closeDB,
  createConnection,
  deleteConnection,
  exportVault,
  getConnectionsByNoteId,
  importVault,
  VAULT_EXPORT_VERSION,
} from './index'
import { getDB } from './db'

/*
 * Cubre lo que todavía vive en IndexedDB durante la migración a Supabase:
 * connections (pasa a Supabase en la tarea 6) y el backup export/import de
 * Etapa 1. Las notas ya viven en Supabase (ver notes.test.ts), así que acá
 * se siembran directo en idb, sin pasar por la capa pública.
 */

// Importar ./index arrastra notes.ts/vaults.ts, que instancian el cliente de
// Supabase: se mockea para no depender de env vars ni de red (nada de acá lo usa).
vi.mock('../auth/supabaseClient', () => ({ supabase: {} }))

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let seq = 0
async function seedNote(partial: Partial<Note> = {}): Promise<Note> {
  const now = new Date().toISOString()
  const note: Note = {
    id: uuidv4(),
    category: 'personaje',
    title: `Nota ${++seq}`,
    content: '',
    order: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
  const db = await getDB()
  await db.add('notes', note)
  return note
}

async function getStoredNote(id: string): Promise<Note | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

async function resetDB() {
  await closeDB()
  globalThis.indexedDB = new IDBFactory()
}

beforeEach(resetDB)

describe('connections', () => {
  it('createConnection persiste y es visible desde ambas notas', async () => {
    const a = await seedNote({ title: 'A' })
    const b = await seedNote({ category: 'locacion', title: 'B' })
    const connection = await createConnection(a.id, b.id)

    expect(connection.id).toMatch(UUID_V4)
    expect(new Date(connection.createdAt).toISOString()).toBe(connection.createdAt)
    await expect(getConnectionsByNoteId(a.id)).resolves.toEqual([connection])
    await expect(getConnectionsByNoteId(b.id)).resolves.toEqual([connection])
  })

  it('rechaza conectar una nota consigo misma', async () => {
    const a = await seedNote()
    await expect(createConnection(a.id, a.id)).rejects.toThrow('consigo misma')
  })

  it('rechaza conectar notas inexistentes', async () => {
    const a = await seedNote()
    await expect(createConnection(a.id, 'no-existe')).rejects.toThrow('deben existir')
    await expect(createConnection('no-existe', a.id)).rejects.toThrow('deben existir')
  })

  it('rechaza duplicados en ambos sentidos (no dirigida)', async () => {
    const a = await seedNote()
    const b = await seedNote({ category: 'locacion' })
    await createConnection(a.id, b.id)
    await expect(createConnection(a.id, b.id)).rejects.toThrow('ya están conectadas')
    await expect(createConnection(b.id, a.id)).rejects.toThrow('ya están conectadas')
  })

  it('deleteConnection elimina la conexión sin tocar las notas', async () => {
    const a = await seedNote()
    const b = await seedNote({ category: 'locacion' })
    const connection = await createConnection(a.id, b.id)

    await deleteConnection(connection.id)

    await expect(getConnectionsByNoteId(a.id)).resolves.toEqual([])
    await expect(getStoredNote(a.id)).resolves.toEqual(a)
    await expect(getStoredNote(b.id)).resolves.toEqual(b)
  })
})

describe('vault: export / import', () => {
  async function seedVault() {
    const a = await seedNote({ title: 'Kaelen', content: 'Mago' })
    const b = await seedNote({ category: 'capitulo', title: 'Capítulo 1', order: 1 })
    const connection = await createConnection(a.id, b.id)
    return { notes: [a, b], connections: [connection] }
  }

  it('exportVault devuelve version, exportedAt y todos los datos', async () => {
    const seed = await seedVault()
    const vault = await exportVault()

    expect(vault.version).toBe(VAULT_EXPORT_VERSION)
    expect(new Date(vault.exportedAt).toISOString()).toBe(vault.exportedAt)
    expect(vault.notes).toHaveLength(2)
    expect(vault.connections).toEqual(seed.connections)
  })

  it('export → import no pierde datos (round-trip vía JSON)', async () => {
    const seed = await seedVault()
    const file = JSON.stringify(await exportVault())

    await resetDB() // simula otro navegador / vault vacío

    await importVault(JSON.parse(file))
    const byTitle = (x: Note, y: Note) => x.title.localeCompare(y.title)
    const restored = await exportVault()
    expect(restored.notes.sort(byTitle)).toEqual(seed.notes.sort(byTitle))
    expect(restored.connections).toEqual(seed.connections)
  })

  it('importVault reemplaza por completo los datos existentes', async () => {
    const seed = await seedVault()
    const file = await exportVault()

    await resetDB()
    const previa = await seedNote({ category: 'lore', title: 'Nota previa' })

    await importVault(file)
    await expect(getStoredNote(previa.id)).resolves.toBeUndefined()
    await expect(getStoredNote(seed.notes[0].id)).resolves.toEqual(seed.notes[0])
  })

  it('importVault rechaza estructuras inválidas sin tocar los datos', async () => {
    const existing = await seedNote({ category: 'lore', title: 'Intacta' })

    await expect(importVault(null)).rejects.toThrow('objeto JSON')
    await expect(importVault('texto')).rejects.toThrow('objeto JSON')
    await expect(
      importVault({ version: 99, notes: [], connections: [] }),
    ).rejects.toThrow('versión no soportada')
    await expect(importVault({ version: 1, notes: [] })).rejects.toThrow(
      'faltan las listas',
    )
    await expect(
      importVault({ version: 1, notes: [{ id: 1, title: null }], connections: [] }),
    ).rejects.toThrow('notas con estructura incorrecta')
    await expect(
      importVault({ version: 1, notes: [], connections: [{ id: 'x' }] }),
    ).rejects.toThrow('conexiones con estructura incorrecta')

    await expect(getStoredNote(existing.id)).resolves.toEqual(existing)
  })
})
