'use client'

import Link from 'next/link'
import { ExternalLink, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type InformativePostRow = {
  id: string
  type: string | null
  status: string | null
  scheduled_for: string | null
  headline: string | null
  caption_facebook: string | null
  caption_instagram: string | null
  image_url: string | null
  image_urls?: unknown | null
  carousel_format?: string | null
  source_url: string | null
  source_title: string | null
  source_snippet: string | null
  instagram_permalink: string | null
  facebook_permalink: string | null
  created_at: string | null
  story_hash?: string | null
  topic_key?: string | null
}

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
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>{v || '—'}</span>
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
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>{v || '—'}</span>
}

function extractFirstUrl(input: unknown): string | null {
  if (!input) return null
  if (Array.isArray(input)) {
    const first = input[0]
    return typeof first === 'string' ? first : null
  }
  if (typeof input === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyObj = input as any
    const urls = anyObj?.urls
    if (Array.isArray(urls)) {
      const first = urls[0]
      return typeof first === 'string' ? first : null
    }
  }
  return null
}

function countUrls(input: unknown): number {
  if (!input) return 0
  if (Array.isArray(input)) return input.filter((x) => typeof x === 'string').length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyObj = input as any
  if (Array.isArray(anyObj?.urls)) return anyObj.urls.filter((x: unknown) => typeof x === 'string').length
  return 0
}

export function PublicacionCard({ post }: { post: InformativePostRow }) {
  const scheduled =
    post.scheduled_for && !Number.isNaN(new Date(post.scheduled_for).getTime())
      ? format(new Date(post.scheduled_for), "dd/MM/yyyy '•' HH:mm", { locale: es })
      : null

  const firstFromJson = extractFirstUrl(post.image_urls)
  const thumb = post.image_url || firstFromJson
  const imagesCount = countUrls(post.image_urls)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={post.headline ?? 'Post'} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-gray-900">{post.headline ?? '—'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {typeBadge(post.type)}
              {statusBadge(post.status)}
              {imagesCount > 1 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
                  Carrusel: {imagesCount}
                </span>
              )}
              {scheduled && (
                <span className="text-xs font-semibold text-gray-500">
                  Programado: <span className="text-gray-700">{scheduled}</span>
                </span>
              )}
            </div>

            {(post.source_title || post.source_snippet) && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                {post.source_title && <p className="text-xs font-bold text-gray-800">{post.source_title}</p>}
                {post.source_snippet && <p className="mt-1 text-xs text-gray-600 line-clamp-3">{post.source_snippet}</p>}
                {post.source_url && (
                  <Link href={post.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:text-violet-800">
                    Fuente <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {post.facebook_permalink && (
                <Link href={post.facebook_permalink} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 hover:text-blue-800">
                  Facebook <ExternalLink className="inline h-4 w-4 ml-1" />
                </Link>
              )}
              {post.instagram_permalink && (
                <Link href={post.instagram_permalink} target="_blank" rel="noreferrer" className="text-sm font-bold text-pink-700 hover:text-pink-800">
                  Instagram <ExternalLink className="inline h-4 w-4 ml-1" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

