import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { searchNotesByTitle } from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR } from '../lib/categories'
import { useVault } from '../state/vault-context'
import { Cinta } from './Cinta'

export function SearchBox() {
  const { revision } = useVault()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Note[]>([])

  // searchNotesByTitle ya devuelve [] para query vacía o solo espacios.
  useEffect(() => {
    let cancelled = false
    void searchNotesByTitle(query).then((notes) => {
      if (!cancelled) {
        setResults(notes)
      }
    })
    return () => {
      cancelled = true
    }
  }, [query, revision])

  return (
    <search>
      <label htmlFor="buscador" className="sr-only">
        Buscar notas por título
      </label>
      <input
        id="buscador"
        type="search"
        placeholder="Buscar por título…"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xs border border-trazo bg-noche px-3 py-1.5 text-sm placeholder:text-sepia"
      />
      {query.trim() &&
        (results.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {results.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/nota/${note.id}`}
                  onClick={() => setQuery('')}
                  className="flex items-center gap-2 rounded-xs px-2 py-1 hover:bg-noche"
                >
                  <Cinta category={note.category} />
                  <span className="min-w-0">
                    <span className="block truncate font-serif">{note.title}</span>
                    <span className="block text-label uppercase text-sepia">
                      {CATEGORY_LABELS_SINGULAR[note.category]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 px-2 text-sm text-sepia">Sin resultados.</p>
        ))}
    </search>
  )
}
