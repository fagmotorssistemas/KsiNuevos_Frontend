'use client'

import { useCallback, useRef, useState } from 'react'
import { Film, Layers, X, Upload, AlertTriangle } from 'lucide-react'

const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv']
const ALLOWED_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/avi',
  'video/x-msvideo', 'video/webm', 'video/x-matroska',
])
const WARN_SIZE_MB = 500
const CLIP_WARN_SIZE_MB = 200

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isValidVideo(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_MIME.has(file.type) || ALLOWED_EXTENSIONS.includes(ext)
}

export type FlowType = 'single' | 'multiple'

interface VideoUploaderProps {
  flowType: FlowType
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function VideoUploader({ flowType, files, onFilesChange }: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid: File[] = []
    const fileArr = Array.from(newFiles)

    for (const f of fileArr) {
      if (!isValidVideo(f)) continue
      if (flowType === 'single') {
        onFilesChange([f])
        return
      }
      valid.push(f)
    }

    if (flowType === 'multiple') {
      const combined = [...files, ...valid].slice(0, 10)
      onFilesChange(combined)
    }
  }, [flowType, files, onFilesChange])

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const warnThresh = flowType === 'single' ? WARN_SIZE_MB : CLIP_WARN_SIZE_MB

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.avi,.mkv"
          multiple={flowType === 'multiple'}
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files) }}
        />

        <div className="flex flex-col items-center gap-3">
          {flowType === 'single'
            ? <Film className="w-12 h-12 text-gray-300" />
            : <Layers className="w-12 h-12 text-gray-300" />
          }
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {flowType === 'single'
                ? 'Arrastra tu video o haz clic para seleccionar'
                : `Arrastra los clips (${files.length}/10) o haz clic para seleccionar`}
            </p>
            <p className="text-xs text-gray-400 mt-1">mp4, mov, avi, webm, mkv</p>
            <p className="text-xs text-gray-400">
              {flowType === 'single'
                ? 'Máximo 2 GB. Archivos >500 MB se comprimirán automáticamente.'
                : 'Máximo 10 clips. Archivos >200 MB se comprimirán automáticamente.'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Upload className="w-4 h-4" />
            Seleccionar {flowType === 'single' ? 'video' : 'clips'}
          </div>
        </div>
      </div>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const sizeMB = file.size / 1024 / 1024
            const willCompress = sizeMB > warnThresh

            return (
              <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <Film className="w-4 h-4 text-violet-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                {willCompress && (
                  <div className="flex items-center gap-1 text-amber-600 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Se comprimirá</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {flowType === 'multiple' && files.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 text-sm text-violet-600 hover:text-violet-700 font-medium border border-dashed border-violet-300 rounded-xl hover:bg-violet-50 transition-colors"
            >
              + Agregar más clips ({files.length}/10)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
