import { Button } from './Button'

/**
 * Falla al cargar datos (tarea 8): mensaje claro + reintento manual, mismo
 * patrón que la pantalla de vaults. Sin retry automático — el usuario decide
 * cuándo volver a intentar.
 */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <p role="alert" className="rounded-xs border border-trazo bg-pizarra p-3 text-sm">
        {message}
      </p>
      <Button onClick={onRetry}>Reintentar</Button>
    </div>
  )
}
