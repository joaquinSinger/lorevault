import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  createConnection,
  deleteConnection,
  getConnectionsByNoteId,
  getNoteById,
  searchNotesByTitle,
} from '../lib/storage'
import type { Note } from '../types'
import { CATEGORY_LABELS_SINGULAR } from '../lib/categories'
import { useActiveVaultId, useVault } from '../state/vault-context'
import { Cinta } from './Cinta'

/** Conexión resuelta al otro extremo, lista para renderizar. */
interface ConnectedNote {
  connectionId: string
  note: Note
}

/**
 * Marginalia derecha del "códice abierto": lista las notas conectadas
 * (bidireccional, la conexión se ve desde ambos lados) y permite conectar
 * otra nota buscándola por título, o quitar una conexión sin borrar notas.
 */
export function ConnectionsPanel({ note }: { note: Note }) {
  const { revision, invalidate } = useVault()
  const vaultId = useActiveVaultId()
  const [connected, setConnected] = useState<ConnectedNote[] | null>(null)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const connections = await getConnectionsByNoteId(note.id)
      const resolved = await Promise.all(
        connections.map(async (connection) => {
          const otherId =
            connection.sourceNoteId === note.id
              ? connection.targetNoteId
              : connection.sourceNoteId
          const other = await getNoteById(otherId)
          return other ? { connectionId: connection.id, note: other } : null
        }),
      )
      if (!cancelled) {
        setConnected(
          resolved
            .filter((item): item is ConnectedNote => item !== null)
            .sort((a, b) => a.note.title.localeCompare(b.note.title, 'es')),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [note.id, revision])

  // searchNotesByTitle ya devuelve [] para query vacía o solo espacios.
  useEffect(() => {
    let cancelled = false
    void searchNotesByTitle(vaultId, query).then((notes) => {
      if (!cancelled) {
        setCandidates(notes)
      }
    })
    return () => {
      cancelled = true
    }
  }, [vaultId, query, revision])

  const connectedIds = new Set(connected?.map((item) => item.note.id))
  const selectable = candidates.filter(
    (candidate) => candidate.id !== note.id && !connectedIds.has(candidate.id),
  )

  async function handleConnect(targetNoteId: string) {
    try {
      await createConnection(vaultId, note.id, targetNoteId)
      setQuery('')
      setError(null)
      invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la conexión')
    }
  }

  async function handleRemove(connectionId: string) {
    await deleteConnection(connectionId)
    invalidate()
  }

  return (
    <aside
      aria-label="Conexiones de la nota"
      className="border-t border-trazo pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
    >
      <h2 className="text-label uppercase text-sepia">Conexiones</h2>

      {connected === null ? null : connected.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {connected.map(({ connectionId, note: other }) => (
            <li key={connectionId} className="flex items-center gap-2">
              <Cinta category={other.category} />
              <Link
                to={`/vaults/${vaultId}/nota/${other.id}`}
                className="min-w-0 flex-1 rounded-xs px-1 py-0.5 hover:bg-pizarra"
              >
                <span className="block truncate font-serif">{other.title}</span>
                <span className="block text-label uppercase text-sepia">
                  {CATEGORY_LABELS_SINGULAR[other.category]}
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Quitar conexión con «${other.title}»`}
                title="Quitar conexión"
                onClick={() => void handleRemove(connectionId)}
                className="shrink-0 rounded-xs px-1.5 text-sepia hover:text-pergamino"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-sepia">Sin conexiones todavía.</p>
      )}

      <div className="mt-5">
        <label htmlFor="conectar-nota" className="sr-only">
          Conectar con otra nota
        </label>
        <input
          id="conectar-nota"
          type="search"
          placeholder="Conectar con…"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          className="w-full rounded-xs border border-trazo bg-noche px-3 py-1.5 text-sm placeholder:text-sepia"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-tinta-personaje">
            {error}
          </p>
        )}
        {query.trim() &&
          (selectable.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {selectable.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => void handleConnect(candidate.id)}
                    className="flex w-full items-center gap-2 rounded-xs px-2 py-1 text-left hover:bg-pizarra"
                  >
                    <Cinta category={candidate.category} />
                    <span className="min-w-0">
                      <span className="block truncate font-serif">{candidate.title}</span>
                      <span className="block text-label uppercase text-sepia">
                        {CATEGORY_LABELS_SINGULAR[candidate.category]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 px-2 text-sm text-sepia">Sin notas para conectar.</p>
          ))}
      </div>
    </aside>
  )
}
