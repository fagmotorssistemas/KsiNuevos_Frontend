'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Megaphone } from 'lucide-react'
import {
  formatPostDayHeader,
  getPostDayKeyEcuador,
  getPostSortTime,
  isPostPublished,
} from '@/lib/marketing/informative-post-dates'
import { useAuth } from '@/hooks/useAuth'
import { ScriptCard, type ScriptRow } from '@/components/marketing/ScriptCard'
import { VIDEO_SCRIPT_LIST_SELECT } from '@/lib/marketing/video-script-select'
import { MetricasRow, type MetaMetricsRow } from '@/components/marketing/MetricasRow'
import type { InformativePostRow } from '@/components/marketing/PublicacionCard'
import { PublicacionesTabs, type PublicacionesTab } from '@/components/marketing/PublicacionesTabs'
import { PublicacionPostCard } from '@/components/marketing/PublicacionPostCard'
import { PublicacionPostModal } from '@/components/marketing/PublicacionPostModal'

type PublishedScript = ScriptRow & { metrics?: MetaMetricsRow | null }

export default function MarketingPublicacionesPage() {
  const { supabase } = useAuth()
  const [tab, setTab] = useState<PublicacionesTab>('posts')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [publishedScripts, setPublishedScripts] = useState<PublishedScript[]>([])
  const [posts, setPosts] = useState<InformativePostRow[]>([])
  const [selectedPost, setSelectedPost] = useState<InformativePostRow | null>(null)

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    async function run() {
      if (tab === 'videos') {
        const { data: scripts, error: scriptsError } = await (supabase as unknown as { from: (t: string) => any })
          .from('video_scripts')
          .select(VIDEO_SCRIPT_LIST_SELECT)
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

        setPublishedScripts(
          base.map((s) => ({
            ...s,
            metrics: s.facebook_post_id ? byId.get(s.facebook_post_id) ?? null : null,
          }))
        )
      } else {
        const { data, error: postsError } = await (supabase as unknown as { from: (t: string) => any })
          .from('informative_posts')
          .select(
            'id, type, status, published_at, scheduled_for, headline, caption_facebook, caption_instagram, image_url, image_urls, carousel_format, source_url, source_title, source_snippet, instagram_permalink, facebook_permalink, created_at, story_hash, topic_key'
          )
          .not('story_hash', 'is', null)
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(80)

        if (postsError) {
          setError(postsError.message)
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

  const postsByDay = useMemo(() => {
    if (tab !== 'posts') return []
    const map = new Map<string, InformativePostRow[]>()
    for (const p of posts) {
      const key = getPostDayKeyEcuador(p)
      map.set(key, [...(map.get(key) ?? []), p])
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'sin-fecha') return 1
      if (b === 'sin-fecha') return -1
      return b.localeCompare(a)
    })
    return keys.map((k) => ({
      day: k,
      items: (map.get(k) ?? []).sort((a, b) => getPostSortTime(b) - getPostSortTime(a)),
      publishedCount: (map.get(k) ?? []).filter((p) => isPostPublished(p)).length,
      pendingCount: (map.get(k) ?? []).filter((p) => !isPostPublished(p)).length,
    }))
  }, [posts, tab])

  const postStats = useMemo(() => {
    const published = posts.filter((p) => isPostPublished(p)).length
    return { total: posts.length, published, pending: posts.length - published }
  }, [posts])

  const videosEmpty = tab === 'videos' && !loading && publishedScripts.length === 0
  const postsEmpty = tab === 'posts' && !loading && posts.length === 0

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
            Marketing / Redes
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </span>
            Publicaciones en Redes
          </h1>
        </div>
        {loading && (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 shrink-0">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </span>
        )}
      </header>

      <PublicacionesTabs tab={tab} onTabChange={setTab} />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      {tab === 'posts' && !loading && posts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500">Total</p>
            <p className="text-lg font-extrabold text-slate-900">{postStats.total}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/50 px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-green-700">Publicados</p>
            <p className="text-lg font-extrabold text-green-900">{postStats.published}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-amber-700">Pendientes</p>
            <p className="text-lg font-extrabold text-amber-900">{postStats.pending}</p>
          </div>
        </div>
      )}

      {tab === 'videos' && (
        <div className="space-y-4">
          {videosEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 text-center">
              No hay videos publicados aún.
            </div>
          )}
          {publishedScripts.map((s) => (
            <div key={s.id} className="space-y-2">
              <ScriptCard script={s} />
              {s.metrics ? (
                <MetricasRow metrics={s.metrics} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Sin métricas encontradas para este post.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'posts' && (
        <>
          {postsEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 text-center">
              No hay posts informativos todavía.
            </div>
          )}
          <div className="space-y-8">
            {postsByDay.map((g) => {
              const human = formatPostDayHeader(g.day)
              const countLabel =
                g.pendingCount > 0 && g.publishedCount > 0
                  ? `${g.publishedCount} publicados · ${g.pendingCount} pendientes`
                  : g.pendingCount > 0
                    ? `${g.pendingCount} pendiente${g.pendingCount === 1 ? '' : 's'}`
                    : `${g.items.length} publicado${g.items.length === 1 ? '' : 's'}`
              return (
                <section key={g.day} className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <h2 className="text-base font-extrabold text-slate-900 capitalize">{human}</h2>
                    <span className="text-xs font-semibold text-slate-500 shrink-0">{countLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {g.items.map((p) => (
                      <PublicacionPostCard
                        key={p.id}
                        post={p}
                        onOpen={() => setSelectedPost(p)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      <PublicacionPostModal
        post={selectedPost}
        open={selectedPost != null}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  )
}
