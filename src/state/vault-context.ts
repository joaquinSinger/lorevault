import { createContext, useContext } from 'react'

/*
 * Estado global elegido en la tarea 3: Context API, sin Zustand. Los datos
 * viven en Supabase detrás de `lib/storage/`; lo que se comparte entre
 * vistas es el vault activo (Etapa 2, con soporte de múltiples vaults) y
 * una señal de invalidación para releer tras una mutación.
 */
export interface VaultState {
  /** Contador que crece con cada mutación; usarlo como dependencia de efectos que leen del vault. */
  revision: number
  /** Avisar que hubo una mutación (crear/editar/borrar/importar) para que las vistas releen. */
  invalidate: () => void
  /** Vault activo; null fuera de /vaults/:vaultId. Lo setea RequireVault al entrar a la ruta. */
  activeVaultId: string | null
  setActiveVaultId: (id: string | null) => void
}

export const VaultContext = createContext<VaultState | null>(null)

export function useVault(): VaultState {
  const ctx = useContext(VaultContext)
  if (!ctx) {
    throw new Error('useVault debe usarse dentro de <VaultProvider>')
  }
  return ctx
}

/** Para vistas que viven bajo /vaults/:vaultId, donde el vault activo está garantizado. */
export function useActiveVaultId(): string {
  const { activeVaultId } = useVault()
  if (!activeVaultId) {
    throw new Error('useActiveVaultId requiere un vault activo (rutas bajo /vaults/:vaultId)')
  }
  return activeVaultId
}
