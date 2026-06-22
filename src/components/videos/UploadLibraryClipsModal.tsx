'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadRawVideoClip } from '@/lib/videos/upload-raw-clip'
import { VIDEO_RAW_BUCKET_MAX_BYTES } from '@/lib/videos/resolve-video-mime'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'
import {
  VehicleInventoryPicker,
  type InventoryPickerRow,
} from '@/components/videos/VehicleInventoryPicker'

interface UploadLibraryClipsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function UploadLibraryClipsModal({ isOpen, onClose, onSaved }: UploadLibraryClipsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inventoryRows, setInventoryRows] = useState<InventoryPickerRow[]>([])
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
      setInventoryRows((data ?? []) as InventoryPickerRow[])
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
