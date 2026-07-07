import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { createVault, deleteVault, getVaults, renameVault } from '../lib/storage'
import type { Vault } from '../types'
import { Button } from '../components/Button'
import { SessionPanel } from '../components/SessionPanel'

/**
 * Selección de vault: paso obligatorio post-login (spec.md §6). Además de
 * elegir o crear un vault, es el único lugar donde se renombra o elimina.
 * Usa los mismos tokens que el resto del vault — no es un "área de cuenta"
 * con estética propia.
 */
export function VaultsPage() {
  const [vaults, setVaults] = useState<Vault[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getVaults()
      .then((list) => {
        if (!cancelled) {
          setVaults(list)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudieron cargar los vaults.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-12">
      <p className="mb-8 text-center font-serif text-3xl font-medium">LoreVault</p>

      <section className="rounded-xs border border-trazo bg-pizarra p-8">
        <h1 className="font-serif text-2xl">Tus vaults</h1>
        <p className="mt-1 text-sm text-sepia">
          Cada vault es un mundo aparte. Elegí uno para abrir sus notas, o creá uno nuevo.
        </p>

        {loadError ? (
          <div className="mt-6 space-y-3">
            <div role="alert" className="rounded-xs border border-trazo bg-noche p-3 text-sm">
              {loadError}
            </div>
            <Button
              onClick={() => {
                setLoadError(null)
                setAttempt((n) => n + 1)
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : vaults === null ? (
          <p className="mt-6 text-sm text-sepia">Cargando…</p>
        ) : (
          <>
            {vaults.length === 0 ? (
              <p className="mt-6 text-sepia">
                Todavía no tenés ningún vault. Creá el primero para empezar a escribir.
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-trazo border-y border-trazo">
                {vaults.map((vault) => (
                  <VaultRow
                    key={vault.id}
                    vault={vault}
                    onRenamed={(renamed) =>
                      setVaults((list) =>
                        (list ?? []).map((v) => (v.id === renamed.id ? renamed : v)),
                      )
                    }
                    onDeleted={(id) =>
                      setVaults((list) => (list ?? []).filter((v) => v.id !== id))
                    }
                  />
                ))}
              </ul>
            )}
            <div className="mt-6">
              <NewVaultForm />
            </div>
          </>
        )}
      </section>

      <div className="mt-auto pt-8">
        <SessionPanel />
      </div>
    </main>
  )
}

const dateFormatter = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

type RowMode = 'view' | 'rename' | 'confirm-delete'

function VaultRow({
  vault,
  onRenamed,
  onDeleted,
}: {
  vault: Vault
  onRenamed: (vault: Vault) => void
  onDeleted: (id: string) => void
}) {
  const [mode, setMode] = useState<RowMode>('view')
  const [name, setName] = useState(vault.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function backToView() {
    setMode('view')
    setName(vault.name)
    setError(null)
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      onRenamed(await renameVault(vault.id, name))
      setMode('view')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar el vault.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteVault(vault.id)
      onDeleted(vault.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el vault.')
      setBusy(false)
    }
  }

  return (
    <li className="py-3">
      {mode === 'rename' ? (
        <form onSubmit={handleRename} className="flex items-center gap-2">
          <label htmlFor={`renombrar-${vault.id}`} className="sr-only">
            Nuevo nombre del vault
          </label>
          <input
            id={`renombrar-${vault.id}`}
            autoFocus
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full min-w-0 rounded-xs border border-trazo bg-noche px-3 py-1.5 font-serif"
          />
          <Button type="submit" variant="primary" disabled={busy}>
            Guardar
          </Button>
          <Button onClick={backToView}>Cancelar</Button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <Link to={`/vaults/${vault.id}`} className="group min-w-0 flex-1">
            <span className="block truncate font-serif text-xl group-hover:text-musgo">
              {vault.name}
            </span>
            <span className="block text-sm text-sepia">
              Actualizado el {dateFormatter.format(new Date(vault.updatedAt))}
            </span>
          </Link>
          <div className="flex shrink-0 gap-3 text-sm">
            <button
              type="button"
              onClick={() => setMode('rename')}
              className="text-sepia hover:text-pergamino"
            >
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => setMode('confirm-delete')}
              className="text-sepia hover:text-pergamino"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="mt-3 rounded-xs border border-trazo bg-noche p-4">
          <p className="font-medium">¿Eliminar «{vault.name}»?</p>
          <p className="mt-1 text-sm text-sepia">
            Se perderán todas sus notas, conexiones y tags. Esta acción no se puede
            deshacer.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={busy} onClick={handleDelete}>
              Eliminar definitivamente
            </Button>
            <Button onClick={backToView}>Cancelar</Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-sepia">
          {error}
        </p>
      )}
    </li>
  )
}

function NewVaultForm() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Nuevo vault
      </Button>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || saving) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Crear implica entrar: el vault nuevo pasa a ser el activo.
      const vault = await createVault(name)
      await navigate(`/vaults/${vault.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el vault.')
      setSaving(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="nombre-nuevo-vault" className="sr-only">
          Nombre del nuevo vault
        </label>
        <input
          id="nombre-nuevo-vault"
          autoFocus
          required
          autoComplete="off"
          placeholder="Nombre del mundo…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full min-w-0 rounded-xs border border-trazo bg-noche px-3 py-1.5 font-serif placeholder:font-sans placeholder:text-sm placeholder:text-sepia"
        />
        <Button type="submit" variant="primary" disabled={saving}>
          Crear
        </Button>
        <Button
          onClick={() => {
            setOpen(false)
            setName('')
            setError(null)
          }}
        >
          Cancelar
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-sepia">
          {error}
        </p>
      )}
    </div>
  )
}
