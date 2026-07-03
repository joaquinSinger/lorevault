import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteNote, getNoteById, updateNote } from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR, CATEGORY_TINTA_TEXT } from '../lib/categories'
import { useVault } from '../state/vault-context'
import { Button } from '../components/Button'
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

  if (!result.note) {
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

  return <NoteView key={result.note.id} note={result.note} />
}

type Mode = 'view' | 'edit' | 'confirm-delete'

function NoteView({ note }: { note: Note }) {
  const { invalidate } = useVault()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('view')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  function startEditing() {
    setTitle(note.title)
    setContent(note.content)
    setMode('edit')
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || saving) {
      return
    }
    setSaving(true)
    try {
      await updateNote(note.id, { title, content })
      invalidate()
      setMode('view')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (saving) {
      return
    }
    setSaving(true)
    try {
      await deleteNote(note.id)
      await navigate(`/${note.category}`)
      invalidate()
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'edit') {
    return (
      <form onSubmit={handleSave} className="max-w-[65ch]">
        <header className="flex items-start gap-3 border-b border-trazo pb-5">
          <Cinta category={note.category} size="md" />
          <div className="min-w-0 flex-1">
            <p className={`text-label uppercase ${CATEGORY_TINTA_TEXT[note.category]}`}>
              {CATEGORY_LABELS_SINGULAR[note.category]}
            </p>
            <label htmlFor="titulo-nota" className="sr-only">
              Título
            </label>
            <input
              id="titulo-nota"
              required
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xs border border-trazo bg-nogal px-3 py-1.5 font-serif text-title font-medium"
            />
          </div>
        </header>
        {/* Textarea plano por ahora: el editor con preview markdown llega en la tarea 5. */}
        <label htmlFor="contenido-nota" className="sr-only">
          Contenido
        </label>
        <textarea
          id="contenido-nota"
          rows={16}
          placeholder="Contenido en Markdown…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-6 w-full rounded-xs border border-trazo bg-nogal px-3 py-2 font-serif text-reading placeholder:font-sans placeholder:text-sm placeholder:text-sepia"
        />
        <div className="mt-4 flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            Guardar
          </Button>
          <Button onClick={() => setMode('view')}>Cancelar</Button>
        </div>
      </form>
    )
  }

  return (
    <article className="max-w-[65ch]">
      <header className="border-b border-trazo pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cinta category={note.category} size="md" />
            <div>
              <p className={`text-label uppercase ${CATEGORY_TINTA_TEXT[note.category]}`}>
                {CATEGORY_LABELS_SINGULAR[note.category]}
              </p>
              <h1 className="mt-1 font-serif text-title font-medium">{note.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={startEditing}>Editar</Button>
            <Button onClick={() => setMode('confirm-delete')}>Eliminar</Button>
          </div>
        </div>
      </header>

      {mode === 'confirm-delete' && (
        <div className="mt-6 rounded-xs border border-trazo bg-cuero p-4">
          <p className="font-medium">¿Eliminar «{note.title}»?</p>
          <p className="mt-1 text-sm text-sepia">
            Se perderán también todas sus conexiones con otras notas. Esta acción no
            se puede deshacer.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={saving} onClick={handleDelete}>
              Eliminar definitivamente
            </Button>
            <Button onClick={() => setMode('view')}>Cancelar</Button>
          </div>
        </div>
      )}

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
