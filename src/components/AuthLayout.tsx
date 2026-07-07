import type { ReactNode } from 'react'

/**
 * Marco compartido de las pantallas de autenticación (login/signup): wordmark
 * y tarjeta centrada. Usa los mismos tokens que el resto del vault — no es
 * un "área de cuenta" con estética propia.
 */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-serif text-3xl font-medium">LoreVault</p>
        <section className="rounded-xs border border-trazo bg-pizarra p-8">
          <h1 className="mb-6 font-serif text-2xl">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  )
}
