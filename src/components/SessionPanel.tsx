import { useState } from 'react'
import { signOut } from '../lib/auth/auth'
import { useAuth } from '../lib/auth/useAuth'
import { Button } from './Button'

/**
 * Pie del rail de navegación: email del usuario logueado + cerrar sesión.
 * Al cerrar sesión no navega: AuthProvider propaga la sesión nula y
 * RequireAuth redirige a /login.
 */
export function SessionPanel() {
  const { session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = session?.user.email

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión.')
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-2 border-t border-trazo pt-4">
      {email && (
        <p className="truncate px-2 text-sm text-sepia" title={email}>
          {email}
        </p>
      )}
      <Button className="w-full" disabled={signingOut} onClick={handleSignOut}>
        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </Button>
      {error && (
        <div role="alert" className="rounded-xs border border-trazo bg-noche p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
