import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getNoteById } from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR, CATEGORY_TINTA_TEXT } from '../lib/categories'
import { useVault } from '../state/vault-context'
import { Cinta } from '../components/Cinta'
import { NotFoundPage } from './NotFoundPage'

/** `key` guarda el id consultado para distinguir "cargando" de "no existe". */
interface LookupResult {
  key: string
  note: Note | null
}

export function NotePage() {
  const { id } = useParams()
  const { revision } = useVault()
  const [result, setResult] = useState<LookupResult | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }
    let cancelled = false
    void getNoteById(id).then((note) => {
      if (!cancelled) {
        setResult({ key: id, note: note ?? null })
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, revision])

  if (!id) {
    return <NotFoundPage />
  }

  if (!result || result.key !== id) {
    return null // cargando
  }

  const note = result.note
  if (!note) {
    return (
      <div className="max-w-[65ch]">
        <h1 className="font-serif text-display font-medium">Nota no encontrada</h1>
        <p className="mt-4 text-sepia">Puede que haya sido eliminada del vault.</p>
        <Link to="/" className="mt-6 inline-block text-laton hover:underline">
          Volver al vault
        </Link>
      </div>
    )
  }

  return (
    <article className="max-w-[65ch]">
      <header className="flex items-start gap-3 border-b border-trazo pb-5">
        <Cinta category={note.category} size="md" />
        <div>
          <p className={`text-label uppercase ${CATEGORY_TINTA_TEXT[note.category]}`}>
            {CATEGORY_LABELS_SINGULAR[note.category]}
          </p>
          <h1 className="mt-1 font-serif text-title font-medium">{note.title}</h1>
        </div>
      </header>
      {/* Placeholder: el editor con preview markdown llega en la tarea 5. */}
      {note.content ? (
        <div className="mt-6 whitespace-pre-wrap font-serif text-reading">
          {note.content}
        </div>
      ) : (
        <p className="mt-6 text-sepia">Esta nota todavía no tiene contenido.</p>
      )}
    </article>
  )
}
