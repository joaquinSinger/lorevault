import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { createNote } from '../lib/storage'
import type { Category } from '../types'
import { useActiveVaultId, useVault } from '../state/vault-context'
import { Button } from './Button'

/**
 * Creación de nota desde la página de categoría: la categoría queda fija
 * según la sección, solo se pide el título (requerido). Al crear, navega
 * a la nota para seguir escribiendo ahí.
 */
export function NewNoteForm({ category }: { category: Category }) {
  const { invalidate } = useVault()
  const vaultId = useActiveVaultId()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Nueva nota
      </Button>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || saving) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const note = await createNote({ vaultId, category, title })
      await navigate(`/vaults/${vaultId}/nota/${note.id}`)
      invalidate()
    } catch (err) {
      // En éxito la navegación desmonta el form: solo se reactiva en error.
      setError(err instanceof Error ? err.message : 'No se pudo crear la nota.')
      setSaving(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="titulo-nueva-nota" className="sr-only">
          Título de la nueva nota
        </label>
        <input
          id="titulo-nueva-nota"
          autoFocus
          required
          autoComplete="off"
          placeholder="Título…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-md rounded-xs border border-trazo bg-noche px-3 py-1.5 font-serif placeholder:font-sans placeholder:text-sm placeholder:text-sepia"
        />
        <Button type="submit" variant="primary" disabled={saving}>
          Crear
        </Button>
        <Button
          onClick={() => {
            setOpen(false)
            setTitle('')
            setError(null)
          }}
        >
          Cancelar
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-tinta-personaje">
          {error}
        </p>
      )}
    </div>
  )
}
