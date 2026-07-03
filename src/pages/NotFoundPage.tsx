import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="max-w-[65ch]">
      <h1 className="font-serif text-display font-medium">Página no encontrada</h1>
      <p className="mt-4 text-sepia">Esta hoja no pertenece al códice.</p>
      <Link to="/" className="mt-6 inline-block text-laton hover:underline">
        Volver al vault
      </Link>
    </div>
  )
}
