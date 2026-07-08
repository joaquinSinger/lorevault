import { useEffect, useState, type KeyboardEvent } from 'react'
import {
  addTagToNote,
  createTag,
  getTagsByNoteId,
  getTagsByVaultId,
  removeTagFromNote,
} from '../lib/storage'
import type { Note, Tag } from '../types'
import { useActiveVaultId } from '../state/vault-context'
import { LoadError } from './LoadError'

/** Minúsculas y sin diacríticos: "Antagonista" y "antagonista" comparan igual. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Tags de la nota. En modo lectura son solo chips; con `editable` suma el
 * selector de la tarea 7: autocompletar sobre los tags existentes del vault
 * y creación al vuelo cuando el nombre no existe. Asociar/quitar un tag
 * persiste al instante (como las conexiones), no pasa por el autoguardado
 * del borrador. Chips neutros con pizarra/trazo/sepia: el color de tags
 * queda reservado para el grafo de Etapa 3.
 */
export function NoteTags({ note, editable = false }: { note: Note; editable?: boolean }) {
  const vaultId = useActiveVaultId()
  const [noteTags, setNoteTags] = useState<Tag[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vaultTags, setVaultTags] = useState<Tag[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Contador local: alcanza porque nadie más muestra tags fuera de esta nota.
  // También sirve de "reintentar": incrementarlo re-dispara ambos fetch.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    getTagsByNoteId(note.id)
      .then((tags) => {
        if (!cancelled) {
          setNoteTags(tags)
          setLoadError(null)
        }
      })
      .catch((err: unknown) => {
        // Solo se muestra en modo edición y si aún no hay lista (ver render);
        // en modo lectura los chips simplemente no aparecen.
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudieron cargar los tags.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [note.id, version])

  useEffect(() => {
    if (!editable) {
      return
    }
    let cancelled = false
    getTagsByVaultId(vaultId)
      .then((tags) => {
        if (!cancelled) {
          setVaultTags(tags)
        }
      })
      // Falla silenciosa: sin esta lista solo se degrada el autocompletar; si
      // el usuario intenta crear un duplicado, unique_tag_per_vault lo avisa.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [vaultId, editable, version])

  if (!editable) {
    if (!noteTags || noteTags.length === 0) {
      return null
    }
    return (
      <ul aria-label="Tags de la nota" className="mt-4 flex flex-wrap gap-2">
        {noteTags.map((tag) => (
          <li key={tag.id} className={CHIP_CLASS}>
            {tag.name}
          </li>
        ))}
      </ul>
    )
  }

  const q = normalize(query.trim())
  const noteTagIds = new Set(noteTags?.map((tag) => tag.id))
  const suggestions = q
    ? vaultTags.filter(
        (tag) => !noteTagIds.has(tag.id) && normalize(tag.name).includes(q),
      )
    : []
  // Crear al vuelo solo si el nombre no existe todavía en el vault (con o sin
  // mayúsculas/tildes): unique_tag_per_vault rechazaría el duplicado exacto.
  const canCreate = q !== '' && !vaultTags.some((tag) => normalize(tag.name) === q)

  async function mutate(action: () => Promise<void>) {
    if (busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await action()
      setQuery('')
      setVersion((v) => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar los tags')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(tagId: string) {
    await mutate(() => addTagToNote(note.id, tagId))
  }

  async function handleCreate() {
    await mutate(async () => {
      const tag = await createTag(vaultId, query)
      await addTagToNote(note.id, tag.id)
    })
  }

  async function handleRemove(tagId: string) {
    await mutate(() => removeTagFromNote(note.id, tagId))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    // Enter elige el match exacto si existe; si no, crea el tag nuevo.
    const exact = suggestions.find((tag) => normalize(tag.name) === q)
    if (exact) {
      void handleAdd(exact.id)
    } else if (canCreate) {
      void handleCreate()
    }
  }

  return (
    <section aria-label="Tags de la nota">
      <h2 className="text-label uppercase text-sepia">Tags</h2>

      {noteTags === null && loadError ? (
        <div className="mt-3">
          <LoadError
            message={loadError}
            onRetry={() => {
              setLoadError(null)
              setVersion((v) => v + 1)
            }}
          />
        </div>
      ) : noteTags === null ? (
        <p className="mt-3 text-sm text-sepia">Cargando…</p>
      ) : noteTags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {noteTags.map((tag) => (
            <li key={tag.id} className={`${CHIP_CLASS} flex items-center gap-1.5`}>
              {tag.name}
              <button
                type="button"
                aria-label={`Quitar tag «${tag.name}»`}
                title="Quitar tag"
                disabled={busy}
                onClick={() => void handleRemove(tag.id)}
                className="text-sepia hover:text-pergamino disabled:opacity-60"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-sepia">Sin tags todavía.</p>
      )}

      <div className="mt-3">
        <label htmlFor="agregar-tag" className="sr-only">
          Agregar tag
        </label>
        <input
          id="agregar-tag"
          type="search"
          placeholder="Agregar tag…"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xs border border-trazo bg-noche px-3 py-1.5 text-sm placeholder:text-sepia"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-tinta-personaje">
            {error}
          </p>
        )}
        {(suggestions.length > 0 || canCreate) && (
          <ul className="mt-2 space-y-1">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAdd(tag.id)}
                  className="w-full rounded-xs px-2 py-1 text-left text-sm hover:bg-pizarra disabled:opacity-60"
                >
                  {tag.name}
                </button>
              </li>
            ))}
            {canCreate && (
              <li>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCreate()}
                  className="w-full rounded-xs px-2 py-1 text-left text-sm text-musgo hover:bg-pizarra disabled:opacity-60"
                >
                  Crear tag «{query.trim()}»
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  )
}

const CHIP_CLASS =
  'rounded-xs border border-trazo bg-pizarra px-2 py-0.5 text-sm text-sepia'
