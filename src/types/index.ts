export const CATEGORIES = ['personaje', 'locacion', 'lore', 'capitulo'] as const

export type Category = (typeof CATEGORIES)[number]

export interface Note {
  id: string
  category: Category
  title: string
  content: string
  /** Posición del capítulo en la historia; null para las demás categorías. */
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

export interface VaultExport {
  version: number
  exportedAt: string
  notes: Note[]
  connections: Connection[]
}
