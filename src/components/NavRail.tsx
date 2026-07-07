import { Link, NavLink } from 'react-router'
import { CATEGORIES } from '../types'
import { CATEGORY_LABELS } from '../lib/categories'
import { useActiveVaultId } from '../state/vault-context'
import { Cinta } from './Cinta'
import { SearchBox } from './SearchBox'
import { SessionPanel } from './SessionPanel'

export function NavRail() {
  const vaultId = useActiveVaultId()
  return (
    <aside className="flex flex-col gap-8 border-r border-trazo bg-pizarra px-5 py-8">
      <div>
        <Link to={`/vaults/${vaultId}`} className="font-serif text-2xl font-medium">
          LoreVault
        </Link>
        <Link to="/vaults" className="mt-1 block text-sm text-sepia hover:text-pergamino">
          Cambiar de vault
        </Link>
      </div>

      <SearchBox />

      <nav aria-label="Categorías">
        <h2 className="mb-3 px-2 text-label uppercase text-sepia">Categorías</h2>
        <ul className="space-y-1">
          {CATEGORIES.map((category) => (
            <li key={category}>
              <NavLink
                to={`/vaults/${vaultId}/${category}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xs px-2 py-1.5 ${
                    isActive
                      ? 'bg-noche text-pergamino'
                      : 'text-sepia hover:text-pergamino'
                  }`
                }
              >
                <Cinta category={category} />
                {CATEGORY_LABELS[category]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-6">
        <SessionPanel />
      </div>
    </aside>
  )
}
