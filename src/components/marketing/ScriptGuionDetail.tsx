'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Mic2, Target } from 'lucide-react'
import { toast } from 'sonner'
import { ScriptGuionEscenasTable } from './ScriptGuionEscenasTable'
import { downloadGuionDocument } from '@/lib/marketing/format-guion-download'
import { scriptsService } from '@/services/scripts.service'
import {
  getGuionDisplayTitle,
  hasStructuredGuion,
  parseGuionEscenas,
  serializeGuionEscenas,
  type VideoScriptStructuredFields,
} from '@/types/video-script'
import type { ScriptRow } from '@/components/marketing/ScriptCard'

const BotonDescargarGuion = dynamic(
  () => import('@/components/marketing/pdf/BotonDescargarGuion'),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs font-bold opacity-60 shrink-0">
        <Download className="h-4 w-4" />
        Descargar PDF
      </span>
    ),
  }
)

type ScriptGuionDetailProps = {
  script: VideoScriptStructuredFields &
    Partial<Pick<ScriptRow, 'id' | 'vendedor_nombre' | 'vehicle_id' | 'inventoryoracle' | 'fecha_generacion'>>
  vehiculoLabel?: string
  onEscenasSaved?: (guionEscenas: unknown) => void
}

export function ScriptGuionDetail({ script, vehiculoLabel, onEscenasSaved }: ScriptGuionDetailProps) {
  const [escenas, setEscenas] = useState(() => parseGuionEscenas(script.guion_escenas))
  const [saving, setSaving] = useState(false)
  const escenasRef = useRef(escenas)
  const dirtyRef = useRef(false)

  useEffect(() => {
    setEscenas(parseGuionEscenas(script.guion_escenas))
    dirtyRef.current = false
  }, [script.id, script.guion_escenas])

  useEffect(() => {
    escenasRef.current = escenas
  }, [escenas])

  const structured = hasStructuredGuion(script)
  const titulo = getGuionDisplayTitle(script)
  const objetivo = script.guion_objetivo?.trim()
  const hablado = script.texto_hablado?.trim()
  const canEdit = Boolean(script.id)

  const handleDialogoChange = useCallback((esc: number, value: string) => {
    dirtyRef.current = true
    setEscenas((prev) =>
      prev.map((e) => (e.esc === esc ? { ...e, dialogo: value } : e))
    )
  }, [])

  const saveEscenas = useCallback(async () => {
    if (!script.id || !dirtyRef.current) return

    const payload = serializeGuionEscenas(escenasRef.current)
    setSaving(true)
    try {
      const updated = await scriptsService.updateGuionEscenas(script.id, payload)
      dirtyRef.current = false
      onEscenasSaved?.(updated.guion_escenas)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el diálogo')
    } finally {
      setSaving(false)
    }
  }, [onEscenasSaved, script.id])

  const handleDialogoBlur = useCallback(() => {
    void saveEscenas()
  }, [saveEscenas])

  const downloadScript = useMemo(
    () => ({ ...script, guion_escenas: serializeGuionEscenas(escenas) }),
    [escenas, script]
  )

  if (!structured) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-1 min-w-0">
            Guión sin estructura nueva. Regenera o espera migración del API.
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <BotonDescargarGuion script={script} vehiculoLabel={vehiculoLabel} />
            {script.texto_guion?.trim() && (
              <button
                type="button"
                onClick={() => downloadGuionDocument(script)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100"
              >
                <Download className="h-4 w-4" />
                Texto
              </button>
            )}
          </div>
        </div>
        <details className="rounded-xl border border-gray-200 bg-gray-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-700">
            Ver texto plano (respaldo)
          </summary>
          <pre className="px-4 pb-4 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
            {script.texto_guion ?? '—'}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="space-y-5 min-w-0">
      <header className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold text-gray-900 leading-snug min-w-0 flex-1">
            {titulo}
          </h2>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <BotonDescargarGuion script={downloadScript} vehiculoLabel={vehiculoLabel} />
            <button
              type="button"
              onClick={() => downloadGuionDocument(downloadScript)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              Texto
            </button>
          </div>
        </div>
        {objetivo && (
          <div className="flex gap-2 rounded-xl bg-slate-50 border border-gray-200 p-3">
            <Target className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-extrabold text-gray-900">Objetivo: </span>
              {objetivo}
            </p>
          </div>
        )}
      </header>

      {hablado && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic2 className="h-4 w-4 text-violet-700 shrink-0" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-violet-900">
              Voz del vendedor
            </h3>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{hablado}</p>
        </section>
      )}

      {escenas.length > 0 && (
        <ScriptGuionEscenasTable
          escenas={escenas}
          editable={canEdit}
          saving={saving}
          onDialogoChange={handleDialogoChange}
          onDialogoBlur={handleDialogoBlur}
        />
      )}
    </div>
  )
}
