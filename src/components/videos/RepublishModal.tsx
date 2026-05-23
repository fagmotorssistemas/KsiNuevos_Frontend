'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { PublishingPlatform } from '@/lib/videos/types'

type ResultRow = {
  platform: string
  status: string
  platform_post_id: string | null
  error_message: string | null
}

interface RepublishModalProps {
  queueId: string | null
  scheduledPlatforms: string[]
  onClose: () => void
  onDone: () => void
}

function formatPlatform(platform: string) {
  if (platform === 'instagram') return 'Instagram'
  if (platform === 'facebook') return 'Facebook'
  return platform
}

export function RepublishModal({ queueId, scheduledPlatforms, onClose, onDone }: RepublishModalProps) {
  const [results, setResults] = useState<ResultRow[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [instagram, setInstagram] = useState(false)
  const [facebook, setFacebook] = useState(false)

  const available = scheduledPlatforms.filter(
    (p): p is PublishingPlatform => p === 'instagram' || p === 'facebook'
  )

  useEffect(() => {
    if (!queueId) return
    const avail = scheduledPlatforms.filter(
      (p): p is PublishingPlatform => p === 'instagram' || p === 'facebook'
    )
    setInstagram(avail.includes('instagram'))
    setFacebook(avail.includes('facebook'))
    const supabase = createClient()
    setLoadingResults(true)
    supabase
      .from('video_publishing_results')
      .select('platform, status, platform_post_id, error_message')
      .eq('queue_id', queueId)
      .then(({ data, error }) => {
        if (error) console.error(error)
        setResults((data ?? []) as ResultRow[])
        setLoadingResults(false)
      })
  }, [queueId, scheduledPlatforms])

  if (!queueId) return null

  async function handleRepublish() {
    const platforms: PublishingPlatform[] = []
    if (instagram && available.includes('instagram')) platforms.push('instagram')
    if (facebook && available.includes('facebook')) platforms.push('facebook')
    if (platforms.length === 0) {
      toast.error('Selecciona al menos una red')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/videos/publish/republish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId, platforms }),
      })
      const data = (await res.json()) as {
        error?: string
        queueFinalStatus?: string
        errors?: string[]
      }
      if (!res.ok) throw new Error(data.error ?? 'Error al republicar')

      if (data.errors?.length) {
        toast.warning(`Republicación parcial: ${data.errors.join('; ')}`)
      } else {
        toast.success('Republicación completada')
      }
      onDone()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al republicar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="republish-title"
      >
        <h3 id="republish-title" className="text-base font-bold text-gray-900 mb-1">
          Republicar en redes
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Vuelve a publicar el video con el flujo actualizado (Facebook usa Reels API pública). Elige solo las
          redes que quieras actualizar.
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
          Si Facebook sigue sin verse con tu perfil personal pero sí como página admin, revisa en{' '}
          <strong>developers.facebook.com</strong> que tu app Meta esté en modo <strong>Live</strong> (no
          Desarrollo) y con el permiso <strong>pages_manage_posts</strong> aprobado.
        </p>

        {loadingResults ? (
          <Loader2 className="w-5 h-5 animate-spin text-violet-600 mb-3" />
        ) : results.length > 0 ? (
          <ul className="mb-4 space-y-1.5 text-xs text-gray-600 border border-gray-100 rounded-xl p-3 bg-gray-50">
            {results.map((r) => (
              <li key={r.platform}>
                <span className="font-semibold text-gray-800">{formatPlatform(r.platform)}:</span>{' '}
                {r.status === 'published' ? 'Publicado' : 'Fallido'}
                {r.platform_post_id ? (
                  <span className="block font-mono truncate text-[10px] text-gray-500">{r.platform_post_id}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2 mb-5">
          {available.includes('instagram') && (
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={instagram}
                onChange={(e) => setInstagram(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-semibold text-gray-900">Instagram</span>
            </label>
          )}
          {available.includes('facebook') && (
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={facebook}
                onChange={(e) => setFacebook(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-semibold text-gray-900">Facebook (Reel público)</span>
            </label>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl bg-gray-100 font-semibold text-sm text-gray-700 hover:bg-gray-200"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            onClick={() => void handleRepublish()}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Republicar
          </button>
        </div>
      </div>
    </div>
  )
}
