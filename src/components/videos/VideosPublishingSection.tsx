'use client'

import { useEffect, useState } from 'react'
import { Megaphone, ListVideo, AlertTriangle, PlayCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApprovedVideosPublishingPanel } from './ApprovedVideosPublishingPanel'
import { PublishingQueueTable } from './PublishingQueueTable'

type SubTab = 'approved' | 'queue'

interface VideosPublishingSectionProps {
  refreshKey?: number
  onPublishingMutate?: () => void
  flowTypeFilter?: string
  approvedEmptyHint?: string
}

export function VideosPublishingSection({
  refreshKey = 0,
  onPublishingMutate,
  flowTypeFilter,
  approvedEmptyHint,
}: VideosPublishingSectionProps) {
  const [sub, setSub] = useState<SubTab>('approved')
  const [tokenWarn, setTokenWarn] = useState<{ soon: boolean; expiresAt: string | null } | null>(null)
  const [processingQueue, setProcessingQueue] = useState(false)

  async function runProcessNow() {
    setProcessingQueue(true)
    try {
      const res = await fetch('/api/videos/publish/process', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as { processed?: number; error?: string; details?: unknown }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const n = data.processed ?? 0
      toast.success(n > 0 ? `Cola procesada: ${n} ítem(s)` : 'Nada pendiente por ahora (o ya procesado)')
      onPublishingMutate?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar el procesador')
    } finally {
      setProcessingQueue(false)
    }
  }

  useEffect(() => {
    fetch('/api/videos/publish/health')
      .then((r) => r.json())
      .then((d: { instagramTokenExpiringSoon?: boolean; instagramTokenExpiresAt?: string | null }) => {
        setTokenWarn({
          soon: !!d.instagramTokenExpiringSoon,
          expiresAt: d.instagramTokenExpiresAt ?? null,
        })
      })
      .catch(() => setTokenWarn(null))
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-violet-700">Publicación inteligente</p>
            <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">Gestiona, programa y monitorea tus publicaciones</h3>
            <p className="text-sm text-gray-600 mt-1">
              Flujo recomendado: aprobar video → programar con vehículo y caption → monitorear estado en cola.
            </p>
          </div>
        </div>
      </div>

      {tokenWarn?.soon ? (
        <div className="flex gap-3 items-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Token de Instagram por vencer</p>
            <p className="mt-1 text-amber-900/90">
              Renueva el access token en Meta antes del límite
              {tokenWarn.expiresAt ? ` (${tokenWarn.expiresAt})` : ''}. Configura{' '}
              <code className="text-xs bg-amber-100/80 px-1 rounded">INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT</code> en el
              servidor para esta alerta (ISO 8601).
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSub('approved')}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
            sub === 'approved'
              ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Videos aprobados
        </button>
        <button
          type="button"
          onClick={() => setSub('queue')}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
            sub === 'queue'
              ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          Cola programada
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        {sub === 'approved' ? (
          <ApprovedVideosPublishingPanel
            refreshKey={refreshKey}
            onScheduleDone={onPublishingMutate}
            flowTypeFilter={flowTypeFilter}
            emptyHint={approvedEmptyHint}
          />
        ) : (
          <PublishingQueueTable
            refreshKey={refreshKey}
            onMutate={onPublishingMutate}
            flowTypeFilter={flowTypeFilter}
          />
        )}
      </div>

      {sub === 'queue' ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={processingQueue}
              onClick={() => void runProcessNow()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {processingQueue ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Procesar cola ahora
            </button>
            <span className="text-xs text-gray-600">
              Ejecuta el mismo endpoint que el cron (con tu sesión de marketing).
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
