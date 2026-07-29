'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadRawVideoClip } from '@/lib/videos/upload-raw-clip'
import { VIDEO_RAW_BUCKET_MAX_BYTES } from '@/lib/videos/resolve-video-mime'
import { RAW_FULL_VIDEOS_MAX_PER_FOLDER } from '@/lib/videos/raw-full-videos-types'
import {
  VehicleInventoryPicker,
  type InventoryPickerRow,
} from '@/components/videos/VehicleInventoryPicker'

interface UploadFullVideosModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  existingFolder?: { id: string; title: string; videoCount: number } | null
}

export function UploadFullVideosModal({
  isOpen,
  onClose,
  onSaved,
  existingFolder = null,
}: UploadFullVideosModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inventoryRows, setInventoryRows] = useState<InventoryPickerRow[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isAppendMode = !!existingFolder
  const maxAllowed = isAppendMode
    ? Math.max(0, RAW_FULL_VIDEOS_MAX_PER_FOLDER - existingFolder.videoCount)
    : RAW_FULL_VIDEOS_MAX_PER_FOLDER

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
    if (isAppendMode) {
      setLoadingInventory(false)
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
  }, [isOpen, resetForm, isAppendMode])

  function handleFilesChange(list: FileList | null) {
    if (!list?.length) return
    const picked = Array.from(list).filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f.name)
    )
    if (!picked.length) {
      toast.error('Selecciona videos (MP4, MOV, etc.)')
      return
    }
    setFiles((prev) => {
      const merged = [...prev, ...picked]
      if (merged.length > maxAllowed) {
        toast.error(
          isAppendMode
            ? `Puedes agregar hasta ${maxAllowed} video(s) más`
            : `Máximo ${RAW_FULL_VIDEOS_MAX_PER_FOLDER} videos por carpeta`
        )
        return merged.slice(0, maxAllowed)
      }
      return merged
    })
  }

  async function handleSave() {
    if (!isAppendMode && !vehicleId.trim()) {
      toast.error('Selecciona el vehículo del inventario')
      return
    }
    if (!files.length) {
      toast.error('Selecciona al menos un video')
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      let folderId: string
      let uploads: Array<{ path: string; signedUrl: string; token: string }>

      if (isAppendMode && existingFolder) {
        setProgress('Preparando subida…')
        const res = await fetch(`/api/videos/raw-full/library/${existingFolder.id}/videos`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: files.map((f) => ({ filename: f.name, mimeType: f.type })),
          }),
        })
        const data = (await res.json()) as {
          error?: string
          folderId?: string
          uploads?: Array<{ path: string; signedUrl: string; token: string }>
        }
        if (!res.ok || !data.uploads?.length) {
          throw new Error(data.error ?? 'No se pudo preparar la subida')
        }
        folderId = existingFolder.id
        uploads = data.uploads
      } else {
        setProgress('Creando carpeta…')
        const res = await fetch('/api/videos/raw-full/library/create', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory_vehicle_id: vehicleId.trim(),
            files: files.map((f) => ({ filename: f.name, mimeType: f.type })),
          }),
        })
        const data = (await res.json()) as {
          error?: string
          folderId?: string
          uploads?: Array<{ path: string; signedUrl: string; token: string }>
        }
        if (!res.ok || !data.folderId || !data.uploads?.length) {
          throw new Error(data.error ?? 'No se pudo crear la carpeta')
        }
        folderId = data.folderId
        uploads = data.uploads
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const upload = uploads[i]!
        setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`)
        await uploadRawVideoClip(supabase, folderId, upload.path, upload.token, file, {
          onProgress: setProgress,
        })
      }

      setProgress('Registrando videos…')
      const completeRes = await fetch('/api/videos/raw-full/library/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          paths: uploads.map((u) => u.path),
          append: isAppendMode,
        }),
      })
      const completeData = (await completeRes.json()) as { error?: string }
      if (!completeRes.ok) throw new Error(completeData.error ?? 'Error al completar')

      toast.success(isAppendMode ? 'Videos agregados' : 'Carpeta creada')
      onSaved()
      onClose()
    } catch (e) {
      console.error('[UploadFullVideosModal]', e)
      toast.error(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isAppendMode ? 'Agregar videos en bruto' : 'Nueva carpeta de videos en bruto'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Videos ya creados en otra herramienta (enteros). Máx.{' '}
              {(VIDEO_RAW_BUCKET_MAX_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB c/u.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isAppendMode && existingFolder ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              Carpeta: <strong>{existingFolder.title}</strong> · {existingFolder.videoCount} video(s)
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Vehículo
              </label>
              <div className="mt-1.5">
                <VehicleInventoryPicker
                  vehicleId={vehicleId}
                  onSelect={setVehicleId}
                  rows={inventoryRows}
                  loading={loadingInventory}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Videos
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.avi"
              multiple
              className="hidden"
              onChange={(e) => handleFilesChange(e.target.files)}
            />
            <button
              type="button"
              disabled={saving || maxAllowed <= 0}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Elegir archivos
            </button>
            {files.length > 0 ? (
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="truncate font-medium text-gray-800">{f.name}</span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-600 hover:underline shrink-0"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {progress ? (
            <p className="text-xs text-violet-700 font-medium flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progress}
            </p>
          ) : null}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !files.length || (!isAppendMode && !vehicleId.trim())}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAppendMode ? 'Agregar' : 'Crear carpeta'}
          </button>
        </div>
      </div>
    </div>
  )
}
