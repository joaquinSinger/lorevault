import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { exportVault, importVault, parseVaultExport } from '../lib/storage'
import type { VaultExport } from '../types'
import { useActiveVaultId, useVault } from '../state/vault-context'
import { Button } from './Button'

interface PendingImport {
  fileName: string
  vault: VaultExport
}

function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Backup manual del vault (spec §4.5): exportar todo a `.json` e importar
 * un backup con reemplazo total. El archivo se valida al elegirlo
 * (parseVaultExport) y la importación solo corre tras confirmar.
 */
export function BackupPanel() {
  const { invalidate } = useVault()
  const vaultId = useActiveVaultId()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    setError(null)
    const vault = await exportVault()
    const blob = new Blob([JSON.stringify(vault, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `lorevault-${vault.exportedAt.slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) {
      return
    }
    setPending(null)
    setError(null)
    try {
      let data: unknown
      try {
        data = JSON.parse(await file.text())
      } catch {
        throw new Error('Archivo inválido: no es un JSON bien formado')
      }
      setPending({ fileName: file.name, vault: parseVaultExport(data) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo')
    }
  }

  async function handleImport() {
    if (!pending || importing) {
      return
    }
    setImporting(true)
    try {
      await importVault(pending.vault)
      setPending(null)
      await navigate(`/vaults/${vaultId}`)
      invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el backup')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section aria-label="Backup del vault">
      <h2 className="mb-3 px-2 text-label uppercase text-sepia">Backup</h2>
      <div className="flex flex-col gap-2">
        <Button onClick={() => void handleExport()}>Exportar vault</Button>
        <Button onClick={() => fileInputRef.current?.click()}>Importar backup…</Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void handleFileSelected(e.target.files?.[0])
          e.target.value = '' // permite re-elegir el mismo archivo
        }}
      />

      {pending && (
        <div className="mt-3 rounded-xs border border-trazo bg-noche p-3 text-sm">
          <p className="font-medium">¿Reemplazar todo el vault?</p>
          <p className="mt-1 text-sepia">
            «{pending.fileName}» contiene {plural(pending.vault.notes.length, 'nota', 'notas')}{' '}
            y {plural(pending.vault.connections.length, 'conexión', 'conexiones')}. Todo el
            contenido actual se perderá; esta acción no se puede deshacer.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="primary" disabled={importing} onClick={() => void handleImport()}>
              Reemplazar todo
            </Button>
            <Button disabled={importing} onClick={() => setPending(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-xs border border-trazo bg-noche p-3 text-sm">
          {error}
        </div>
      )}
    </section>
  )
}
