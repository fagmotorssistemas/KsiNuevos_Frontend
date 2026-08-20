'use client'

import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Heart,
  Layers,
  Newspaper,
  Sparkles,
} from 'lucide-react'
import {
  formatPostInstantEcuador,
  isPostPublished,
} from '@/lib/marketing/informative-post-dates'
import { getPostImageCount, getPostThumb } from '@/lib/marketing/publicacion-post-media'
import type { InformativePostRow } from '@/components/marketing/PublicacionCard'

const TYPE_META: Record<string, { label: string; className: string }> = {
  news: { label: 'Noticia', className: 'bg-sky-500/95 text-white' },
  educational: { label: 'Educativo', className: 'bg-cyan-600/95 text-white' },
  engagement: { label: 'Interacción', className: 'bg-violet-600/95 text-white' },
  top5: { label: 'Top 5', className: 'bg-orange-500/95 text-white' },
}

const TYPE_ICON = {
  news: Newspaper,
  educational: BookOpen,
  engagement: Heart,
  top5: Sparkles,
} as const

function excerpt(post: InformativePostRow): string | null {
  const text = (post.caption_facebook || post.caption_instagram || post.source_snippet || '').trim()
  if (!text) return null
  return text.replace(/\s+/g, ' ')
}

function typeMetaOf(post: InformativePostRow) {
  return TYPE_META[(post.type ?? '').toLowerCase()]
}

export function PublicacionFeaturedHero({
  post,
  onOpen,
}: {
  post: InformativePostRow
  onOpen: () => void
}) {
  const published = isPostPublished(post)
  const timeLabel = published
    ? formatPostInstantEcuador(post.published_at || post.scheduled_for, "EEEE d MMM · HH:mm")
    : formatPostInstantEcuador(post.created_at, "EEEE d MMM · HH:mm")
  const thumb = getPostThumb(post.image_url, post.image_urls)
  const imagesCount = getPostImageCount(post.image_url, post.image_urls)
  const typeMeta = typeMetaOf(post)
  const summary = excerpt(post)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full min-h-[420px] w-full overflow-hidden rounded-[2rem] text-left shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)]"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-violet-950 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {typeMeta ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${typeMeta.className}`}
              >
                {typeMeta.label}
              </span>
            ) : null}
            {imagesCount > 1 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                <Layers className="h-3.5 w-3.5" />
                {imagesCount}
              </span>
            ) : null}
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors group-hover:bg-white/25">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>

        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {post.headline ?? 'Sin título'}
          </h2>
          {summary ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 line-clamp-3">
              {summary}
            </p>
          ) : null}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
            <Calendar className="h-4 w-4 text-white/80" />
            <span className="capitalize">{timeLabel ?? 'Sin fecha'}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

export function PublicacionFeedRow({
  post,
  active,
  onSelect,
}: {
  post: InformativePostRow
  active?: boolean
  onSelect: () => void
}) {
  const published = isPostPublished(post)
  const timeLabel = published
    ? formatPostInstantEcuador(post.published_at || post.scheduled_for, 'd MMM')
    : formatPostInstantEcuador(post.created_at, 'd MMM')
  const thumb = getPostThumb(post.image_url, post.image_urls)
  const typeKey = (post.type ?? '').toLowerCase()
  const typeMeta = TYPE_META[typeKey]
  const Icon = TYPE_ICON[typeKey as keyof typeof TYPE_ICON] ?? Newspaper

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
        active ? 'bg-white shadow-sm ring-1 ring-violet-200' : 'hover:bg-white/70'
      }`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800">
            <Newspaper className="h-5 w-5 text-white/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{post.headline ?? 'Sin título'}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {typeMeta?.label ?? 'Post'}
          {timeLabel ? ` · ${timeLabel}` : ''}
        </p>
      </div>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </button>
  )
}

export function PublicacionSplitSkeleton() {
  return (
    <div className="grid h-full min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
      <div className="min-h-[420px] animate-pulse rounded-[2rem] bg-slate-200" />
      <div className="space-y-2 rounded-[2rem] bg-slate-100/80 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-16 w-16 animate-pulse rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
