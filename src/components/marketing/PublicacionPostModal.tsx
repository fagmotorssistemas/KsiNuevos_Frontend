'use client'

import Link from 'next/link'
import { ExternalLink, Facebook, Instagram, Link2, Newspaper } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import {
  formatPostInstantEcuador,
  isPostPublished,
} from '@/lib/marketing/informative-post-dates'
import { extractPostImageUrls } from '@/lib/marketing/publicacion-post-media'
import type { InformativePostRow } from '@/components/marketing/PublicacionCard'

function typeBadge(t: string | null) {
  const v = (t ?? '').toLowerCase()
  const cls =
    v === 'news'
      ? 'bg-blue-100 text-blue-800'
      : v === 'educational'
        ? 'bg-cyan-100 text-cyan-800'
        : v === 'engagement'
          ? 'bg-violet-100 text-violet-800'
          : v === 'top5'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
      {v || '—'}
    </span>
  )
}

function statusBadge(s: string | null) {
  const v = (s ?? '').toLowerCase()
  const cls =
    v === 'published'
      ? 'bg-green-100 text-green-800'
      : v === 'failed'
        ? 'bg-red-100 text-red-800'
        : v === 'publishing'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
      {v || '—'}
    </span>
  )
}

type Props = {
  post: InformativePostRow | null
  open: boolean
  onClose: () => void
}

export function PublicacionPostModal({ post, open, onClose }: Props) {
  if (!post) return null

  const published = isPostPublished(post)
  const fechaLabel = published
    ? formatPostInstantEcuador(post.published_at || post.scheduled_for)
    : formatPostInstantEcuador(post.created_at)
  const allImages = [
    ...(post.image_url ? [post.image_url] : []),
    ...extractPostImageUrls(post.image_urls),
  ].filter((u, i, a) => a.indexOf(u) === i)

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={post.headline ?? 'Publicación'}
      subtitle={
        published
          ? fechaLabel
            ? `Publicado en Meta · ${fechaLabel}`
            : 'Publicado en Meta'
          : fechaLabel
            ? `Pendiente · generado ${fechaLabel}`
            : 'Pendiente de publicación'
      }
      icon={<Newspaper className="h-5 w-5" />}
      size="2xl"
      className="max-w-5xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Arte / creativo</p>
          {allImages.length > 0 ? (
            <div
              className={
                allImages.length > 1
                  ? 'grid grid-cols-2 gap-2'
                  : 'rounded-2xl overflow-hidden border border-slate-200 bg-slate-50'
              }
            >
              {allImages.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square hover:opacity-95 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 aspect-video flex items-center justify-center text-sm text-slate-500 font-medium">
              Sin imagen generada
            </div>
          )}
          {post.carousel_format && (
            <p className="text-xs text-slate-500 font-semibold">Formato: {post.carousel_format}</p>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-2">
            {typeBadge(post.type)}
            {statusBadge(post.status)}
            {post.topic_key && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {post.topic_key}
              </span>
            )}
          </div>

          {post.caption_facebook && (
            <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-extrabold text-blue-800 mb-2 flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {post.caption_facebook}
              </p>
            </section>
          )}

          {post.caption_instagram && (
            <section className="rounded-xl border border-pink-100 bg-pink-50/50 p-4">
              <p className="text-xs font-extrabold text-pink-800 mb-2 flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {post.caption_instagram}
              </p>
            </section>
          )}

          {(post.source_title || post.source_snippet || post.source_url) && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Fuente
              </p>
              {post.source_title && (
                <p className="text-sm font-bold text-slate-900">{post.source_title}</p>
              )}
              {post.source_snippet && (
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{post.source_snippet}</p>
              )}
              {post.source_url && (
                <Link
                  href={post.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-800"
                >
                  Abrir fuente <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {post.facebook_permalink && (
              <Link
                href={post.facebook_permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Ver en Facebook <ExternalLink className="h-4 w-4" />
              </Link>
            )}
            {post.instagram_permalink && (
              <Link
                href={post.instagram_permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-95 transition-opacity"
              >
                Ver en Instagram <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </PlannerDialog>
  )
}
