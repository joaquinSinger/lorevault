import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

/*
 * Sesión de Supabase Auth compartida por toda la app. `loading` cubre el
 * chequeo inicial de sesión al montar la app: hasta que se resuelve, las
 * rutas protegidas no pueden decidir si redirigir a /login o renderizar.
 */
export interface AuthState {
  /** Sesión activa de Supabase, o null si no hay usuario logueado. */
  session: Session | null
  /** true mientras se resuelve el chequeo inicial de sesión. */
  loading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)
