'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, ImagePlus, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import type { NoticieroBackgroundItem } from '@/lib/noticiero/backgrounds-storage'

interface NoticieroBackgroundPickerProps {
  value: string | null
  onChange: (publicUrl: string | null) => void
  disabled?: boolean
}

export function NoticieroBackgroundPicker({
  value,
  onChange,
  disabled,
}: NoticieroBackgroundPickerProps) {
  const [backgrounds, setBackgrounds] = useState<NoticieroBackgroundItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadBackgrounds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/noticiero/backgrounds')
      const data = await parseJsonOrThrow<{
        backgrounds?: NoticieroBackgroundItem[]
        error?: string
      }>(res)
      if (!res.ok) throw new Error(data.error ?? 'No se pudieron cargar los fondos')
      setBackgrounds(data.backgrounds ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando fondos')
      setBackgrounds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBackgrounds()
  }, [loadBackgrounds])

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/marketing/noticiero/backgrounds', {
        method: 'POST',
        body: formData,
      })
      const data = await parseJsonOrThrow<{
        background?: NoticieroBackgroundItem
        error?: string
      }>(res)
      if (!res.ok) throw new Error(data.error ?? 'Error al subir el fondo')

      const uploaded = data.background
      if (!uploaded) throw new Error('Respuesta inválida del servidor')

      setBackgrounds((prev) => [uploaded, ...prev.filter((b) => b.path !== uploaded.path)])
      onChange(uploaded.publicUrl)
      toast.success('Fondo subido y seleccionado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error subiendo fondo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const isWhite = value === null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-gray-700">Fondo del noticiero</label>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Subir nuevo fondo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
          Cargando fondos…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className={`relative aspect-video rounded-xl border-2 overflow-hidden transition-all ${
              isWhite
                ? 'border-violet-600 ring-2 ring-violet-500/30'
                : 'border-gray-200 hover:border-violet-300'
            }`}
          >
            <div className="absolute inset-0 bg-white" />
            <span className="absolute bottom-1 left-1 right-1 text-[10px] font-bold text-gray-600 bg-white/90 rounded px-1 py-0.5 text-center">
              Fondo blanco
            </span>
            {isWhite && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </button>

          {backgrounds.map((bg) => {
            const selected = value === bg.publicUrl
            return (
              <button
                key={bg.path}
                type="button"
                disabled={disabled}
                onClick={() => onChange(bg.publicUrl)}
                className={`relative aspect-video rounded-xl border-2 overflow-hidden transition-all ${
                  selected
                    ? 'border-violet-600 ring-2 ring-violet-500/30'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <Image
                  src={bg.publicUrl}
                  alt={bg.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            )
          })}

          {backgrounds.length === 0 && (
            <div className="col-span-full flex items-center gap-2 text-xs text-gray-500 py-2">
              <ImagePlus className="w-4 h-4 shrink-0" />
              Aún no hay fondos guardados. Sube el primero con el botón de arriba.
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        El fondo se aplica al avatar de HeyGen antes de componer el video en Creatomate. Recomendado:
        imágenes horizontales 1280×720 o similar (JPG/PNG/WebP, máx. 8 MB).
      </p>
    </div>
  )
}
