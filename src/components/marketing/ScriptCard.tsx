'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ExternalLink, MessageSquareText } from 'lucide-react'
import { GuionTipoBadge, SemanaBadge } from './badges'

export type ScriptRow = {
  id: string
  vendedor_id: string
  vendedor_nombre: string | null
  vehicle_id: string
  semana_tipo: number | null
  guion_tipo: string | null
  objecion_tipo: string | null
  texto_guion: string | null
  palabras_count: number | null
  status: string | null
  facebook_post_id: string | null
  fecha_generacion: string | null
  fecha_publicacion: string | null
  vehicle_data: unknown | null
  inventoryoracle?: {
    brand: string | null
    model: string | null
    year: number | null
    color: string | null
    img_main_url: string | null
  } | null
}

function statusPill(s: string | null) {
  const v = (s ?? '').toLowerCase()
  if (v === 'publicado') return 'bg-green-100 text-green-800 border-green-200'
  if (v === 'descartado') return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

export function ScriptCard({ script }: { script: ScriptRow }) {
  const [open, setOpen] = useState(false)

  const fbUrl = useMemo(() => {
    if (!script.facebook_post_id) return null
    return `https://www.facebook.com/${script.facebook_post_id}`
  }, [script.facebook_post_id])

  const car = script.inventoryoracle
  const title = car ? `${car.brand ?? ''} ${car.model ?? ''} ${car.year ?? ''}`.trim() : script.vehicle_id

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            {car?.img_main_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={car.img_main_url} alt={title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <MessageSquareText className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900 truncate">{title}</p>
            <p className="text-xs text-gray-500 truncate">
              {car?.color ? `${car.color} • ` : ''}
              {script.palabras_count ? `${script.palabras_count} palabras` : '—'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <GuionTipoBadge tipo={script.guion_tipo ?? ''} objecionTipo={script.objecion_tipo} />
              <SemanaBadge semanaTipo={script.semana_tipo} />
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusPill(script.status)}`}>
                {(script.status ?? 'generado').toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold text-gray-900">Ver guion completo</span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {script.texto_guion ?? '—'}
              </pre>
            </div>
          )}
        </div>

        {fbUrl && (
          <div className="mt-4">
            <Link
              href={fbUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-800"
            >
              Ver en Facebook <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

