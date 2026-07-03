import { v4 as uuidv4 } from 'uuid'
import type { Connection } from '../../types'
import { getDB } from './db'

export async function createConnection(
  sourceNoteId: string,
  targetNoteId: string,
): Promise<Connection> {
  if (sourceNoteId === targetNoteId) {
    throw new Error('Una nota no puede conectarse consigo misma')
  }
  const db = await getDB()
  const [source, target] = await Promise.all([
    db.get('notes', sourceNoteId),
    db.get('notes', targetNoteId),
  ])
  if (!source || !target) {
    throw new Error('Ambas notas deben existir para conectarlas')
  }
  // La conexión es no dirigida: A→B y B→A son la misma conexión.
  const [fromSource, fromTarget] = await Promise.all([
    db.getAllFromIndex('connections', 'sourceNoteId', sourceNoteId),
    db.getAllFromIndex('connections', 'sourceNoteId', targetNoteId),
  ])
  const alreadyConnected =
    fromSource.some((c) => c.targetNoteId === targetNoteId) ||
    fromTarget.some((c) => c.targetNoteId === sourceNoteId)
  if (alreadyConnected) {
    throw new Error('Las notas ya están conectadas')
  }
  const connection: Connection = {
    id: uuidv4(),
    sourceNoteId,
    targetNoteId,
    createdAt: new Date().toISOString(),
  }
  await db.add('connections', connection)
  return connection
}

/** Conexiones donde la nota participa de cualquiera de los dos lados. */
export async function getConnectionsByNoteId(noteId: string): Promise<Connection[]> {
  const db = await getDB()
  const [asSource, asTarget] = await Promise.all([
    db.getAllFromIndex('connections', 'sourceNoteId', noteId),
    db.getAllFromIndex('connections', 'targetNoteId', noteId),
  ])
  return [...asSource, ...asTarget]
}

export async function deleteConnection(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('connections', id)
}
