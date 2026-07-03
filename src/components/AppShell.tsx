import { Outlet } from 'react-router'
import { NavRail } from './NavRail'

/**
 * Layout "códice abierto": rail de navegación a la izquierda (categorías +
 * buscador) y columna de contenido a la derecha. La marginalia de conexiones
 * se agrega dentro de la vista de nota (tarea 6).
 */
export function AppShell() {
  return (
    <div className="grid min-h-dvh grid-cols-[16rem_minmax(0,1fr)]">
      <NavRail />
      <main className="px-10 py-12">
        <Outlet />
      </main>
    </div>
  )
}
