'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Inbox, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadRawVideoClip } from '@/lib/videos/upload-raw-clip'
import { VIDEO_RAW_BUCKET_MAX_BYTES } from '@/lib/videos/resolve-video-mime'
import {
  MARKETING_INBOX_VIDEOS_BUCKET,
  MARKETING_INBOX_VIDEOS_MAX_PER_BATCH,
} from '@/lib/videos/marketing-inbox-videos-types'

interface UploadInboxVideosModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function UploadInboxVideosModal({ isOpen, onClose, onSaved }: UploadInboxVideosModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setFiles([])
    setProgress(null)
    setSaving(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  function handleClose() {
    if (saving) return
    reset()
    onClose()
  }

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
      if (merged.length > MARKETING_INBOX_VIDEOS_MAX_PER_BATCH) {
        toast.error(`Máximo ${MARKETING_INBOX_VIDEOS_MAX_PER_BATCH} videos por lote`)
        return merged.slice(0, MARKETING_INBOX_VIDEOS_MAX_PER_BATCH)
      }
      return merged
    })
  }

  async function handleUpload() {
    if (!files.length) {
      toast.error('Selecciona al menos un video')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      setProgress('Preparando subida…')
      const res = await fetch('/api/videos/inbox', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({ filename: f.name, mimeType: f.type })),
        }),
      })
      const data = (await res.json()) as {
        error?: string
        uploads?: Array<{ path: string; token: string; originalFilename: string }>
      }
      if (!res.ok || !data.uploads?.length) {
        throw new Error(data.error ?? 'No se pudo preparar la subida')
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const upload = data.uploads[i]!
        setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`)
        await uploadRawVideoClip(supabase, 'inbox', upload.path, upload.token, file, {
          onProgress: setProgress,
          bucket: MARKETING_INBOX_VIDEOS_BUCKET,
        })
      }

      setProgress('Registrando videos…')
      const completeRes = await fetch('/api/videos/inbox', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complete: true,
          items: data.uploads.map((u, i) => ({
            path: u.path,
            originalFilename: u.originalFilename || files[i]?.name || 'video.mp4',
            mimeType: files[i]?.type || null,
            sizeBytes: files[i]?.size ?? null,
          })),
        }),
      })
      const completeData = (await completeRes.json()) as { error?: string }
      if (!completeRes.ok) throw new Error(completeData.error ?? 'Error al completar')

      toast.success(
        files.length === 1 ? 'Video subido a la bandeja' : `${files.length} videos subidos a la bandeja`
      )
      reset()
      onSaved()
      onClose()
    } catch (e) {
      console.error('[UploadInboxVideosModal]', e)
      toast.error(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Subir material general</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sin elegir auto ni sección. Luego clasificas cada video en la bandeja. Máx.{' '}
              {(VIDEO_RAW_BUCKET_MAX_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB c/u.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-[12px] text-violet-900 leading-snug">
            Tira todos los videos aquí. Después, en la pestaña <strong>Bandeja</strong>, asignas a qué
            carro o sección corresponde cada uno.
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Videos</label>
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
              disabled={saving}
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

        <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !files.length}
            onClick={() => void handleUpload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
            Subir a bandeja
          </button>
        </div>
      </div>
    </div>
  )
}
