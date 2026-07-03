import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Connection, Note } from '../../types'

const DB_NAME = 'lorevault'
const DB_VERSION = 1

interface LoreVaultDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: { category: string; title: string; updatedAt: string }
  }
  connections: {
    key: string
    value: Connection
    indexes: { sourceNoteId: string; targetNoteId: string }
  }
}

let dbPromise: Promise<IDBPDatabase<LoreVaultDB>> | null = null

export function getDB(): Promise<IDBPDatabase<LoreVaultDB>> {
  dbPromise ??= openDB<LoreVaultDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const notes = db.createObjectStore('notes', { keyPath: 'id' })
      notes.createIndex('category', 'category')
      notes.createIndex('title', 'title')
      notes.createIndex('updatedAt', 'updatedAt')

      const connections = db.createObjectStore('connections', { keyPath: 'id' })
      connections.createIndex('sourceNoteId', 'sourceNoteId')
      connections.createIndex('targetNoteId', 'targetNoteId')
    },
  })
  return dbPromise
}

export async function closeDB(): Promise<void> {
  if (!dbPromise) return
  const db = await dbPromise
  db.close()
  dbPromise = null
}
