'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, ChevronDown, Loader2, Plus, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadRawVideoClip } from '@/lib/videos/upload-raw-clip'
import { VIDEO_RAW_BUCKET_MAX_BYTES } from '@/lib/videos/resolve-video-mime'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'

type InventoryRow = {
  id: string
  brand: string | null
  model: string | null
  year: number | null
  plate: string | null
  version: string | null
}

interface UploadLibraryClipsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function vehiclePrimaryLabel(row: InventoryRow): string {
  const brand = row.brand?.trim() ? toTitleCase(row.brand.trim()) : ''
  const model = row.model?.trim() ? toTitleCase(row.model.trim()) : ''
  const year = row.year != null ? String(row.year) : ''
  return [brand, model, year].filter(Boolean).join(' ') || 'Sin nombre'
}

function vehicleSearchLabel(row: InventoryRow): string {
  const plate = row.plate?.trim().toUpperCase()
  const main = vehiclePrimaryLabel(row)
  return plate ? `${main} · ${plate}` : main
}

function VehicleInventoryPicker({
  rows,
  loading,
  disabled,
  vehicleId,
  onSelect,
}: {
  rows: InventoryRow[]
  loading: boolean
  disabled: boolean
  vehicleId: string
  onSelect: (id: string) => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selected = useMemo(() => rows.find((r) => r.id === vehicleId) ?? null, [rows, vehicleId])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((v) => {
      const haystack = [v.brand, v.model, v.year, v.plate, v.version, v.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [rows, searchTerm])

  useEffect(() => {
    if (!isOpen) return
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (selected && !isOpen) {
      setSearchTerm(vehicleSearchLabel(selected))
    }
  }, [selected, isOpen])

  function pick(row: InventoryRow) {
    onSelect(row.id)
    setSearchTerm(vehicleSearchLabel(row))
    setIsOpen(false)
  }

  function clear() {
    onSelect('')
    setSearchTerm('')
    setIsOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        Cargando inventario…
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex items-center gap-2 mb-2">
        <Car className="h-4 w-4 text-violet-600 shrink-0" />
        <span className="text-xs text-gray-500">{rows.length} vehículos disponibles</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            if (e.target.value.trim() === '') onSelect('')
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar marca, modelo, año o placa…"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {searchTerm ? (
            <button
              type="button"
              disabled={disabled}
              onClick={clear}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen((v) => !v)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Abrir listado"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {selected ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <Car className="h-4 w-4 text-violet-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-violet-950">{vehiclePrimaryLabel(selected)}</p>
            {selected.plate ? (
              <p className="text-xs font-medium text-violet-700/80">{selected.plate.toUpperCase()}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No se encontraron vehículos</p>
          ) : (
            <ul>
              {filtered.slice(0, 80).map((row) => {
                const isSelected = row.id === vehicleId
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(row)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug text-gray-900">
                            {vehiclePrimaryLabel(row)}
                          </p>
                          {row.plate ? (
                            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-gray-700">
                              {row.plate}
                            </span>
                          ) : null}
                        </div>
                        {row.version?.trim() ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                            {toTitleCase(row.version.trim())}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function UploadLibraryClipsModal({ isOpen, onClose, onSaved }: UploadLibraryClipsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setVehicleId('')
    setFiles([])
    setProgress(null)
    setSaving(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      return
    }

    let cancelled = false
    setLoadingInventory(true)
    const supabase = createClient()
    void (async () => {
      const { data, error } = await supabase
        .from('inventoryoracle')
        .select('id, brand, model, year, plate, version')
        .eq('status', 'disponible')
        .order('updated_at', { ascending: false })
        .limit(200)

      if (cancelled) return
      if (error) {
        toast.error('No se pudo cargar el inventario')
        setLoadingInventory(false)
        return
      }
      setInventoryRows((data ?? []) as InventoryRow[])
      setLoadingInventory(false)
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, resetForm])

  function handleFilesChange(list: FileList | null) {
    if (!list?.length) return
    const picked = Array.from(list).filter((f) => f.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f.name))
    if (picked.length === 0) {
      toast.error('Selecciona archivos de video (MP4, MOV, etc.)')
      return
    }
    setFiles((prev) => {
      const merged = [...prev, ...picked]
      if (merged.length > VIDEO_MAX_CLIPS) {
        toast.error(`Máximo ${VIDEO_MAX_CLIPS} clips por carpeta`)
        return merged.slice(0, VIDEO_MAX_CLIPS)
      }
      return merged
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!vehicleId.trim()) {
      toast.error('Selecciona el vehículo del inventario')
      return
    }
    if (files.length === 0) {
      toast.error('Añade al menos un clip de video')
      return
    }

    for (const file of files) {
      if (file.size > VIDEO_RAW_BUCKET_MAX_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(0)
        toast.error(`"${file.name}" supera ${mb} MB (máx. 2 GB por clip)`)
        return
      }
    }

    setSaving(true)
    setProgress('Creando carpeta en biblioteca…')

    try {
      const createRes = await fetch('/api/videos/raw-clips/library/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_vehicle_id: vehicleId.trim(),
          files: files.map((f) => ({
            filename: f.name,
            mimeType: f.type || 'video/mp4',
          })),
        }),
      })

      const createData = (await createRes.json()) as {
        jobId?: string
        uploads?: Array<{ path: string; signedUrl: string; token: string }>
        error?: string
      }

      if (!createRes.ok || !createData.jobId || !createData.uploads?.length) {
        throw new Error(createData.error ?? 'Error preparando la subida')
      }

      const { jobId, uploads } = createData
      const supabase = createClient()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const upload = uploads[i]!
        await uploadRawVideoClip(supabase, jobId, upload.path, upload.token, file, {
          onProgress: (msg) => setProgress(`${i + 1}/${files.length}: ${msg}`),
        })
      }

      setProgress('Guardando carpeta…')
      const completeRes = await fetch('/api/videos/raw-clips/library/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          paths: uploads.map((u) => u.path),
        }),
      })

      const completeData = (await completeRes.json()) as { error?: string }
      if (!completeRes.ok) {
        throw new Error(completeData.error ?? 'Error finalizando la carpeta')
      }

      toast.success(`${files.length} clip(s) guardados en biblioteca`)
      onSaved()
      onClose()
    } catch (err) {
      console.error('[UploadLibraryClipsModal]', err)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar los clips')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-library-clips-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="upload-library-clips-title" className="text-lg font-bold text-gray-900">
              Subir clips a biblioteca
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Elige el vehículo y sube clips en bruto para usarlos después en un Reel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800">
              Vehículo del inventario <span className="text-red-500">*</span>
            </label>
            <VehicleInventoryPicker
              rows={inventoryRows}
              loading={loadingInventory}
              disabled={saving}
              vehicleId={vehicleId}
              onSelect={setVehicleId}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800">
              Clips de video <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.m4v"
              multiple
              disabled={saving}
              className="hidden"
              onChange={(e) => handleFilesChange(e.target.files)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-60"
            >
              <Upload className="h-8 w-8 text-violet-500" />
              <span className="font-medium">Toca para elegir videos</span>
              <span className="text-xs text-gray-400">MP4, MOV, WEBM… · máx. {VIDEO_MAX_CLIPS} clips</span>
            </button>

            {files.length > 0 ? (
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-gray-800">{file.name}</span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Quitar ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {progress ? (
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800">{progress}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !vehicleId || files.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Guardando…' : 'Guardar clips'}
          </button>
        </div>
      </div>
    </div>
  )
}
