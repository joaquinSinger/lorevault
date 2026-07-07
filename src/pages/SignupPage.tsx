import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { signUp } from '../lib/auth/auth'
import { useAuth } from '../lib/auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { LoadingScreen } from '../components/LoadingScreen'

const INPUT_CLASSES = 'w-full rounded-xs border border-trazo bg-noche px-3 py-2'

export function SignupPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  if (loading) {
    return <LoadingScreen />
  }

  // Con confirmación de email activada, signUp no abre sesión: en vez del
  // formulario se muestra el aviso de revisar el correo.
  if (awaitingConfirmation) {
    return (
      <AuthLayout title="Revisá tu email">
        <div className="space-y-5">
          <p className="text-sm text-sepia">
            Te mandamos un enlace de confirmación a{' '}
            <span className="text-pergamino">{email}</span>. Abrilo para activar tu cuenta y
            después iniciá sesión.
          </p>
          <Link to="/login" className="text-sm text-musgo hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    )
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
      const { needsEmailConfirmation } = await signUp(email, password)
      if (needsEmailConfirmation) {
        setAwaitingConfirmation(true)
      } else {
        await navigate('/vaults', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Crear cuenta">
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASSES}
          />
          <p className="text-xs text-sepia">Mínimo 6 caracteres.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-xs border border-trazo bg-noche p-3 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>

        <p className="text-sm text-sepia">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-musgo hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
