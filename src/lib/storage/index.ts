/**
 * API pública de la capa de persistencia. El resto de la app importa solo
 * de acá — nunca de `idb` ni de los módulos internos. `getDB` queda
 * deliberadamente sin exportar.
 */
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
export { exportVault, importVault, VAULT_EXPORT_VERSION } from './vault'
export { closeDB } from './db'
