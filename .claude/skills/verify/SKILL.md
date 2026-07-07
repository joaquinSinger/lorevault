---
name: verify
description: Cómo verificar LoreVault end-to-end en este entorno (dev server + Chromium headless)
---

# Verificar LoreVault

## Levantar la app

```
npm run dev   # requiere .env.local (existe, gitignoreado); sirve en http://localhost:5173
```

## Manejar la UI (Chromium headless)

No hay Playwright en el repo, pero la máquina ya tiene browsers de Playwright
instalados en `%LOCALAPPDATA%\ms-playwright`. Receta que funciona:

1. En el scratchpad: `npm i playwright-core` (no descarga browsers).
2. Lanzar con el binario del sistema:

```js
const { chromium } = require('playwright-core')
const browser = await chromium.launch({
  executablePath: process.env.LOCALAPPDATA + '\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
```

(Si `chromium-1228` no existe más, listar `%LOCALAPPDATA%\ms-playwright` y usar
el `chromium-*` disponible.)

## Gotchas del proyecto de Supabase

- **Confirmación de email está ACTIVADA**: `signUp` no abre sesión; el usuario
  debe confirmar desde el mail. Para flujos que requieren sesión hace falta un
  usuario ya confirmado (pedirlo al dueño o crearlo en el dashboard).
- **SMTP integrado de Supabase**: rate limit bajísimo (~2 emails/hora). Los
  signups de prueba lo agotan enseguida → error `over_email_send_rate_limit`.
- Dominios tipo `example.com` son rechazados por Supabase con
  `email_address_invalid`.
- Solo hay `VITE_SUPABASE_ANON_KEY` en `.env.local` (no hay service role key
  ni CLI de Supabase): no se pueden crear usuarios confirmados por API admin.

## Flujos que vale la pena manejar

- Sin sesión: `/` y `/nota/xyz` deben redirigir a `/login`.
- Login inválido → alerta "Email o contraseña incorrectos." (role=alert).
- Signup: minLength 6 nativo en password; errores de Supabase traducidos en
  `src/lib/auth/auth.ts` (ERROR_MESSAGES por `error.code`).
- Con sesión (requiere usuario confirmado): NavRail muestra email + "Cerrar
  sesión"; logout vuelve a /login; /login con sesión redirige adentro; la
  sesión sobrevive una recarga dura.
