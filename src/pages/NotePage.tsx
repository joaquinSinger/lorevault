import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteNote, getNoteById } from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR, CATEGORY_TINTA_TEXT } from '../lib/categories'
import { useActiveVaultId, useVault } from '../state/vault-context'
import { Button } from '../components/Button'
import { Cinta } from '../components/Cinta'
import { ConnectionsPanel } from '../components/ConnectionsPanel'
import { Markdown } from '../components/Markdown'
import { LoadError } from '../components/LoadError'
import { NoteEditor } from '../components/NoteEditor'
import { NoteTags } from '../components/NoteTags'
import { NotFoundPage } from './NotFoundPage'

/** `key` guarda el id consultado para distinguir "cargando" de "no existe" o "falló". */
type LookupResult =
  | { key: string; status: 'loaded'; note: Note | null }
  | { key: string; status: 'error'; message: string }

export function NotePage() {
  const { id } = useParams()
  const { revision } = useVault()
  const vaultId = useActiveVaultId()
  const [result, setResult] = useState<LookupResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!id) {
      return
    }
    let cancelled = false
    getNoteById(id)
      .then((note) => {
        if (!cancelled) {
          setResult({ key: id, status: 'loaded', note: note ?? null })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        // Si la nota ya está en pantalla y falló un refetch (por `revision`),
        // se conserva lo cargado en vez de desmontar el lector/editor.
        setResult((prev) =>
          prev?.key === id && prev.status === 'loaded'
            ? prev
            : {
                key: id,
                status: 'error',
                message:
                  err instanceof Error ? err.message : 'No se pudo cargar la nota.',
              },
        )
      })
    return () => {
      cancelled = true
    }
  }, [id, revision, attempt])

  if (!id) {
    return <NotFoundPage />
  }

  if (!result || result.key !== id) {
    return <p className="text-sm text-sepia">Cargando…</p>
  }

  if (result.status === 'error') {
    return (
      <div className="max-w-[65ch]">
        <LoadError
          message={result.message}
          onRetry={() => {
            setResult(null)
            setAttempt((n) => n + 1)
          }}
        />
      </div>
    )
  }

  if (!result.note) {
    return (
      <div className="max-w-[65ch]">
        <h1 className="font-serif text-display font-medium">Nota no encontrada</h1>
        <p className="mt-4 text-sepia">Puede que haya sido eliminada del vault.</p>
        <Link
          to={`/vaults/${vaultId}`}
          className="mt-6 inline-block text-musgo hover:underline"
        >
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
  const vaultId = useActiveVaultId()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('view')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (deleting) {
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteNote(note.id)
      await navigate(`/vaults/${vaultId}/${note.category}`)
      invalidate()
    } catch (err) {
      // En éxito la navegación desmonta la página: solo se reactiva en error.
      setDeleteError(
        err instanceof Error ? err.message : 'No se pudo eliminar la nota.',
      )
      setDeleting(false)
    }
  }

  // Layout "códice abierto": columna de lectura + marginalia derecha con
  // las conexiones, visible también durante la edición.
  return (
    <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,65ch)_16rem]">
      <div className="min-w-0">
        {mode === 'edit' ? (
          <NoteEditor note={note} onDone={() => setMode('view')} />
        ) : (
          <NoteReader
            note={note}
            mode={mode}
            deleting={deleting}
            deleteError={deleteError}
            onEdit={() => setMode('edit')}
            onAskDelete={() => setMode('confirm-delete')}
            onCancelDelete={() => {
              setMode('view')
              setDeleteError(null)
            }}
            onDelete={handleDelete}
          />
        )}
      </div>
      <ConnectionsPanel note={note} />
    </div>
  )
}

function NoteReader({
  note,
  mode,
  deleting,
  deleteError,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  note: Note
  mode: Mode
  deleting: boolean
  deleteError: string | null
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
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
            <Button onClick={onEdit}>Editar</Button>
            <Button onClick={onAskDelete}>Eliminar</Button>
          </div>
        </div>
      </header>

      <NoteTags note={note} />

      {mode === 'confirm-delete' && (
        <div className="mt-6 rounded-xs border border-trazo bg-pizarra p-4">
          <p className="font-medium">¿Eliminar «{note.title}»?</p>
          <p className="mt-1 text-sm text-sepia">
            Se perderán también todas sus conexiones con otras notas. Esta acción no
            se puede deshacer.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={deleting} onClick={onDelete}>
              {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
            <Button disabled={deleting} onClick={onCancelDelete}>
              Cancelar
            </Button>
          </div>
          {deleteError && (
            <p role="alert" className="mt-3 text-sm text-tinta-personaje">
              {deleteError}
            </p>
          )}
        </div>
      )}

      {note.content.trim() ? (
        <div className="mt-6">
          <Markdown>{note.content}</Markdown>
        </div>
      ) : (
        <p className="mt-6 text-sepia">Esta nota todavía no tiene contenido.</p>
      )}
    </article>
  )
}
