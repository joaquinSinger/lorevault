import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../lib/auth/useAuth'
import { LoadingScreen } from './LoadingScreen'

/**
 * Ruta layout que protege todo lo que cuelga de ella: mientras se resuelve
 * el chequeo inicial de sesión muestra la pantalla de carga, y sin sesión
 * redirige a /login. La protección real de los datos es RLS en Postgres;
 * esto es solo UX.
 */
export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
