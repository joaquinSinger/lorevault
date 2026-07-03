import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { updateNote } from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR, CATEGORY_TINTA_TEXT } from '../lib/categories'
import { useVault } from '../state/vault-context'
import { Button } from './Button'
import { Cinta } from './Cinta'
import { Markdown } from './Markdown'

/*
 * Guardado híbrido (decisión de la tarea 5): autoguardado con debounce ~1s
 * tras dejar de tipear, más Ctrl/Cmd+S para forzar el guardado inmediato.
 * Por eso no hay "Cancelar": los cambios ya están persistidos, "Listo"
 * solo vuelve a la vista de lectura.
 */
const AUTOSAVE_DEBOUNCE_MS = 1000

type SaveStatus = 'saved' | 'dirty' | 'saving'
type Tab = 'escribir' | 'preview'

interface Draft {
  title: string
  content: string
}

const TAB_LABELS: Record<Tab, string> = {
  escribir: 'Escribir',
  preview: 'Vista previa',
}

export function NoteEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const { invalidate } = useVault()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tab, setTab] = useState<Tab>('escribir')
  const [status, setStatus] = useState<SaveStatus>('saved')

  // Refs para que flush lea siempre el borrador vigente sin cerrar sobre
  // estado viejo, y para serializar escrituras si se encadenan guardados.
  // draftRef se actualiza en los handlers de cambio, junto con el estado.
  const draftRef = useRef<Draft>({ title: note.title, content: note.content })
  const lastSavedRef = useRef<Draft>({ title: note.title, content: note.content })
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    queueRef.current = queueRef.current.then(async () => {
      const draft = draftRef.current
      const saved = lastSavedRef.current
      if (!draft.title.trim()) {
        return // título requerido: no persistir hasta que vuelva a tener uno
      }
      if (draft.title === saved.title && draft.content === saved.content) {
        setStatus('saved')
        return
      }
      setStatus('saving')
      await updateNote(note.id, { title: draft.title, content: draft.content })
      lastSavedRef.current = draft
      invalidate()
      const current = draftRef.current
      setStatus(
        current.title === draft.title && current.content === draft.content
          ? 'saved'
          : 'dirty',
      )
    })
    return queueRef.current
  }, [note.id, invalidate])

  // Si se desmonta con un guardado pendiente (navegación), lo dispara igual.
  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  function markDirty() {
    setStatus('dirty')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void flush()
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void flush()
    }
  }

  async function handleDone() {
    await flush()
    onDone()
  }

  const titleValid = title.trim().length > 0
  const statusText = !titleValid
    ? 'El título es obligatorio'
    : status === 'saving'
      ? 'Guardando…'
      : status === 'dirty'
        ? 'Sin guardar'
        : 'Guardado'

  return (
    <div onKeyDown={handleKeyDown} className="max-w-[65ch]">
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
            onChange={(e) => {
              setTitle(e.target.value)
              draftRef.current = { ...draftRef.current, title: e.target.value }
              markDirty()
            }}
            className="mt-1 w-full rounded-xs border border-trazo bg-noche px-3 py-1.5 font-serif text-title font-medium"
          />
        </div>
      </header>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div role="tablist" aria-label="Modo del editor" className="flex gap-4">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`border-b-2 pb-1 text-label uppercase transition-colors ${
                tab === t
                  ? 'border-musgo text-pergamino'
                  : 'border-transparent text-sepia hover:text-pergamino'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-sepia italic">
          {statusText}
        </p>
      </div>

      {tab === 'escribir' ? (
        <>
          <label htmlFor="contenido-nota" className="sr-only">
            Contenido
          </label>
          <textarea
            id="contenido-nota"
            rows={16}
            placeholder="Contenido en Markdown…"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              draftRef.current = { ...draftRef.current, content: e.target.value }
              markDirty()
            }}
            className="mt-3 w-full rounded-xs border border-trazo bg-noche px-3 py-2 font-serif text-reading placeholder:font-sans placeholder:text-sm placeholder:text-sepia"
          />
        </>
      ) : (
        <div className="mt-3 min-h-64 rounded-xs border border-trazo px-3 py-2">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-sepia">Nada para previsualizar todavía.</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <Button variant="primary" disabled={!titleValid} onClick={handleDone}>
          Listo
        </Button>
      </div>
    </div>
  )
}
