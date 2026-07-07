/**
 * API pública de la capa de persistencia. El resto de la app importa solo
 * de acá — nunca de `supabase-js` directamente.
 */
export {
  getVaults,
  getVaultById,
  createVault,
  renameVault,
  deleteVault,
} from './vaults'
export {
  createNote,
  getNoteById,
  getNotesByCategory,
  updateNote,
  deleteNote,
  searchNotesByTitle,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './notes'
export { createConnection, getConnectionsByNoteId, deleteConnection } from './connections'
