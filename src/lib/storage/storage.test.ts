import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import type { Note } from '../../types'
import {
  closeDB,
  createConnection,
  createNote,
  deleteConnection,
  deleteNote,
  exportVault,
  getConnectionsByNoteId,
  getNoteById,
  getNotesByCategory,
  importVault,
  searchNotesByTitle,
  updateNote,
  VAULT_EXPORT_VERSION,
} from './index'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resetDB() {
  await closeDB()
  globalThis.indexedDB = new IDBFactory()
}

beforeEach(resetDB)

describe('notes: CRUD', () => {
  it('createNote genera uuid v4, fechas ISO y defaults', async () => {
    const note = await createNote({ category: 'personaje', title: 'Kaelen' })
    expect(note.id).toMatch(UUID_V4)
    expect(note.category).toBe('personaje')
    expect(note.title).toBe('Kaelen')
    expect(note.content).toBe('')
    expect(note.order).toBeNull()
    expect(new Date(note.createdAt).toISOString()).toBe(note.createdAt)
    expect(note.updatedAt).toBe(note.createdAt)
  })

  it('createNote persiste la nota (recuperable por getNoteById)', async () => {
    const note = await createNote({
      category: 'lore',
      title: 'La Grieta',
      content: '# Origen',
    })
    await expect(getNoteById(note.id)).resolves.toEqual(note)
  })

  it('createNote acepta order para capítulos', async () => {
    const note = await createNote({ category: 'capitulo', title: 'Capítulo 1', order: 1 })
    expect(note.order).toBe(1)
  })

  it('createNote rechaza título vacío o solo espacios', async () => {
    await expect(createNote({ category: 'lore', title: '' })).rejects.toThrow(
      'El título es requerido',
    )
    await expect(createNote({ category: 'lore', title: '   ' })).rejects.toThrow(
      'El título es requerido',
    )
  })

  it('getNoteById devuelve undefined si no existe', async () => {
    await expect(getNoteById('no-existe')).resolves.toBeUndefined()
  })

  it('getNotesByCategory filtra por categoría', async () => {
    await createNote({ category: 'personaje', title: 'Kaelen' })
    await createNote({ category: 'personaje', title: 'Mira' })
    await createNote({ category: 'locacion', title: 'Puerto Umbrío' })

    const personajes = await getNotesByCategory('personaje')
    expect(personajes.map((n) => n.title).sort()).toEqual(['Kaelen', 'Mira'])
    await expect(getNotesByCategory('capitulo')).resolves.toEqual([])
  })

  it('updateNote modifica campos editables y refresca updatedAt', async () => {
    const note = await createNote({ category: 'personaje', title: 'Kaelen' })
    await new Promise((resolve) => setTimeout(resolve, 5))

    const updated = await updateNote(note.id, {
      title: 'Kaelen el Gris',
      content: 'Mago',
    })
    expect(updated.title).toBe('Kaelen el Gris')
    expect(updated.content).toBe('Mago')
    expect(updated.id).toBe(note.id)
    expect(updated.category).toBe(note.category)
    expect(updated.createdAt).toBe(note.createdAt)
    expect(updated.updatedAt > note.updatedAt).toBe(true)
    await expect(getNoteById(note.id)).resolves.toEqual(updated)
  })

  it('updateNote rechaza título vacío y nota inexistente', async () => {
    const note = await createNote({ category: 'personaje', title: 'Kaelen' })
    await expect(updateNote(note.id, { title: '  ' })).rejects.toThrow(
      'El título es requerido',
    )
    await expect(updateNote('no-existe', { title: 'X' })).rejects.toThrow('No existe')
  })

  it('deleteNote elimina la nota y es idempotente', async () => {
    const note = await createNote({ category: 'lore', title: 'La Grieta' })
    await deleteNote(note.id)
    await expect(getNoteById(note.id)).resolves.toBeUndefined()
    await expect(deleteNote(note.id)).resolves.toBeUndefined()
  })
})

