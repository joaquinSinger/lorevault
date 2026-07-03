import { createContext, useContext } from 'react'

/*
 * Estado global elegido en la tarea 3: Context API, sin Zustand. Los datos
 * viven en IndexedDB detrás de `lib/storage/`; lo único que se comparte
 * entre vistas es una señal de invalidación para releer tras una mutación.
 */
export interface VaultState {
  /** Contador que crece con cada mutación; usarlo como dependencia de efectos que leen del vault. */
  revision: number
  /** Avisar que hubo una mutación (crear/editar/borrar/importar) para que las vistas releen. */
  invalidate: () => void
}

export const VaultContext = createContext<VaultState | null>(null)

export function useVault(): VaultState {
  const ctx = useContext(VaultContext)
  if (!ctx) {
    throw new Error('useVault debe usarse dentro de <VaultProvider>')
  }
  return ctx
}
