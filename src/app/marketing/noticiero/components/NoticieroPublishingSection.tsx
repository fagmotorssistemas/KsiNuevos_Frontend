'use client'

import { useState } from 'react'
import { Megaphone, ListVideo, PlayCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { NoticieroApprovedPanel } from './NoticieroApprovedPanel'
import { NoticieroPublishingQueueTable } from './NoticieroPublishingQueueTable'

type SubTab = 'approved' | 'queue'

export function NoticieroPublishingSection({
  refreshKey = 0,
  onPublishingMutate,
}: {
  refreshKey?: number
  onPublishingMutate?: () => void
}) {
  const [sub, setSub] = useState<SubTab>('approved')
  const [processingQueue, setProcessingQueue] = useState(false)

  async function runProcessNow() {
    setProcessingQueue(true)
    try {
      const res = await fetch('/api/marketing/noticiero/publish/process', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as { processed?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const n = data.processed ?? 0
      toast.success(n > 0 ? `Cola procesada: ${n} ítem(s)` : 'Nada pendiente por ahora')
      onPublishingMutate?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar el procesador')
    } finally {
      setProcessingQueue(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 sm:p-5">
        <p className="text-xs font-semibold text-violet-700">Publicación de noticieros</p>
        <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
          Aprueba, programa y publica en Instagram y Facebook
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Flujo: generar clip → aprobar → programar con vehículo y caption → cola automática.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSub('approved')}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${
            sub === 'approved' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Noticieros aprobados
        </button>
        <button
          type="button"
          onClick={() => setSub('queue')}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${
            sub === 'queue' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          Cola programada
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        {sub === 'approved' ? (
          <NoticieroApprovedPanel refreshKey={refreshKey} onScheduleDone={onPublishingMutate} />
        ) : (
          <NoticieroPublishingQueueTable refreshKey={refreshKey} onMutate={onPublishingMutate} />
        )}
      </div>

      {sub === 'queue' && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <button
            type="button"
            disabled={processingQueue}
            onClick={() => void runProcessNow()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {processingQueue ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Procesar cola ahora
          </button>
        </div>
      )}
    </div>
  )
}
