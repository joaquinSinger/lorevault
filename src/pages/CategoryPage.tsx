import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getNotesByCategory } from '../lib/storage'
import type { Category, Note } from '../types'
import { CATEGORY_LABELS, isCategory } from '../lib/categories'
import { useActiveVaultId, useVault } from '../state/vault-context'
import { Cinta } from '../components/Cinta'
import { LoadError } from '../components/LoadError'
import { NewNoteForm } from '../components/NewNoteForm'
import { NotFoundPage } from './NotFoundPage'

export function CategoryPage() {
  const { category } = useParams()
  if (!category || !isCategory(category)) {
    return <NotFoundPage />
  }
  // key: al cambiar de categoría se descarta el estado (form abierto, listado).
  return <CategoryView key={category} category={category} />
}

/* Los capítulos se ordenan por `order` (sin orden asignado van al final); las demás categorías, alfabéticamente. */
function sortNotes(category: Category, notes: Note[]): Note[] {
  if (category === 'capitulo') {
    return [...notes].sort((a, b) => {
      if (a.order !== b.order) {
        return (a.order ?? Infinity) - (b.order ?? Infinity)
      }
      return a.createdAt.localeCompare(b.createdAt)
    })
  }
  return [...notes].sort((a, b) => a.title.localeCompare(b.title, 'es'))
}

const dateFormatter = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function CategoryView({ category }: { category: Category }) {
  const { revision } = useVault()
  const vaultId = useActiveVaultId()
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getNotesByCategory(vaultId, category)
      .then((list) => {
        if (!cancelled) {
          setNotes(sortNotes(category, list))
          setLoadError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudieron cargar las notas.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [vaultId, category, revision, attempt])

  return (
    <div className="max-w-[65ch]">
      <header className="flex items-start gap-3 border-b border-trazo pb-5">
        <Cinta category={category} size="md" />
        <h1 className="font-serif text-display font-medium">
          {CATEGORY_LABELS[category]}
        </h1>
      </header>

      <div className="mt-6">
        <NewNoteForm category={category} />
      </div>

      {loadError ? (
        <div className="mt-8">
          <LoadError
            message={loadError}
            onRetry={() => {
              setLoadError(null)
              setAttempt((n) => n + 1)
            }}
          />
        </div>
      ) : notes === null ? (
        <p className="mt-8 text-sm text-sepia">Cargando…</p>
      ) : notes.length === 0 ? (
        <p className="mt-8 text-sepia">Todavía no hay notas en esta categoría.</p>
      ) : (
        <ul className="mt-6 divide-y divide-trazo border-t border-trazo">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/vaults/${vaultId}/nota/${note.id}`}
                className="group flex items-baseline justify-between gap-4 py-3"
              >
                <span className="min-w-0 truncate font-serif text-xl group-hover:text-musgo">
                  {note.title}
                </span>
                <span className="shrink-0 text-sm text-sepia">
                  {dateFormatter.format(new Date(note.updatedAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
