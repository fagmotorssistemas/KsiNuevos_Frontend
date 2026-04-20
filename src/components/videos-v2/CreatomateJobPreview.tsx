'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Preview } from '@creatomate/preview'
import { Clapperboard, Loader2, Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const PUBLIC_TOKEN =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CREATOMATE_PUBLIC_TOKEN?.trim() ?? '' : ''

interface CreatomateJobPreviewProps {
  jobId: string
  /** Si el job está renderizando, deshabilita exportar. */
  jobIsRendering?: boolean
  onExportStarted?: () => void
}

/**
 * Editor visual Creatomate (Preview SDK) con el mismo JSON que el pipeline envía a la API.
 * Requiere `NEXT_PUBLIC_CREATOMATE_PUBLIC_TOKEN` en el entorno (panel Creatomate → Programmatic access → Public token).
 * Solo escritorio moderno; en móvil Creatomate no lo soporta bien.
 */
export function CreatomateJobPreview({
  jobId,
  jobIsRendering,
  onExportStarted,
}: CreatomateJobPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<Preview | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disposePreview = useCallback(() => {
    try {
      previewRef.current?.dispose()
    } catch {
      // ignore
    }
    previewRef.current = null
  }, [])

  useEffect(() => {
    if (!open) {
      disposePreview()
      return
    }
    if (!PUBLIC_TOKEN) {
      setError(
        'Falta NEXT_PUBLIC_CREATOMATE_PUBLIC_TOKEN en el servidor. Añádelo en Vercel/.env (Creatomate → Programmatic access → Public token).'
      )
      return
    }

    const el = containerRef.current
    if (!el) return

    let cancelled = false

    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(`/api/videos-v2/jobs/${jobId}/creatomate-preview-source`)
        const data = (await res.json()) as { source?: Record<string, unknown>; error?: string }
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la composición')
        if (!data.source) throw new Error('Respuesta sin source')
        if (cancelled) return

        disposePreview()
        const preview = new Preview(el, 'interactive', PUBLIC_TOKEN)
        previewRef.current = preview

        preview.onReady = async () => {
          if (cancelled) return
          try {
            await preview.setSource(data.source as Record<string, unknown>)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar en Creatomate')
          } finally {
            if (!cancelled) setBusy(false)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error')
          setBusy(false)
        }
      }
    })()

    return () => {
      cancelled = true
      disposePreview()
    }
  }, [open, jobId, disposePreview])

  async function handleExportFromEditor() {
    const preview = previewRef.current
    if (!preview?.ready) {
      toast.error('Espera a que termine de cargar el editor.')
      return
    }
    setExporting(true)
    try {
      const source = preview.getSource()
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/creatomate-render-from-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const data = (await res.json()) as { ok?: boolean; renderId?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el render')
      toast.success('Render iniciado con tu edición. El video se actualizará cuando Creatomate termine.')
      onExportStarted?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setExporting(false)
    }
  }

  if (!PUBLIC_TOKEN) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
        <p className="font-semibold">Editor visual Creatomate</p>
        <p className="mt-1 leading-relaxed">
          Configura <code className="bg-amber-100/80 px-1 rounded">NEXT_PUBLIC_CREATOMATE_PUBLIC_TOKEN</code> en tu
          entorno (token público del proyecto en Creatomate). Sin eso el Preview SDK no puede inicializarse en el
          navegador.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
      >
        <Pencil className="w-4 h-4" />
        {open ? 'Ocultar editor visual (Creatomate)' : 'Editor visual Creatomate (Preview SDK)'}
      </button>

      <p className="text-xs text-gray-500 mt-2 max-w-prose leading-relaxed">
        Abre la misma composición que genera la automatización, ajústala en el lienzo (textos, posiciones, tiempos) y
        pulsa <strong>Exportar MP4</strong> para enviar el JSON editado a Creatomate. Funciona mejor en{' '}
        <strong>Chrome o Edge en escritorio</strong>.
      </p>

      {open && (
        <div className="mt-4 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div
            ref={containerRef}
            className="w-full min-h-[min(70vh,720px)] rounded-xl border border-gray-200 bg-gray-950 overflow-hidden"
            style={{ aspectRatio: '9 / 16', maxHeight: 'min(70vh, 720px)' }}
          />

          {busy && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando composición en Creatomate…
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={exporting || busy || jobIsRendering || !!error}
              onClick={() => void handleExportFromEditor()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clapperboard className="w-4 h-4" />
              )}
              Exportar MP4 desde editor
            </button>
            <span className="text-[11px] text-gray-500 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              Usa el mismo webhook que el pipeline; el job pasará a «renderizando» hasta que Creatomate responda.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
