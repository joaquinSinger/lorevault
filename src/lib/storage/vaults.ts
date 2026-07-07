import { supabase } from '../auth/supabaseClient'
import type { Vault } from '../../types'

/*
 * CRUD de vaults sobre Supabase. Primer módulo de la capa de storage que
 * habla con Postgres en vez de IndexedDB: los ids y timestamps los genera
 * la base, así que toda creación usa insert().select() para recibir el
 * registro completo. Acá no se filtra por owner_id: la policy
 * "vaults_owner_access" ya limita cada query a los vaults del usuario
 * autenticado, y ese recorte es la seguridad real (RLS), no UX.
 */

/** Fila de la tabla `vaults` tal como la devuelve Postgres (snake_case). */
interface VaultRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

const VAULT_COLUMNS = 'id, name, created_at, updated_at'

const GENERIC_MESSAGE =
  'No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.'

function toVault(row: VaultRow): Vault {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Vaults del usuario logueado, del más antiguo al más nuevo. */
export async function getVaults(): Promise<Vault[]> {
  const { data, error } = await supabase
    .from('vaults')
    .select(VAULT_COLUMNS)
    .order('created_at', { ascending: true })
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return ((data ?? []) as VaultRow[]).map(toVault)
}

/** `null` si no existe o si RLS no deja verlo (para el cliente es lo mismo). */
export async function getVaultById(id: string): Promise<Vault | null> {
  const { data, error } = await supabase
    .from('vaults')
    .select(VAULT_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return data ? toVault(data as VaultRow) : null
}

export async function createVault(name: string): Promise<Vault> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('El nombre es requerido')
  }
  // owner_id no tiene default en la tabla: se toma de la sesión local. Si el
  // valor no coincidiera con auth.uid(), el with check de RLS rechaza la fila.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Tenés que iniciar sesión para crear un vault.')
  }
  const { data, error } = await supabase
    .from('vaults')
    .insert({ name: trimmed, owner_id: session.user.id })
    .select(VAULT_COLUMNS)
    .single()
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return toVault(data as VaultRow)
}

export async function renameVault(id: string, name: string): Promise<Vault> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('El nombre es requerido')
  }
  // No hay trigger de updated_at en el schema: lo refresca el cliente.
  const { data, error } = await supabase
    .from('vaults')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(VAULT_COLUMNS)
    .single()
  // single() también falla si no hubo fila actualizada (vault inexistente o ajeno).
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
  return toVault(data as VaultRow)
}

/** Postgres borra en cascada las notas, conexiones y tags del vault. */
export async function deleteVault(id: string): Promise<void> {
  const { error } = await supabase.from('vaults').delete().eq('id', id)
  if (error) {
    throw new Error(GENERIC_MESSAGE)
  }
}
