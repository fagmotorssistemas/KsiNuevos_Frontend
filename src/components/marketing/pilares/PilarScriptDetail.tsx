'use client'

import dynamic from 'next/dynamic'
import { Download, Target } from 'lucide-react'
import { ReelEscenasTable } from '@/components/marketing/reels/ReelEscenasTable'
import { ReelVehicleSummary } from '@/components/marketing/reels/ReelVehicleSummary'
import { PilarSistemaBadge } from '@/components/marketing/pilares/pilar-badges'
import { downloadReelDocument } from '@/lib/marketing/format-reel-download'
import {
  getPilarLabel,
  getPilarVehicleLabel,
  pilarScriptToReelCompat,
  type PilarScript,
} from '@/types/pilar'
import type { ReelScript } from '@/types/reel'

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

export function PilarScriptDetail({ script }: { script: PilarScript }) {
  const compat = pilarScriptToReelCompat(script) as unknown as ReelScript
  const vehiculoPrincipal = getPilarVehicleLabel(script.vehicle)
  const objetivo = script.objetivo?.trim()
  const hablado = script.texto_hablado?.trim()

  return (
    <div className="space-y-5 min-w-0">
      <header className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <PilarSistemaBadge sistema={script.sistema} hookCategoria={script.hook_categoria} />
              {script.palabras_count != null && (
                <span className="text-xs font-semibold text-gray-500">
                  {script.palabras_count} palabras
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
              {script.titulo || script.hook_texto || vehiculoPrincipal || getPilarLabel(script.sistema)}
            </h2>
            {script.hook_texto ? (
              <p className="text-sm text-violet-700 font-medium">{script.hook_texto}</p>
            ) : null}
            <ReelVehicleSummary vehicle={script.vehicle} size="sm" />
            <p className="text-sm text-gray-600">{script.vendedor_nombre || 'Sin asignar'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadReelDocument(compat)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              TXT
            </button>
            <BotonDescargarReel script={compat} />
          </div>
        </div>
      </header>

      {objetivo ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Objetivo
          </p>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{objetivo}</p>
        </div>
      ) : null}

      {hablado ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
            Texto hablado
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{hablado}</p>
        </div>
      ) : null}

      <ReelEscenasTable
        escenas={script.guion_escenas ?? []}
        script={compat}
        columnas={(script.guion_columnas?.length
          ? script.guion_columnas
          : ['esc', 'tiempo', 'movimiento', 'accion', 'dialogo']
        ).filter((c) => c !== 'hablante' && c !== 'texto_pantalla')}
      />
    </div>
  )
}
