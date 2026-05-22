'use client'

import { ChevronRight, Image as ImageIcon } from 'lucide-react'
import {
  formatPostInstantEcuador,
  isPostPublished,
} from '@/lib/marketing/informative-post-dates'
import { getPostImageCount, getPostThumb } from '@/lib/marketing/publicacion-post-media'
import type { InformativePostRow } from '@/components/marketing/PublicacionCard'

function typeBadge(t: string | null) {
  const v = (t ?? '').toLowerCase()
  const cls =
    v === 'news'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : v === 'educational'
        ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
        : v === 'engagement'
          ? 'bg-violet-100 text-violet-800 border-violet-200'
          : v === 'top5'
            ? 'bg-orange-100 text-orange-800 border-orange-200'
            : 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {v || '—'}
    </span>
  )
}

function statusBadge(s: string | null) {
  const v = (s ?? '').toLowerCase()
  const cls =
    v === 'published'
      ? 'bg-green-100 text-green-800 border-green-200'
      : v === 'failed'
        ? 'bg-red-100 text-red-800 border-red-200'
        : v === 'publishing'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {v || '—'}
    </span>
  )
}

export function PublicacionPostCard({
  post,
  onOpen,
}: {
  post: InformativePostRow
  onOpen: () => void
}) {
  const published = isPostPublished(post)
  const timeLabel = published
    ? formatPostInstantEcuador(post.published_at || post.scheduled_for, 'dd/MM · HH:mm')
    : formatPostInstantEcuador(post.created_at, 'dd/MM · HH:mm')
  const thumb = getPostThumb(post.image_url, post.image_urls)
  const imagesCount = getPostImageCount(post.image_url, post.image_urls)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-violet-200 hover:ring-2 hover:ring-violet-100 transition-all overflow-hidden"
    >
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {imagesCount > 1 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold">
            {imagesCount} imgs
          </span>
        )}
        {!thumb && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-bold">
            Sin arte
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-violet-900 transition-colors">
          {post.headline ?? 'Sin título'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {typeBadge(post.type)}
          {statusBadge(post.status)}
        </div>
        {timeLabel && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500">
            {published ? 'Publicado' : 'Generado'} · {timeLabel}
          </p>
        )}
        <p className="mt-2 text-xs font-bold text-violet-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Ver publicación <ChevronRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </button>
  )
}
