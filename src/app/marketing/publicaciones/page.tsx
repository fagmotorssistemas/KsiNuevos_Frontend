'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Megaphone, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ScriptCard, type ScriptRow } from '@/components/marketing/ScriptCard'
import { MetricasRow, type MetaMetricsRow } from '@/components/marketing/MetricasRow'
import { PublicacionCard, type InformativePostRow } from '@/components/marketing/PublicacionCard'

type PublishedScript = ScriptRow & { metrics?: MetaMetricsRow | null }

export default function MarketingPublicacionesPage() {
  const { supabase } = useAuth()
  const [tab, setTab] = useState<'videos' | 'posts'>('videos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [publishedScripts, setPublishedScripts] = useState<PublishedScript[]>([])
  const [posts, setPosts] = useState<InformativePostRow[]>([])

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    async function run() {
      if (tab === 'videos') {
        const { data: scripts, error: scriptsError } = await (supabase as unknown as { from: (t: string) => any })
          .from('video_scripts')
          .select(
            `
            id, vendedor_id, vendedor_nombre, vehicle_id, semana_tipo, guion_tipo, objecion_tipo,
            texto_guion, palabras_count, status, facebook_post_id, fecha_generacion, fecha_publicacion,
            created_at, updated_at, vehicle_data,
            inventoryoracle:inventoryoracle (brand, model, year, color, img_main_url)
          `
          )
          .eq('status', 'publicado')
          .order('fecha_publicacion', { ascending: false })
          .limit(200)

        if (scriptsError) {
          setError(scriptsError.message)
          setPublishedScripts([])
          return
        }

        const base = (scripts ?? []) as ScriptRow[]
        const ids = base.map((s) => s.facebook_post_id).filter(Boolean) as string[]

        if (ids.length === 0) {
          setPublishedScripts(base.map((s) => ({ ...s, metrics: null })))
          return
        }

        const { data: metrics, error: metricsError } = await (supabase as unknown as { from: (t: string) => any })
          .from('meta_video_metrics')
          .select(
            'video_id, created_time, permalink_url, title, caption, parsed_brand, parsed_model, parsed_year, inventory_vehicle_id, views, avg_time_watched_s, retention_rate, comments_count, shares_count, fetched_at'
          )
          .in('video_id', ids)

        if (metricsError) {
          setPublishedScripts(base.map((s) => ({ ...s, metrics: null })))
          return
        }

        const byId = new Map<string, MetaMetricsRow>()
        ;((metrics ?? []) as MetaMetricsRow[]).forEach((m) => byId.set(m.video_id, m))

        setPublishedScripts(base.map((s) => ({ ...s, metrics: s.facebook_post_id ? byId.get(s.facebook_post_id) ?? null : null })))
      } else {
        const { data, error } = await (supabase as unknown as { from: (t: string) => any })
          .from('informative_posts')
          .select(
            'id, type, status, scheduled_for, headline, caption_facebook, caption_instagram, image_url, source_url, source_title, source_snippet, instagram_permalink, facebook_permalink, created_at'
          )
          .order('scheduled_for', { ascending: false })
          .limit(50)

        if (error) {
          setError(error.message)
          setPosts([])
          return
        }
        setPosts((data ?? []) as InformativePostRow[])
      }
    }

    run()
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [supabase, tab])

  const videosEmpty = tab === 'videos' && !loading && publishedScripts.length === 0
  const postsEmpty = tab === 'posts' && !loading && posts.length === 0

  const header = useMemo(
    () =>
      tab === 'videos'
        ? { title: 'Videos de Vendedores', subtitle: 'Guiones publicados con métricas de Meta/Facebook.' }
        : { title: 'Posts Informativos / Educativos', subtitle: 'Publicaciones programadas o publicadas.' },
    [tab]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            Publicaciones en Redes
          </h1>
          <p className="text-sm text-gray-500 mt-2">{header.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('videos')}
            className={[
              'px-4 py-2 rounded-xl text-sm font-bold border transition-colors',
              tab === 'videos' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            Videos
          </button>
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={[
              'px-4 py-2 rounded-xl text-sm font-bold border transition-colors',
              tab === 'posts' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            Posts
          </button>
          {loading && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h2 className="text-base font-extrabold text-gray-900">{header.title}</h2>
        </div>

        <div className="p-5 space-y-5">
          {videosEmpty && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay videos publicados aún.
            </div>
          )}

          {postsEmpty && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay posts informativos todavía.
            </div>
          )}

          {tab === 'videos' &&
            publishedScripts.map((s) => (
              <div key={s.id} className="space-y-2">
                <ScriptCard script={s} />
                {s.metrics ? <MetricasRow metrics={s.metrics} /> : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                    Sin métricas encontradas para este post.
                  </div>
                )}
              </div>
            ))}

          {tab === 'posts' && posts.map((p) => <PublicacionCard key={p.id} post={p} />)}
        </div>
      </div>
    </div>
  )
}

