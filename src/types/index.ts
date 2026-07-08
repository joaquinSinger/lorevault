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
   * Posición del capítulo en la historia; null = sin orden asignado (va al
   * final del listado) y null siempre para las demás categorías. Persiste en
   * la columna `sort_order` de Postgres (spec.md §3) — el mapeo de nombre es
   * responsabilidad de notes.ts.
   */
  order: number | null
  createdAt: string
  updatedAt: string
}

/**
 * Tag personalizado, scopeado por vault (unique_tag_per_vault). La columna
 * `color` existe en la tabla pero no se consume en Etapa 2 (reservada para el
 * grafo de Etapa 3), por eso no aparece en el dominio todavía.
 */
export interface Tag {
  id: string
  name: string
  createdAt: string
}

/** No dirigida: source/target no implican jerarquía ni sentido. */
export interface Connection {
  id: string
  sourceNoteId: string
  targetNoteId: string
  createdAt: string
}
