import { useMemo, useState, type ReactNode } from 'react'
import { VaultContext, type VaultState } from './vault-context'

export function VaultProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null)
  const value = useMemo<VaultState>(
    () => ({
      revision,
      invalidate: () => setRevision((r) => r + 1),
      activeVaultId,
      setActiveVaultId,
    }),
    [revision, activeVaultId],
  )
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
