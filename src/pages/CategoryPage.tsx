import { useParams } from 'react-router'
import { CATEGORY_LABELS, isCategory } from '../lib/categories'
import { Cinta } from '../components/Cinta'
import { NotFoundPage } from './NotFoundPage'

export function CategoryPage() {
  const { category } = useParams()
  if (!category || !isCategory(category)) {
    return <NotFoundPage />
  }
  return (
    <div className="max-w-[65ch]">
      <header className="flex items-start gap-3 border-b border-trazo pb-5">
        <Cinta category={category} size="md" />
        <h1 className="font-serif text-display font-medium">
          {CATEGORY_LABELS[category]}
        </h1>
      </header>
      {/* Placeholder: el listado real de notas llega en la tarea 4. */}
      <p className="mt-6 text-sepia">Todavía no hay notas en esta categoría.</p>
    </div>
  )
}
