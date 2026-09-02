'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type VehicleCreativeItem = {
  id: string
  vehicleId: string
  creativeKind: string
  variant: string
  status: string
  errorMessage: string | null
  imageUrl: string | null
  images: string[]
  createdAt: string
  updatedAt: string
  kindLabel: string
  variantLabel: string
}

type GalleryImage = {
  url: string
  title: string
  subtitle: string
  status: string
  creativeId: string
  imageIndex: number
  filename: string
}

function statusLabel(status: string) {
  if (status === 'ready') return 'Lista'
  if (status === 'generating' || status === 'pending') return 'Generando'
  if (status === 'failed') return 'Fallida'
  return status
}

function variantAccent(variant: string) {
  const key = variant.toLowerCase()
  if (key.includes('suv')) return 'from-cyan-500/80 to-sky-700/90'
  if (key.includes('sedan') || key.includes('sedán')) return 'from-violet-500/80 to-fuchsia-700/90'
  if (key.includes('pickup')) return 'from-amber-500/80 to-orange-700/90'
  return 'from-violet-500/80 to-slate-800/90'
}

function fileNameFor(kindLabel: string, variantLabel: string, index: number, total: number, url: string) {
  const kind = kindLabel.replace(/\s+/g, '-').toLowerCase()
  const variant = variantLabel.replace(/\s+/g, '-').toLowerCase()
  const suffix = total > 1 ? `-${index + 1}` : ''
  const ext = url.split('?')[0]?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase() ?? 'png'
  return `${kind}-${variant}${suffix}.${ext === 'jpeg' ? 'jpg' : ext}`
}

function formatCreatedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export function VehicleAiCreativesGallery({
  vehicleId,
  vehicleTitle,
  onUploaded,
}: {
  vehicleId: string
  vehicleTitle?: string
  onUploaded?: () => void
}) {
  const [creatives, setCreatives] = useState<VehicleCreativeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetch(
        `/api/marketing/inventory-creatives?vehicleId=${encodeURIComponent(vehicleId)}`,
        { credentials: 'include' }
      )
      const data = (await res.json()) as { creatives?: VehicleCreativeItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setCreatives(data.creatives ?? [])
      setError(null)
    } catch (e) {
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la galería IA')
        setCreatives([])
      } else {
        toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la galería')
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  const uploadFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || uploading) return
      const files = Array.from(list).filter(
        (file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name)
      )
      if (files.length === 0) {
        toast.error('Usa imágenes JPG, PNG o WebP')
        return
      }
      if (files.length > 12) {
        toast.error('Puedes subir hasta 12 imágenes a la vez')
        return
      }

      setUploading(true)
      try {
        const formData = new FormData()
        formData.set('vehicleId', vehicleId)
        for (const file of files) formData.append('files', file)

        const res = await fetch('/api/marketing/inventory-creatives', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        const data = (await res.json()) as { creatives?: VehicleCreativeItem[]; error?: string }
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

        toast.success(files.length === 1 ? 'Imagen cargada' : `${files.length} imágenes cargadas`)
        await load({ silent: true })
        onUploaded?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudieron cargar las imágenes')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [vehicleId, uploading, load, onUploaded]
  )

  function openFilePicker() {
    if (uploading) return
    fileInputRef.current?.click()
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) setDragOver(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    void uploadFiles(e.dataTransfer.files)
  }

  const images = useMemo<GalleryImage[]>(() => {
    const items: GalleryImage[] = []
    for (const creative of creatives) {
      const urls = creative.images.length > 0 ? creative.images : creative.imageUrl ? [creative.imageUrl] : []
      if (urls.length === 0) {
        items.push({
          url: '',
          title: `${creative.kindLabel} · ${creative.variantLabel}`,
          subtitle: creative.errorMessage || statusLabel(creative.status),
          status: creative.status,
          creativeId: creative.id,
          imageIndex: 0,
          filename: fileNameFor(creative.kindLabel, creative.variantLabel, 0, 1, ''),
        })
        continue
      }
      urls.forEach((url, index) => {
        items.push({
          url,
          title: `${creative.kindLabel} · ${creative.variantLabel}`,
          subtitle: urls.length > 1 ? `Imagen ${index + 1} de ${urls.length}` : creative.kindLabel,
          status: creative.status,
          creativeId: creative.id,
          imageIndex: index,
          filename: fileNameFor(creative.kindLabel, creative.variantLabel, index, urls.length, url),
        })
      })
    }
    return items
  }, [creatives])

  const preview = previewIndex != null ? images[previewIndex] ?? null : null
  const previewableCount = images.filter((img) => img.url).length
  const previewableIndex =
    preview?.url != null ? images.filter((img) => img.url).findIndex((img) => img.url === preview.url) : -1

  const goPreview = useCallback(
    (delta: number) => {
      const previewable = images.filter((img) => img.url)
      if (previewable.length === 0 || previewIndex == null) return
      const current = images[previewIndex]
      const currentPreviewableIndex = previewable.findIndex((img) => img.url === current?.url)
      if (currentPreviewableIndex < 0) return
      const next = (currentPreviewableIndex + delta + previewable.length) % previewable.length
      const nextUrl = previewable[next]?.url
      const idx = images.findIndex((img) => img.url === nextUrl)
      if (idx >= 0) setPreviewIndex(idx)
    },
    [images, previewIndex]
  )

  function openPreview(url: string) {
    const idx = images.findIndex((img) => img.url === url)
    if (idx >= 0) setPreviewIndex(idx)
  }

  useEffect(() => {
    if (previewIndex == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowRight') goPreview(1)
      if (e.key === 'ArrowLeft') goPreview(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIndex, goPreview])

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      multiple
      className="sr-only"
      onChange={(e) => {
        void uploadFiles(e.target.files)
      }}
    />
  )

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-[1.6rem] bg-gradient-to-br from-slate-100 via-violet-50 to-slate-100 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    )
  }

  if (creatives.length === 0) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-[1.75rem] border px-6 py-16 text-center transition-colors ${
          dragOver
            ? 'border-violet-400 bg-violet-50'
            : 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50'
        }`}
      >
        {fileInput}
        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
          {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7" />}
        </div>
        <p className="relative mt-4 text-lg font-extrabold text-gray-900">
          {uploading ? 'Cargando imágenes…' : 'Sin imágenes IA todavía'}
        </p>
        <p className="relative text-sm text-gray-500 mt-1 max-w-md mx-auto">
          {uploading
            ? 'Espera un momento mientras se suben al vehículo.'
            : vehicleTitle
              ? `Arrastra JPG, PNG o WebP, o cárgalas desde tu equipo para ${vehicleTitle}.`
              : 'Arrastra JPG, PNG o WebP, o cárgalas desde tu equipo. También aparecerán aquí posters y carruseles generados.'}
        </p>
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className="relative mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Cargar imágenes
        </button>
      </div>
    )
  }

  return (
    <>
    {fileInput}
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <p className="text-sm text-gray-500">
        {uploading ? 'Subiendo imágenes…' : 'Posters, carruseles e imágenes cargadas de este vehículo.'}
      </p>
      <button
        type="button"
        onClick={openFilePicker}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Cargar imágenes
      </button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {creatives.map((creative) => {
        const urls =
          creative.images.length > 0 ? creative.images : creative.imageUrl ? [creative.imageUrl] : []
        if (urls.length === 0) {
          return (
            <div
              key={creative.id}
              className="aspect-[4/5] rounded-[1.6rem] border border-dashed border-violet-200 bg-gradient-to-br from-slate-50 to-violet-50 p-5 flex flex-col justify-between"
            >
              <div className="flex-1 flex items-center justify-center">
                {creative.status === 'generating' || creative.status === 'pending' ? (
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-violet-300" />
                )}
              </div>
              <div>
                <p className="font-extrabold text-gray-900">{creative.variantLabel}</p>
                <p className="text-xs text-gray-500 mt-1">{statusLabel(creative.status)}</p>
                {creative.errorMessage ? (
                  <p className="text-xs text-red-600 mt-2 line-clamp-2">{creative.errorMessage}</p>
                ) : null}
              </div>
            </div>
          )
        }

        return urls.map((url, index) => (
          <button
            key={`${creative.id}-${index}`}
            type="button"
            onClick={() => openPreview(url)}
            className="group relative aspect-[4/5] rounded-[1.6rem] overflow-hidden text-left shadow-[0_18px_40px_-24px_rgba(76,29,149,0.55)] ring-1 ring-black/5 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(76,29,149,0.6)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1e1b4b,_#020617)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={creative.variantLabel}
              className="relative z-10 w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />
            <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-sm">
                <Expand className="w-3 h-3" />
                Ver
              </span>
            </div>
            {urls.length > 1 ? (
              <span className="absolute top-3 left-3 z-30 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                {index + 1}/{urls.length}
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 z-30 p-4">
              <span
                className={`inline-flex rounded-full bg-gradient-to-r ${variantAccent(creative.variantLabel)} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm`}
              >
                {creative.variantLabel}
              </span>
              {formatCreatedAt(creative.createdAt) ? (
                <p className="text-[11px] text-white/70 mt-1.5">{formatCreatedAt(creative.createdAt)}</p>
              ) : null}
            </div>
          </button>
        ))
      })}
      <button
        type="button"
        onClick={openFilePicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={uploading}
        className={`aspect-[4/5] rounded-[1.6rem] border-2 border-dashed flex flex-col items-center justify-center gap-2 px-4 text-center transition-colors ${
          dragOver
            ? 'border-violet-500 bg-violet-50 text-violet-800'
            : 'border-violet-200 bg-violet-50/40 text-violet-700 hover:border-violet-400 hover:bg-violet-50'
        } disabled:opacity-60`}
      >
        {uploading ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : (
          <Plus className="w-7 h-7" />
        )}
        <span className="text-sm font-bold">{uploading ? 'Subiendo…' : 'Agregar imágenes'}</span>
        <span className="text-[11px] text-violet-500/80">JPG, PNG o WebP</span>
      </button>
    </div>

      {preview ? (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <div className="w-full max-w-4xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-4 text-white">
              <div className="min-w-0">
                <p className="text-lg font-extrabold truncate">{preview.title}</p>
                <p className="text-xs text-white/60">
                  {preview.subtitle}
                  {previewableCount > 1 && previewableIndex >= 0
                    ? ` · ${previewableIndex + 1} / ${previewableCount}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {preview.url ? (
                  <a
                    href={`/api/marketing/inventory-creatives/download?creativeId=${encodeURIComponent(preview.creativeId)}&index=${preview.imageIndex}`}
                    download={preview.filename}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-violet-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative rounded-[1.75rem] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
              {preview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.title}
                  className="w-full max-h-[78vh] object-contain bg-[radial-gradient(circle_at_center,_#1e1b4b,_#000)]"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-white/70">Sin imagen</div>
              )}
              {previewableCount > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goPreview(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goPreview(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm"
                    aria-label="Siguiente imagen"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
