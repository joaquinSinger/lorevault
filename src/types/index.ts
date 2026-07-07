export const CATEGORIES = ['personaje', 'locacion', 'lore', 'capitulo'] as const

/** Un vault agrupa las notas de un mundo/proyecto; cada usuario puede tener varios. */
export interface Vault {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Category = (typeof CATEGORIES)[number]

export interface Note {
  id: string
  category: Category
  title: string
  content: string
  /**
   * Posición del capítulo en la historia; null para las demás categorías.
   * El schema de Etapa 2 no tiene columna que la persista (spec.md §3), así
   * que desde Supabase llega siempre null; se conserva por el listado de
   * capítulos.
   */
  order: number | null
  createdAt: string
  updatedAt: string
}

/** No dirigida: source/target no implican jerarquía ni sentido. */
export interface Connection {
  id: string
  sourceNoteId: string
  targetNoteId: string
  createdAt: string
}
