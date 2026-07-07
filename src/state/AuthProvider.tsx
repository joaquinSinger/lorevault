import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/auth/supabaseClient'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange emite INITIAL_SESSION apenas nos suscribimos, así
    // que un único listener cubre el chequeo inicial y todos los cambios
    // posteriores (login, logout, refresh de token).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => ({ session, loading }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
