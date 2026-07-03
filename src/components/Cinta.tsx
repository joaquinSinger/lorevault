import type { Category } from '../types'
import { CATEGORY_TINTA_BG } from '../lib/categories'

const SIZES = {
  sm: 'h-5 w-2.5',
  md: 'h-9 w-4',
} as const

/**
 * Cinta marcapáginas con corte en V: el elemento firma del "códice abierto".
 * Se repite en el rail de navegación, el encabezado de nota y las conexiones,
 * siempre en la tinta de su categoría. Decorativa: se oculta a lectores de
 * pantalla, el texto adyacente nombra la categoría.
 */
export function Cinta({
  category,
  size = 'sm',
}: {
  category: Category
  size?: keyof typeof SIZES
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${SIZES[size]} ${CATEGORY_TINTA_BG[category]}`}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 6px), 0 100%)',
      }}
    />
  )
}
