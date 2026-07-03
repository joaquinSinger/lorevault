import { CATEGORIES, type Connection, type Note, type VaultExport } from '../../types'
import { getDB } from './db'

export const VAULT_EXPORT_VERSION = 1

export async function exportVault(): Promise<VaultExport> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'connections'], 'readonly')
  const [notes, connections] = await Promise.all([
    tx.objectStore('notes').getAll(),
    tx.objectStore('connections').getAll(),
  ])
  await tx.done
  return {
    version: VAULT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notes,
    connections,
  }
}

/**
 * Reemplazo total: borra todo el contenido actual y carga el del archivo,
 * en una única transacción. La confirmación previa es responsabilidad de la UI.
 */
export async function importVault(data: unknown): Promise<void> {
  const vault = parseVaultExport(data)
  const db = await getDB()
  const tx = db.transaction(['notes', 'connections'], 'readwrite')
  const notes = tx.objectStore('notes')
  const connections = tx.objectStore('connections')
  await Promise.all([notes.clear(), connections.clear()])
  await Promise.all([
    ...vault.notes.map((note) => notes.add(note)),
    ...vault.connections.map((connection) => connections.add(connection)),
  ])
  await tx.done
}

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false
  const note = value as Record<string, unknown>
  return (
    typeof note.id === 'string' &&
    CATEGORIES.includes(note.category as Note['category']) &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    (typeof note.order === 'number' || note.order === null) &&
    typeof note.createdAt === 'string' &&
    typeof note.updatedAt === 'string'
  )
}

function isConnection(value: unknown): value is Connection {
  if (typeof value !== 'object' || value === null) return false
  const connection = value as Record<string, unknown>
  return (
    typeof connection.id === 'string' &&
    typeof connection.sourceNoteId === 'string' &&
    typeof connection.targetNoteId === 'string' &&
    typeof connection.createdAt === 'string'
  )
}

/**
 * Valida la estructura de un backup y lo devuelve tipado. Lanza `Error` con
 * mensaje mostrable si la versión no está soportada o la forma es incorrecta.
 * La UI la usa al elegir el archivo, antes de pedir confirmación.
 */
export function parseVaultExport(data: unknown): VaultExport {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Archivo inválido: se esperaba un objeto JSON')
  }
  const vault = data as Record<string, unknown>
  if (vault.version !== VAULT_EXPORT_VERSION) {
    throw new Error(`Archivo inválido: versión no soportada (${String(vault.version)})`)
  }
  if (!Array.isArray(vault.notes) || !Array.isArray(vault.connections)) {
    throw new Error('Archivo inválido: faltan las listas de notas y conexiones')
  }
  if (!vault.notes.every(isNote)) {
    throw new Error('Archivo inválido: hay notas con estructura incorrecta')
  }
  if (!vault.connections.every(isConnection)) {
    throw new Error('Archivo inválido: hay conexiones con estructura incorrecta')
  }
  return {
    version: VAULT_EXPORT_VERSION,
    exportedAt: typeof vault.exportedAt === 'string' ? vault.exportedAt : '',
    notes: vault.notes,
    connections: vault.connections,
  }
}
