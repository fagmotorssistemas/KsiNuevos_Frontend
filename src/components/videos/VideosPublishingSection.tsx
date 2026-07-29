'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, ListVideo, AlertTriangle, PlayCircle, Loader2, RefreshCw, KeyRound } from 'lucide-react'
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

type TokenHealth = {
  soon: boolean
  expired: boolean
  expiresAt: string | null
  hasToken: boolean
  source: string
}

export function VideosPublishingSection({
  refreshKey = 0,
  onPublishingMutate,
  flowTypeFilter,
  approvedEmptyHint,
}: VideosPublishingSectionProps) {
  const [sub, setSub] = useState<SubTab>('approved')
  const [tokenWarn, setTokenWarn] = useState<TokenHealth | null>(null)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [refreshingToken, setRefreshingToken] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [pasteToken, setPasteToken] = useState('')

  const loadTokenHealth = useCallback(() => {
    fetch('/api/videos/publish/health', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (d: {
          instagramTokenExpiringSoon?: boolean
          instagramTokenExpired?: boolean
          instagramTokenExpiresAt?: string | null
          instagramTokenHasToken?: boolean
          instagramTokenSource?: string
        }) => {
          setTokenWarn({
            soon: !!d.instagramTokenExpiringSoon,
            expired: !!d.instagramTokenExpired,
            expiresAt: d.instagramTokenExpiresAt ?? null,
            hasToken: d.instagramTokenHasToken !== false,
            source: d.instagramTokenSource ?? 'missing',
          })
        }
      )
      .catch(() => setTokenWarn(null))
  }, [])

  useEffect(() => {
    loadTokenHealth()
  }, [loadTokenHealth])

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

  async function runRefreshToken(force = false) {
    setRefreshingToken(true)
    try {
      const qs = force ? '?force=1' : ''
      const res = await fetch(`/api/videos/publish/instagram/refresh-token${qs}`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as {
        action?: string
        expiresAt?: string
        reason?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? data.reason ?? `HTTP ${res.status}`)
      if (data.action === 'refreshed') {
        toast.success(`Token renovado ~60 días${data.expiresAt ? ` (hasta ${data.expiresAt})` : ''}`)
      } else if (data.action === 'skipped') {
        toast.message(data.reason ?? 'Refresh omitido')
      } else if (data.action === 'needs_reauth') {
        toast.error(data.reason ?? 'Hay que generar un token nuevo en Meta')
      } else {
        toast.message(data.reason ?? data.action ?? 'Listo')
      }
      loadTokenHealth()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo refrescar el token')
    } finally {
      setRefreshingToken(false)
    }
  }

  async function savePastedToken() {
    const accessToken = pasteToken.trim()
    if (!accessToken) {
      toast.error('Pega el access token de Instagram')
      return
    }
    setSavingToken(true)
    try {
      const res = await fetch('/api/videos/publish/instagram/set-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        exchanged?: boolean
        expiresAt?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setPasteToken('')
      toast.success(
        data.exchanged
          ? `Token canjeado a ~60 días (vence ${data.expiresAt ?? '—'})`
          : `Token guardado (vence ${data.expiresAt ?? '—'})`
      )
      loadTokenHealth()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el token')
    } finally {
      setSavingToken(false)
    }
  }

  const showTokenPanel = !!tokenWarn && (tokenWarn.expired || tokenWarn.soon || !tokenWarn.hasToken)

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

      {showTokenPanel ? (
        <div
          className={`rounded-2xl border px-4 py-3 ${
            tokenWarn.expired || !tokenWarn.hasToken
              ? 'border-red-200 bg-red-50 text-red-950'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3 text-sm min-w-0">
              {tokenWarn.expired || !tokenWarn.hasToken ? (
                <>
                  <p className="font-bold">Token de Instagram vencido o ausente</p>
                  <p className="opacity-90">
                    Meta no permite renovar un token ya expirado. Genera uno nuevo en Meta Developers (Instagram →
                    token de usuario), pégalo aquí y el sistema intentará canjearlo a ~60 días. Un cron semanal lo
                    refrescará mientras siga vivo.
                    {tokenWarn.expiresAt ? ` Venció: ${tokenWarn.expiresAt}.` : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">Token de Instagram por vencer</p>
                  <p className="opacity-90">
                    Renueva antes del límite
                    {tokenWarn.expiresAt ? ` (${tokenWarn.expiresAt})` : ''}. Fuente: {tokenWarn.source}.
                  </p>
                  <button
                    type="button"
                    disabled={refreshingToken}
                    onClick={() => void runRefreshToken(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {refreshingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Extender ~60 días ahora
                  </button>
                </>
              )}

              {(tokenWarn.expired || !tokenWarn.hasToken) && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                    Pegar access token nuevo
                  </label>
                  <textarea
                    value={pasteToken}
                    onChange={(e) => setPasteToken(e.target.value)}
                    rows={3}
                    placeholder="IGAAxxxx… o el token que te da Meta"
                    className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder:text-gray-400"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    disabled={savingToken || !pasteToken.trim()}
                    onClick={() => void savePastedToken()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {savingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Guardar (intentar 60 días)
                  </button>
                </div>
              )}
            </div>
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
