import { supabase } from '../auth/supabaseClient'
import type { Connection } from '../../types'
import { GENERIC_MESSAGE } from './errors'

/*
 * Conexiones sobre Supabase (antes idb). getConnectionsByNoteId y
 * deleteConnection mantienen las firmas de Etapa 1; createConnection ahora
 * recibe el vault activo porque la fila lleva vault_id propio (spec.md §3 lo
 * denormaliza para que la policy RLS no necesite join). Como en notes.ts,
 * ese vault_id es solo dato/UX: la seguridad real es la policy
 * "connections_vault_access".
 */

/** Fila de la tabla `connections` tal como la devuelve Postgres (snake_case). */
interface ConnectionRow {
  id: string
  source_note_id: string
  target_note_id: string
  created_at: string
}

const CONNECTION_COLUMNS = 'id, source_note_id, target_note_id, created_at'

function toConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    sourceNoteId: row.source_note_id,
    targetNoteId: row.target_note_id,
    createdAt: row.created_at,
  }
}

export async function createConnection(
  vaultId: string,
  sourceNoteId: string,
  targetNoteId: string,
): Promise<Connection> {
  // Refuerza en el cliente el constraint no_self_connection del schema,
  // con mensaje propio en vez del genérico de un error de Postgres.
  if (sourceNoteId === targetNoteId) {
    throw new Error('Una nota no puede conectarse consigo misma')
  }
  // La conexión es no dirigida (A→B y B→A son la misma) y el schema no tiene
  // unique sobre el par, así que el duplicado se detecta acá: toda conexión
  // existente de la nota origen ya la involucra, alcanza con mirar si el
  // otro extremo es la nota destino.
  const existing = await getConnectionsByNoteId(sourceNoteId)
  const alreadyConnected = existing.some(
    (c) => c.sourceNoteId === targetNoteId || c.targetNoteId === targetNoteId,
  )
  if (alreadyConnected) {
    throw new Error('Las notas ya están conectadas')
  }
  // Si alguna de las notas no existe, el insert falla por foreign key.
  const { data, error } = await supabase
    .from('connections')
    .insert({
      vault_id: vaultId,
      source_note_id: sourceNoteId,
      target_note_id: targetNoteId,
    })
    .select(CONNECTION_COLUMNS)
    .single()
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return toConnection(data as ConnectionRow)
}

/** Conexiones donde la nota participa de cualquiera de los dos lados. */
export async function getConnectionsByNoteId(noteId: string): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections')
    .select(CONNECTION_COLUMNS)
    .or(`source_note_id.eq.${noteId},target_note_id.eq.${noteId}`)
    .order('created_at', { ascending: true })
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return ((data ?? []) as ConnectionRow[]).map(toConnection)
}

export async function deleteConnection(id: string): Promise<void> {
  const { error } = await supabase.from('connections').delete().eq('id', id)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
}