describe('notes: borrado en cascada', () => {
  it('al borrar una nota caen todas sus conexiones, de ambos lados', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    const b = await createNote({ category: 'personaje', title: 'B' })
    const c = await createNote({ category: 'locacion', title: 'C' })
    await createConnection(a.id, b.id) // B como target
    await createConnection(b.id, c.id) // B como source
    const survivor = await createConnection(a.id, c.id)

    await deleteNote(b.id)

    await expect(getConnectionsByNoteId(b.id)).resolves.toEqual([])
    await expect(getConnectionsByNoteId(a.id)).resolves.toEqual([survivor])
    await expect(getConnectionsByNoteId(c.id)).resolves.toEqual([survivor])
    // Las otras notas no se tocan.
    await expect(getNoteById(a.id)).resolves.toEqual(a)
    await expect(getNoteById(c.id)).resolves.toEqual(c)
  })
})

describe('connections', () => {
  it('createConnection persiste y es visible desde ambas notas', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    const b = await createNote({ category: 'locacion', title: 'B' })
    const connection = await createConnection(a.id, b.id)

    expect(connection.id).toMatch(UUID_V4)
    expect(new Date(connection.createdAt).toISOString()).toBe(connection.createdAt)
    await expect(getConnectionsByNoteId(a.id)).resolves.toEqual([connection])
    await expect(getConnectionsByNoteId(b.id)).resolves.toEqual([connection])
  })

  it('rechaza conectar una nota consigo misma', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    await expect(createConnection(a.id, a.id)).rejects.toThrow('consigo misma')
  })

  it('rechaza conectar notas inexistentes', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    await expect(createConnection(a.id, 'no-existe')).rejects.toThrow('deben existir')
    await expect(createConnection('no-existe', a.id)).rejects.toThrow('deben existir')
  })

  it('rechaza duplicados en ambos sentidos (no dirigida)', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    const b = await createNote({ category: 'locacion', title: 'B' })
    await createConnection(a.id, b.id)
    await expect(createConnection(a.id, b.id)).rejects.toThrow('ya están conectadas')
    await expect(createConnection(b.id, a.id)).rejects.toThrow('ya están conectadas')
  })

  it('deleteConnection elimina la conexión sin tocar las notas', async () => {
    const a = await createNote({ category: 'personaje', title: 'A' })
    const b = await createNote({ category: 'locacion', title: 'B' })
    const connection = await createConnection(a.id, b.id)

    await deleteConnection(connection.id)

    await expect(getConnectionsByNoteId(a.id)).resolves.toEqual([])
    await expect(getNoteById(a.id)).resolves.toEqual(a)
    await expect(getNoteById(b.id)).resolves.toEqual(b)
  })
})

describe('searchNotesByTitle', () => {
  it('filtra por substring sin distinguir mayúsculas', async () => {
    await createNote({ category: 'personaje', title: 'Kaelen el Gris' })
    await createNote({ category: 'locacion', title: 'Puerto Umbrío' })
    await createNote({ category: 'lore', title: 'El gris eterno' })

    const results = await searchNotesByTitle('GRIS')
    expect(results.map((n) => n.title)).toEqual(['El gris eterno', 'Kaelen el Gris'])
  })

  it('no distingue tildes ni diéresis, en query ni en título', async () => {
    await createNote({ category: 'personaje', title: 'Aldarión' })
    await createNote({ category: 'locacion', title: 'Puerto Umbrío' })

    const sinTilde = await searchNotesByTitle('aldarion')
    expect(sinTilde.map((n) => n.title)).toEqual(['Aldarión'])

    const conTilde = await searchNotesByTitle('umbrío')
    expect(conTilde.map((n) => n.title)).toEqual(['Puerto Umbrío'])
  })

  it('devuelve vacío para query vacía o solo espacios', async () => {
    await createNote({ category: 'personaje', title: 'Kaelen' })
    await expect(searchNotesByTitle('')).resolves.toEqual([])
    await expect(searchNotesByTitle('   ')).resolves.toEqual([])
  })
})

describe('vault: export / import', () => {
  async function seedVault() {
    const a = await createNote({
      category: 'personaje',
      title: 'Kaelen',
      content: 'Mago',
    })
    const b = await createNote({ category: 'capitulo', title: 'Capítulo 1', order: 1 })
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
    const previa = await createNote({ category: 'lore', title: 'Nota previa' })

    await importVault(file)
    await expect(getNoteById(previa.id)).resolves.toBeUndefined()
    await expect(getNoteById(seed.notes[0].id)).resolves.toEqual(seed.notes[0])
  })

  it('importVault rechaza estructuras inválidas sin tocar los datos', async () => {
    const existing = await createNote({ category: 'lore', title: 'Intacta' })

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

    await expect(getNoteById(existing.id)).resolves.toEqual(existing)
  })
})
