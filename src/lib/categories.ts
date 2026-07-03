import { CATEGORIES, type Category } from '../types'

/** Nombre visible de cada categoría en la navegación y los listados. */
export const CATEGORY_LABELS: Record<Category, string> = {
  personaje: 'Personajes',
  locacion: 'Locaciones',
  lore: 'Lore',
  capitulo: 'Capítulos',
}

/** Nombre visible en singular (encabezado de nota, etiquetas). */
export const CATEGORY_LABELS_SINGULAR: Record<Category, string> = {
  personaje: 'Personaje',
  locacion: 'Locación',
  lore: 'Lore',
  capitulo: 'Capítulo',
}

/*
 * Clases literales (no interpoladas) para que Tailwind las detecte en el
 * escaneo estático. Las tintas codifican categoría, nunca acción.
 */

export const CATEGORY_TINTA_BG: Record<Category, string> = {
  personaje: 'bg-tinta-personaje',
  locacion: 'bg-tinta-locacion',
  lore: 'bg-tinta-lore',
  capitulo: 'bg-tinta-capitulo',
}

export const CATEGORY_TINTA_TEXT: Record<Category, string> = {
  personaje: 'text-tinta-personaje',
  locacion: 'text-tinta-locacion',
  lore: 'text-tinta-lore',
  capitulo: 'text-tinta-capitulo',
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}
