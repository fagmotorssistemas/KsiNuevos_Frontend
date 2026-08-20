'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Newspaper } from 'lucide-react'
import {
  getPostSortTime,
  getPostWeekdayEcuador,
} from '@/lib/marketing/informative-post-dates'
import { useAuth } from '@/hooks/useAuth'
import type { InformativePostRow } from '@/components/marketing/PublicacionCard'
import {
  PublicacionFeaturedHero,
  PublicacionFeedRow,
  PublicacionSplitSkeleton,
} from '@/components/marketing/PublicacionPostCard'
import { PublicacionPostModal } from '@/components/marketing/PublicacionPostModal'

type WeekdayTab = 'martes' | 'jueves'

const PAGE_SIZE = 80
const WEEKDAY_VALUE: Record<WeekdayTab, number> = { martes: 2, jueves: 4 }

function tabClass(active: boolean) {
  return `px-4 py-2 rounded-xl text-sm font-bold transition-all ${
    active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
  }`
}

export default function MarketingPublicacionesPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<InformativePostRow[]>([])
  const [selectedPost, setSelectedPost] = useState<InformativePostRow | null>(null)
  const [weekdayTab, setWeekdayTab] = useState<WeekdayTab>('martes')
  const [featuredId, setFeaturedId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(
    async (from: number) => {
      if (!supabase) return [] as InformativePostRow[]
      const { data, error: postsError } = await (supabase as unknown as { from: (t: string) => any })
        .from('informative_posts')
        .select(
          'id, type, status, published_at, scheduled_for, headline, caption_facebook, caption_instagram, image_url, image_urls, carousel_format, source_url, source_title, source_snippet, instagram_permalink, facebook_permalink, created_at, story_hash, topic_key'
        )
        .not('story_hash', 'is', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (postsError) throw new Error(postsError.message)
      return (data ?? []) as InformativePostRow[]
    },
    [supabase]
  )

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    void fetchPage(0)
      .then((rows) => {
        setPosts(rows)
        setHasMore(rows.length === PAGE_SIZE)
      })
      .catch((e) => {
        setError(String(e?.message ?? e))
        setPosts([])
        setHasMore(false)
      })
      .finally(() => setLoading(false))
  }, [supabase, fetchPage])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const rows = await fetchPage(posts.length)
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...rows.filter((p) => !seen.has(p.id))]
      })
      setHasMore(rows.length === PAGE_SIZE)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setLoadingMore(false)
    }
  }

  const visiblePosts = useMemo(() => {
    const weekday = WEEKDAY_VALUE[weekdayTab]
    return posts
      .filter((p) => getPostWeekdayEcuador(p) === weekday)
      .sort((a, b) => getPostSortTime(b) - getPostSortTime(a))
  }, [posts, weekdayTab])

  const featured = useMemo(() => {
    return visiblePosts.find((p) => p.id === featuredId) ?? visiblePosts[0] ?? null
  }, [visiblePosts, featuredId])

  const listPosts = useMemo(() => {
    if (!featured) return visiblePosts
    return visiblePosts.filter((p) => p.id !== featured.id)
  }, [visiblePosts, featured])

  useEffect(() => {
    if (!visiblePosts.length) {
      setFeaturedId(null)
      return
    }
    if (!featuredId || !visiblePosts.some((p) => p.id === featuredId)) {
      setFeaturedId(visiblePosts[0].id)
    }
  }, [visiblePosts, featuredId, weekdayTab])

  const postsEmpty = !loading && visiblePosts.length === 0

  return (
    <div className="flex h-[calc(100dvh-8.75rem)] min-h-[520px] flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
            Marketing
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Noticias</h1>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando
            </span>
          ) : null}
          <div className="inline-flex rounded-2xl bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setWeekdayTab('martes')}
              className={tabClass(weekdayTab === 'martes')}
            >
              Martes
            </button>
            <button
              type="button"
              onClick={() => setWeekdayTab('jueves')}
              className={tabClass(weekdayTab === 'jueves')}
            >
              Jueves
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? <PublicacionSplitSkeleton /> : null}

      {postsEmpty ? (
        <div className="flex flex-1 items-center justify-center rounded-[2rem] border border-dashed border-violet-200 bg-white px-6 py-16 text-center">
          <div>
            <Newspaper className="mx-auto h-10 w-10 text-violet-300" />
            <p className="mt-3 text-lg font-extrabold text-slate-900">
              No hay noticias de {weekdayTab}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasMore
                ? 'Carga más para ver fechas anteriores.'
                : 'Cuando se generen posts de este día, aparecerán aquí.'}
            </p>
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Cargar fechas anteriores
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && featured ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <PublicacionFeaturedHero post={featured} onOpen={() => setSelectedPost(featured)} />

          <aside className="flex min-h-0 flex-col rounded-[2rem] bg-slate-100/70 p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold text-slate-900">Más noticias</h2>
              <span className="text-xs font-semibold text-slate-400">{visiblePosts.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-hide">
              {listPosts.map((p) => (
                <PublicacionFeedRow
                  key={p.id}
                  post={p}
                  active={p.id === featured.id}
                  onSelect={() => setFeaturedId(p.id)}
                />
              ))}
              {listPosts.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-400">
                  No hay más posts de {weekdayTab}.
                </p>
              ) : null}
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold text-slate-500 hover:bg-white/80 hover:text-slate-800 disabled:opacity-60"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando
                    </span>
                  ) : (
                    'Cargar fechas anteriores'
                  )}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <PublicacionPostModal
        post={selectedPost}
        open={selectedPost != null}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  )
}
