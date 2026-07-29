'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Download, ExternalLink, Loader2, Send, Target } from 'lucide-react'
import { toast } from 'sonner'
import { ReelEscenasTable } from './ReelEscenasTable'
import { ReelFormatoBadge } from './reel-badges'
import { ReelVehicleSummary } from './ReelVehicleSummary'
import { downloadReelDocument } from '@/lib/marketing/format-reel-download'
import { reelsService } from '@/services/reels.service'
import { getReelAssigneeLabel, getReelVehicleLabel, isReelMarketingFormato, type ReelScript } from '@/types/reel'

const BotonDescargarReel = dynamic(
  () => import('@/components/marketing/pdf/BotonDescargarReel'),
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

export function ReelScriptDetail({
  script,
  onUpdated,
}: {
  script: ReelScript
  onUpdated?: (script: ReelScript) => void
}) {
  const [fbInput, setFbInput] = useState('')
  const [savingFb, setSavingFb] = useState(false)

  const vehiculoPrincipal = getReelVehicleLabel(script.vehicle)
  const objetivo = script.objetivo?.trim()
  const hablado = script.texto_hablado?.trim()
  const fbUrl = script.facebook_post_id
    ? `https://www.facebook.com/${script.facebook_post_id}`
    : null

  const handleMarkPublished = useCallback(async () => {
    const value = fbInput.trim()
    if (!value) return
    setSavingFb(true)
    try {
      const updated = await reelsService.markFacebookPost(script.id, value)
      toast.success('Guión marcado como publicado')
      setFbInput('')
      onUpdated?.(updated)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo marcar como publicado')
    } finally {
      setSavingFb(false)
    }
  }, [fbInput, onUpdated, script.id])

  return (
    <div className="space-y-5 min-w-0">
      <header className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <ReelFormatoBadge formato={script.formato} variante={script.variante} />
              {script.palabras_count != null && (
                <span className="text-xs font-semibold text-gray-500">
                  {script.palabras_count} palabras
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
              {script.titulo || vehiculoPrincipal || 'Reel'}
            </h2>
            <ReelVehicleSummary vehicle={script.vehicle} vehicle2={script.vehicle_2} size="sm" />
            <p className="text-sm text-gray-600">{getReelAssigneeLabel(script)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <BotonDescargarReel script={script} />
            <button
              type="button"
              onClick={() => downloadReelDocument(script)}
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
          <p className="text-xs font-extrabold uppercase tracking-wide text-violet-900 mb-2">
            {isReelMarketingFormato(script.formato) ? 'Texto hablado' : 'Voz del vendedor'}
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{hablado}</p>
        </section>
      )}

      <ReelEscenasTable
        escenas={script.guion_escenas}
        script={script}
        columnas={script.guion_columnas}
      />

      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-600 mb-2">
          Publicación en Facebook
        </p>
        {fbUrl ? (
          <Link
            href={fbUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-800"
          >
            Ver publicación <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={fbInput}
              onChange={(e) => setFbInput(e.target.value)}
              placeholder="ID del post de Facebook"
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm flex-1 min-w-[200px]"
            />
            <button
              type="button"
              disabled={!fbInput.trim() || savingFb}
              onClick={handleMarkPublished}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              {savingFb ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Marcar publicado
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
