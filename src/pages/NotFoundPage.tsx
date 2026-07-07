import { Link } from 'react-router'
import { useVault } from '../state/vault-context'

export function NotFoundPage() {
  // Con un vault activo se vuelve a su portada; si no, a la selección de vaults.
  const { activeVaultId } = useVault()
  const home = activeVaultId ? `/vaults/${activeVaultId}` : '/vaults'
  return (
    <div className="max-w-[65ch]">
      <h1 className="font-serif text-display font-medium">Página no encontrada</h1>
      <p className="mt-4 text-sepia">Esta hoja no pertenece al códice.</p>
      <Link to={home} className="mt-6 inline-block text-musgo hover:underline">
        Volver al vault
      </Link>
    </div>
  )
}
