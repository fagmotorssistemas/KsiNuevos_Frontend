'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { generateGuionPdfBlob, warmUpGuionPdfEngine } from '@/lib/marketing/guion-pdf-engine'
import {
  buildGuionPdfFilename,
  mapScriptToGuionData,
} from '@/lib/marketing/map-script-to-guion-pdf'
import type { GuionData } from '@/types/guion-pdf'
import type { ScriptRow } from '@/components/marketing/ScriptCard'
import type { VideoScriptStructuredFields } from '@/types/video-script'

type Props = {
  data?: GuionData
  script?: VideoScriptStructuredFields &
    Partial<Pick<ScriptRow, 'vendedor_nombre' | 'vehicle_id' | 'inventoryoracle' | 'fecha_generacion'>>
  vehiculoLabel?: string
  className?: string
  disabled?: boolean
}

const btnClass =
  'inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs font-bold hover:bg-red-100 disabled:opacity-50 disabled:pointer-events-none shrink-0'

export default function BotonDescargarGuion({
  data,
  script,
  vehiculoLabel,
  className,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [engineWarm, setEngineWarm] = useState(false)

  const guionData = useMemo(
    () => data ?? (script ? mapScriptToGuionData(script, { vehiculoLabel }) : null),
    [data, script, vehiculoLabel]
  )

  const filename = guionData ? buildGuionPdfFilename(guionData) : 'guion.pdf'
  const noContent = !guionData || guionData.tomas.length === 0

  useEffect(() => {
    if (noContent || disabled) return

    let cancelled = false
    const runWarmup = () => {
      void warmUpGuionPdfEngine().then(() => {
        if (!cancelled) setEngineWarm(true)
      })
    }

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(runWarmup)
      return () => {
        cancelled = true
        cancelIdleCallback(id)
      }
    }

    const t = window.setTimeout(runWarmup, 300)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [noContent, disabled])

  const handleDownload = useCallback(async () => {
    if (!guionData || loading) return

    setLoading(true)
    try {
      const blob = await generateGuionPdfBlob(guionData)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[GuionPDF] Error al generar PDF:', err)
    } finally {
      setLoading(false)
    }
  }, [guionData, filename, loading])

  if (noContent || disabled) {
    return (
      <button type="button" disabled className={className ?? btnClass}>
        <Download className="h-4 w-4" />
        Descargar PDF
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={className ?? btnClass}
      title={engineWarm ? undefined : 'Preparando plantilla PDF…'}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando PDF…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Descargar PDF
        </>
      )}
    </button>
  )
}
