import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { getVaultById } from '../lib/storage'
import { useVault } from '../state/vault-context'
import { LoadingScreen } from './LoadingScreen'

/** `key` guarda el id consultado para distinguir "verificando" de "no existe". */
interface CheckResult {
  key: string
  exists: boolean
}

/**
 * Ruta layout de /vaults/:vaultId: verifica que el vault exista (para el
 * usuario logueado — RLS hace que un vault ajeno se vea como inexistente) y
 * lo publica como vault activo en VaultContext antes de renderizar el resto.
 * Si no existe, vuelve a la selección de vaults. Igual que RequireAuth,
 * esto es solo UX: la protección real de los datos es RLS en Postgres.
 */
export function RequireVault() {
  const { vaultId } = useParams()
  const { activeVaultId, setActiveVaultId } = useVault()
  const [check, setCheck] = useState<CheckResult | null>(null)

  useEffect(() => {
    if (!vaultId) {
      return
    }
    let cancelled = false
    getVaultById(vaultId)
      .then((vault) => {
        if (cancelled) {
          return
        }
        if (vault) {
          setActiveVaultId(vault.id)
        }
        setCheck({ key: vaultId, exists: vault !== null })
      })
      // Error de red: sin poder confirmar el vault no se entra; la pantalla
      // de selección tiene su propio estado de error con reintento.
      .catch(() => {
        if (!cancelled) {
          setCheck({ key: vaultId, exists: false })
        }
      })
    return () => {
      cancelled = true
      setActiveVaultId(null)
    }
  }, [vaultId, setActiveVaultId])

  if (!vaultId || (check?.key === vaultId && !check.exists)) {
    return <Navigate to="/vaults" replace />
  }
  // Esperar también a que el contexto refleje este vault: los hijos leen
  // activeVaultId y no deben renderizar con null o con el vault anterior.
  if (check?.key !== vaultId || activeVaultId !== vaultId) {
    return <LoadingScreen />
  }
  return <Outlet />
}
