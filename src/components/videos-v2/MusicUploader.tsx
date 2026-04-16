'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, Music, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { MusicTrackV2 } from '@/lib/videos-v2/types'

interface MusicUploaderProps {
  tracks: MusicTrackV2[]
  onTrackAdded: (track: MusicTrackV2) => void
  onTrackDeleted: (id: string) => void
}

export function MusicUploader({ tracks, onTrackAdded, onTrackDeleted }: MusicUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('audio/')) {
      toast.error('Solo se aceptan archivos de audio (mp3, wav, aac)')
      return
    }
    setSelectedFile(file)
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!selectedFile || !name.trim()) {
      toast.error('Selecciona un archivo y escribe el nombre del track')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', name.trim())

      const res = await fetch('/api/videos-v2/music', { method: 'POST', body: formData })
      const data = (await res.json()) as { track?: MusicTrackV2; error?: string }

      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')

      toast.success(`Track "${name}" subido correctamente`)
      onTrackAdded(data.track!)
      setSelectedFile(null)
      setName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error subiendo el track')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(track: MusicTrackV2) {
    const res = await fetch(`/api/videos-v2/music?id=${track.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Track "${track.name}" desactivado`)
      onTrackDeleted(track.id)
    } else {
      toast.error('Error desactivando el track')
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/aac"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
            </div>
          ) : (
            <>
              <Music className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Arrastra un MP3 o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">mp3, wav, aac</p>
            </>
          )}
        </div>

        {selectedFile && (
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del track..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir
            </button>
          </div>
        )}
      </div>

      {/* Lista de tracks */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Tracks disponibles</h4>
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Music className="w-4 h-4 text-violet-600 shrink-0" />
              <span className="flex-1 text-sm text-gray-700 truncate">{track.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(track)}
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
