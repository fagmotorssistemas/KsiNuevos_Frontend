'use client'

import { useRef, useState } from 'react'
import { FileImage, FileText, Film, Paperclip, Upload, X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

function fileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage
  if (type.startsWith('video/')) return Film
  return FileText
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles: number
  maxBytes: number
  onError: (msg: string) => void
}

export function FileDropzone({ files, onChange, maxFiles, maxBytes, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next = [...files]
    for (const f of Array.from(list)) {
      if (next.length >= maxFiles) {
        onError(`Máximo ${maxFiles} archivos`)
        break
      }
      if (f.size > maxBytes) {
        onError(`${f.name} supera el límite permitido`)
        continue
      }
      next.push(f)
    }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={twMerge(
          'cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all',
          dragOver
            ? 'border-violet-500 bg-violet-50/80 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/50 hover:border-violet-400 hover:bg-violet-50/30',
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 mb-3">
          <Upload className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          Arrastra archivos aquí o <span className="text-violet-600">haz clic para buscar</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Imágenes, PDF, Word, Excel o video · hasta {maxFiles} archivos · 25 MB c/u
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,video/mp4,video/quicktime"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => {
            const Icon = fileIcon(f.type)
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(f.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  aria-label="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {files.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Paperclip className="h-3.5 w-3.5" />
          Los adjuntos ayudan mucho al equipo de desarrollo
        </p>
      )}
    </div>
  )
}
