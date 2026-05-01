'use client'

import Link from 'next/link'
import { Eye, MessageCircle, Share2, Timer } from 'lucide-react'
import { RetentionBadge } from './badges'

export type MetaMetricsRow = {
  video_id: string
  created_time: string | null
  permalink_url: string | null
  title: string | null
  caption: string | null
  inventory_vehicle_id: string | null
  views: number | null
  avg_time_watched_s: number | null
  retention_rate: number | null
  comments_count: number | null
  shares_count: number | null
  fetched_at: string | null
}

export function computePerformanceScore(m: MetaMetricsRow) {
  const retention = m.retention_rate ?? 0
  const comments = m.comments_count ?? 0
  const shares = m.shares_count ?? 0
  return retention * 60 + Math.min(comments * 2, 20) + Math.min(shares * 3, 10)
}

export function MetricasRow({
  metrics,
}: {
  metrics: MetaMetricsRow
}) {
  const views = metrics.views ?? 0
  const avg = metrics.avg_time_watched_s ?? null
  const comments = metrics.comments_count ?? 0
  const shares = metrics.shares_count ?? 0
  const score = Math.round(computePerformanceScore(metrics))

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-700">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-4 w-4 text-gray-500" /> {views.toLocaleString('es-EC')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer className="h-4 w-4 text-gray-500" /> {avg === null ? '—' : `${avg.toFixed(1)}s`}
        </span>
        <span className="inline-flex items-center gap-1">
          <RetentionBadge retentionRate={metrics.retention_rate} />
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-4 w-4 text-gray-500" /> {comments}
        </span>
        <span className="inline-flex items-center gap-1">
          <Share2 className="h-4 w-4 text-gray-500" /> {shares}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
          Score: {score}
        </span>

        {metrics.permalink_url && (
          <Link
            href={metrics.permalink_url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-violet-700 hover:text-violet-800"
          >
            Abrir post
          </Link>
        )}
      </div>
    </div>
  )
}

