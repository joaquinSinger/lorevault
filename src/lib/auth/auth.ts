import { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/*
 * Operaciones de autenticación (email/password) sobre Supabase Auth.
 * El estado de sesión no se maneja acá: AuthProvider escucha
 * onAuthStateChange y propaga los cambios por contexto.
 */

/* Errores que el usuario puede provocar, traducidos; el resto cae al genérico. */
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_address_invalid: 'Ese email no parece válido. Probá con otra dirección.',
  email_not_confirmed: 'Tenés que confirmar tu email antes de iniciar sesión.',
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  weak_password: 'La contraseña es demasiado corta o demasiado común.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  over_email_send_rate_limit:
    'Se alcanzó el límite de emails de confirmación por ahora. Esperá un rato y probá de nuevo.',
}

const GENERIC_MESSAGE =
  'No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.'

function toFriendlyError(error: AuthError): Error {
  const translated = error.code ? ERROR_MESSAGES[error.code] : undefined
  return new Error(translated ?? GENERIC_MESSAGE)
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    throw toFriendlyError(error)
  }
  // Con confirmación de email activada en el proyecto, signUp no abre sesión:
  // el usuario tiene que confirmar desde el mail antes de poder loguearse.
  return { needsEmailConfirmation: !data.session }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw toFriendlyError(error)
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw toFriendlyError(error)
  }
}
