'use client'

import { useMemo } from 'react'
import { Mic2, Target } from 'lucide-react'
import { ScriptGuionEscenasTable } from './ScriptGuionEscenasTable'
import {
  getGuionDisplayTitle,
  hasStructuredGuion,
  parseGuionEscenas,
  type VideoScriptStructuredFields,
} from '@/types/video-script'

export function ScriptGuionDetail({ script }: { script: VideoScriptStructuredFields }) {
  const escenas = useMemo(() => parseGuionEscenas(script.guion_escenas), [script.guion_escenas])
  const structured = hasStructuredGuion(script)
  const titulo = getGuionDisplayTitle(script)
  const objetivo = script.guion_objetivo?.trim()
  const hablado = script.texto_hablado?.trim()

  if (!structured) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Guión sin estructura nueva. Regenera o espera migración del API.
        </p>
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
      <header className="space-y-2 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-extrabold text-gray-900 leading-snug">{titulo}</h2>
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

      {escenas.length > 0 && <ScriptGuionEscenasTable escenas={escenas} />}
    </div>
  )
}
