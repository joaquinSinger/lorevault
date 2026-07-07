import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { signIn } from '../lib/auth/auth'
import { useAuth } from '../lib/auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { LoadingScreen } from '../components/LoadingScreen'

const INPUT_CLASSES = 'w-full rounded-xs border border-trazo bg-noche px-3 py-2'

export function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return <LoadingScreen />
  }
  if (session) {
    return <Navigate to="/vaults" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
      await navigate('/vaults', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Iniciar sesión">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-label uppercase text-sepia">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASSES}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-label uppercase text-sepia">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASSES}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xs border border-trazo bg-noche p-3 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>

        <p className="text-sm text-sepia">
          ¿Todavía no tenés cuenta?{' '}
          <Link to="/signup" className="text-musgo hover:underline">
            Crear una
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
