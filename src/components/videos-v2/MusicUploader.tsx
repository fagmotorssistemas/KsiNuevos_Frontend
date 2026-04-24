'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2, Music, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MusicTrackV2 } from '@/lib/videos-v2/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

interface MusicUploaderProps {
  tracks: MusicTrackV2[]
  onTrackAdded: (track: MusicTrackV2) => void
  onTrackDeleted: (id: string) => void
}

type PendingItem = {
  id: string
  file: File
  name: string
}

const ACCEPT_INPUT = '.mp3,.wav,.aac,.m4a,.mpeg,audio/*,application/octet-stream'

function defaultNameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, '')
}

function isLikelyAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  const n = file.name.toLowerCase()
  return /\.(mp3|wav|aac|m4a|mpeg)$/i.test(n)
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function MusicUploader({ tracks, onTrackAdded, onTrackDeleted }: MusicUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [uploadLabel, setUploadLabel] = useState<string | null>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    const accepted = list.filter(isLikelyAudioFile)
    const rejected = list.length - accepted.length
    if (rejected > 0) {
      toast.error(`${rejected} archivo(s) omitidos (no parecen audio mp3/wav/aac/m4a)`)
    }
    if (accepted.length === 0) {
      toast.error('No hay archivos de audio válidos')
      return
    }
    setPendingItems((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: makeId(),
        file,
        name: defaultNameFromFile(file),
      })),
    ])
  }, [])

  async function uploadOne(item: PendingItem): Promise<void> {
    const formData = new FormData()
    formData.append('file', item.file)
    formData.append('name', item.name.trim())

    const res = await fetch('/api/videos-v2/music', { method: 'POST', body: formData })
    const data = await parseJsonOrThrow<{ track?: MusicTrackV2; error?: string }>(res)

    if (!res.ok) {
      throw new Error(data.error ?? `Error HTTP ${res.status}`)
    }
    if (!data.track) {
      throw new Error('Respuesta sin track')
    }
    onTrackAdded(data.track)
  }

  async function handleUploadAll() {
    const toUpload = pendingItems.filter((p) => p.name.trim())
    if (toUpload.length === 0) {
      toast.error('Añade archivos y escribe un nombre para cada track')
      return
    }

    setIsUploading(true)
    let ok = 0
    let fail = 0
    const failedNames: string[] = []

    try {
      for (let i = 0; i < toUpload.length; i++) {
        const item = toUpload[i]!
        setUploadLabel(`${i + 1}/${toUpload.length}: ${item.name}`)
        try {
          await uploadOne(item)
          ok++
          setPendingItems((prev) => prev.filter((p) => p.id !== item.id))
        } catch (err) {
          fail++
          failedNames.push(item.name)
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[MusicUploader]', item.name, msg)
        }
      }

      if (ok > 0) {
        toast.success(ok === 1 ? '1 track subido' : `${ok} tracks subidos`)
      }
      if (fail > 0) {
        toast.error(
          `${fail} no se pudieron subir${failedNames.length ? `: ${failedNames.slice(0, 3).join(', ')}${failedNames.length > 3 ? '…' : ''}` : ''}`
        )
      }
    } finally {
      setUploadLabel(null)
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(track: MusicTrackV2) {
    try {
      const res = await fetch(`/api/videos-v2/music?id=${track.id}`, { method: 'DELETE' })
      const data = await parseJsonOrThrow<{ success?: boolean; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (data.success) {
        toast.success(`Track "${track.name}" desactivado`)
        onTrackDeleted(track.id)
      } else {
        toast.error('Error desactivando el track')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desactivando el track')
    }
  }

  function removePending(id: string) {
    setPendingItems((prev) => prev.filter((p) => p.id !== id))
  }

  function updatePendingName(id: string, name: string) {
    setPendingItems((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_INPUT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
            }}
          />
          <Music className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Arrastra varios MP3/WAV o haz clic para seleccionar muchos a la vez</p>
          <p className="text-xs text-gray-400 mt-1">mp3, wav, aac, m4a · sin límite artificial de duración en el servidor</p>
        </div>

        {pendingItems.length > 0 && (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-600">
                Pendientes ({pendingItems.length})
              </span>
              <button
                type="button"
                onClick={() => setPendingItems([])}
                disabled={isUploading}
                className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-40"
              >
                Quitar todos
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto space-y-2">
              {pendingItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updatePendingName(item.id, e.target.value)}
                    placeholder="Nombre…"
                    disabled={isUploading}
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-xs text-gray-400 truncate max-w-[100px]" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePending(item.id)}
                    disabled={isUploading}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-40"
                    title="Quitar de la cola"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void handleUploadAll()}
              disabled={isUploading || pendingItems.every((p) => !p.name.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? (uploadLabel ?? 'Subiendo…') : `Subir ${pendingItems.length} track(s)`}
            </button>
          </div>
        )}
      </div>

      {tracks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Tracks disponibles</h4>
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Music className="w-4 h-4 text-violet-600 shrink-0" />
              <span className="flex-1 text-sm text-gray-700 truncate">{track.name}</span>
              <button
                type="button"
                onClick={() => void handleDelete(track)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Desactivar track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
